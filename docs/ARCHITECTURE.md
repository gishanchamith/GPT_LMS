# Architecture

## System overview

```mermaid
flowchart LR
    B[Browser] -- "HTTPS<br/>learnhub.mrt.lk" --> N["Nginx on EC2 t3.micro<br/>TLS via Let's Encrypt"]
    N -- "/api/* → 127.0.0.1:5000" --> E["Express 5 API<br/>PM2 (apps/api)"]
    N -- "everything else → 127.0.0.1:3000" --> W["Next.js 16<br/>PM2 (apps/web)"]
    E -- "Mongoose" --> M[("MongoDB Atlas")]
    E -- "chat completions<br/>(server-side key)" --> O[OpenAI]
    S["@lp/shared<br/>roles · permissions · zod schemas"] -. imported by .-> W
    S -. imported by .-> E
```

**One origin for pages and API.** The browser loads pages and calls `/api/*` on the same
hostname, and Nginx splits the traffic on one EC2 instance (DNS is on Cloudflare, and the
certificate comes from Let's Encrypt). The auth cookie is therefore first-party, `sameSite: 'lax'`
works, and there is no CORS preflight on every request. Nginx is the only proxy in front of the
API, so it runs with `TRUST_PROXY=1` and `req.ip` is the visitor.

The same code also supports a split setup ([DEPLOYMENT.md §6](DEPLOYMENT.md)): Next.js on Vercel
with `next.config.ts` rewriting `/api/*` to the EC2 API. The browser still sees a single origin
there, and the API uses `TRUST_PROXY=2` because each request passes through two proxies.

## Request lifecycle (protected write)

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as proxy.ts (Next)
    participant A as Express
    participant D as MongoDB
    B->>P: GET /instructor/courses (cookie)
    P->>P: decode JWT payload, check role → allow / redirect
    B->>A: PUT /api/courses/:id (cookie, via rewrite)
    A->>A: validate(idParamSchema) → 400 if malformed
    A->>D: authenticate: load user, check status + tokenVersion
    D-->>A: user
    A->>D: loadCourse → 404 if missing
    A->>A: validate(updateCourseSchema)
    A->>A: assertCanModifyCourse: permission "any" OR (permission "own" AND owner) → 403
    A->>D: category exists and is visible? → 400
    A->>D: save (+ audit entry if an admin edited someone else's course)
    A-->>B: { success: true, data }
```

`proxy.ts` and `RoleGate` only improve UX (no flash of forbidden pages). They read the JWT payload
without verifying it. **Every rule is enforced by the API**, which re-reads the user from the
database on every request. The proxy deliberately leaves `/login` and `/register` alone: those
pages redirect signed-in users themselves, after the API has confirmed the session, so a stale
cookie can never lock anyone out of the login page.

## AI recommendation flow

```mermaid
sequenceDiagram
    participant B as Browser (guest or student)
    participant A as Express
    participant D as MongoDB
    participant O as OpenAI
    B->>A: POST /api/recommendations { prompt }
    A->>A: optionalAuth · students or guests only · rate limit (per user / per IP)
    A->>D: published catalog (id, title, category, level, short description)
    A->>O: system prompt = catalog (+ student's onboarding answers) · user = prompt · JSON mode
    O-->>A: { recommendations: [{ courseId, reason }], summary }
    A->>A: drop ids not in the catalog, duplicates; cap at 5
    A-->>B: { summary, recommendations: [{ course, reason }] }
```

Provider failures become a 502 with a retry message; a missing key is a 503. The
`openai.client.ts` module is the only place that talks to OpenAI, and the tests replace it with a
mock, so no test ever spends a request.

## Backend layout (`apps/api/src`)

Strict TypeScript. Development runs through `tsx watch`; production is a single esbuild bundle
(`dist/server.js`) with npm dependencies left external. `npm run typecheck` runs `tsc`.

```
app.ts              createApp(): proxy trust, swagger, helmet, cors, 1 MB JSON limit, cookies,
                    /api/health, routes, error handler
server.ts           env check → connect DB → default categories → listen; graceful shutdown
routes/             URL → middleware chain → controller (reads like the permission matrix)
middleware/         authenticate, optionalAuth, authorize(permission), allowGuestsOr(permission),
                    requireActive, validate(schema), loadCourse, rateLimit, errorHandler
controllers/        HTTP only: read req, call a service, send { success, data, meta }
services/           business rules:
  course            ownership checks, search, cascade delete
  enrollment        enroll (duplicate-safe), complete, leave
  category          defaults, add/rename/hide, "is this category usable?"
  preferences       onboarding answers and rule-based suggestions
  recommendation    grounded AI (+ ai/openai.client.ts)
  admin, superadmin user management, stats, course moderation, admins, roles
  rbac, audit       hierarchy rule (assertCanManage) and audit log
  auth, bootstrap   register/login/password change, JWT; single super admin
models/             User, Course, Enrollment, Category, AuditLog (schemas + indexes)
docs/openapi.ts     OpenAPI 3 spec served at /api/docs
types/express.d.ts  what middleware attaches to req (user, course, validated)
utils/              request.ts (currentUser, validated), cookies, respond, database (isLocal…)
scripts/            seed (--small, refuses remote DBs without --yes), createSuperAdmin,
                    checkAi (one request), localDb, exportOpenapi
```

Errors are thrown as `new ApiError(status, message)`; Express 5 forwards rejected promises to the
central `errorHandler`, which also maps Mongoose `CastError`, duplicate keys (`11000` → 409) and
malformed or oversized JSON to proper status codes.

## Frontend layout (`apps/web/src`)

```
proxy.ts            role-based redirects before render for /admin, /instructor, /student, /account
lib/api.ts          the only fetch wrapper (generic api<Course>(…)): same-origin, credentials,
                    error normalization; announces "session ended" when the API revokes a session
context/            AuthContext (user, login, logout, updateUser, can()), Toast, Confirm dialog
hooks/              useApiData (loading/error/reload), useForm (shared zod schemas),
                    useCategories (visible categories), useRedirectIfSignedIn (login/register)
components/         ui primitives, States (loading/empty/error), CourseCard, CourseForm,
                    Suggestions (For you, filter shortcuts), HomeActions, RoleGate, Header,
                    manage/ (course edit + students views shared by instructors and admins)
app/
  /, /courses, /courses/[id], /advisor                      public (the advisor works for guests)
  /login, /register, /account                               auth and account
  /student/my-courses, /student/onboarding                  students
  /instructor/courses (+ new, [id]/edit, [id]/students)     instructors
  /admin (+ users, instructors, courses, courses/[id]/…,    admins; admins and audit-logs are
          categories, admins, audit-logs)                   super admin only
```

## The shared package (`packages/shared`)

One source of truth imported by both apps:

| Export                                       | Used by the API for                | Used by the web app for              |
| -------------------------------------------- | ---------------------------------- | ------------------------------------ |
| `ROLES`, `ROLE_LEVEL`, `outranks()`          | hierarchy guard                    | hiding actions on higher roles       |
| `PERMISSIONS`, `can()`                       | `authorize(permission)` middleware | building menus                       |
| zod schemas                                  | `validate(schema)` middleware      | form validation with identical rules |
| `z.infer` types (`RegisterInput`, `Role`, …) | typed service signatures           | typed form values and API calls      |
| `DEFAULT_COURSE_CATEGORIES`                  | categories for a fresh database    | —                                    |
| `LEARNING_GOAL_LABELS`, `COURSE_LEVELS`      | AI prompt context, validation      | onboarding and filter options        |
| `ROLE_HOME`                                  | —                                  | post-login redirect                  |

## Tests and CI

- **API:** 105 Vitest + Supertest tests against an in-memory MongoDB replica set (one database per
  test file). OpenAI is mocked.
- **Web:** 10 tests for the route guard (`proxy.ts`) and the API client.
- **CI:** `.github/workflows/ci.yml` runs formatting, lint, type-check, both test suites and both
  builds on every push and pull request.
