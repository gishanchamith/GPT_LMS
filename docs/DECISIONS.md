# Design decisions and trade-offs

## Authentication

**JWT in an httpOnly cookie.** JavaScript cannot read the token, so an XSS bug cannot steal it.
`secure` in production, `sameSite: 'lax'` (possible because the Vercel rewrite makes the API
same-origin). The login response also returns the token so Swagger and Postman can use a Bearer
header.

**Instant revocation with `tokenVersion`.** A JWT is a snapshot taken at login. The token carries
`tv: user.tokenVersion`, and `authenticate` reloads the user on every request and rejects the token
if the versions differ, the user is suspended, or the user no longer exists. Suspension and role
changes increment `tokenVersion`, so they take effect on the user's very next request instead of
when the token expires. The API also clears the dead cookie, so the frontend guards stop treating
it as a session. Cost: one indexed `findById` per authenticated request, which is acceptable at
this scale and could be cached later.

**Super admin by script, not endpoint.** `npm run create-superadmin` reads credentials from
environment variables and is idempotent. An endpoint that can mint super admins would be a
permanent backdoor. A partial unique index enforces "exactly one" at the database level.

**Registration can't escalate.** The register schema only accepts `student | instructor`
(`z.enum(SELF_REGISTER_ROLES)`), so `role: "admin"` is a 400 validation error. Instructors start
`pending`; they can sign in but `requireActive` blocks course creation until an admin approves them.

## Authorization: two independent checks

1. **Permission**: `authorize('course:create')` checks the role against the permission map in
   `@lp/shared`. Changing who may do something is a one-line edit, and the frontend uses the same
   `can()` to build its menus.
2. **Ownership / hierarchy**: permissions alone aren't enough.
   - Courses: `assertCanModifyCourse` allows `course:update:any` (admins) or `course:update:own`
     **and** being the course's instructor. "Is an instructor" is not "is this course's instructor".
   - Users: `assertCanManage` requires `ROLE_LEVEL[actor] > ROLE_LEVEL[target]` (strictly) and
     forbids acting on yourself. This stops an admin from suspending another admin or the super
     admin, and stops the super admin from locking themselves out.

Unpublished courses return **404, not 403**, to people who can't see them, so their existence isn't
leaked.

## Grounded AI recommendations

Asked directly, a language model invents plausible course titles that don't exist. Instead:

1. **Retrieve** the published catalog (small projection, ≤60 courses, descriptions truncated to
   160 characters to save tokens).
2. **Constrain**: the system prompt lists the catalog, requires JSON only
   (`response_format: json_object`), and treats the student's text as goals, not instructions.
3. **Parse defensively**: strip markdown fences; an unparseable reply becomes a 502 with a retry
   message, not a crash.
4. **Re-validate** every returned id against the catalog map. Invented, duplicate or unpublished
   ids are dropped, so the model cannot smuggle in fake courses (covered by tests).

Also: the key is server-side only, requests time out at 20 s (below Nginx's 30 s
`proxy_read_timeout`), there is a per-user rate limit of 10 requests per 15 minutes, and prompts
are capped at 500 characters.

**Model.** The brief mentions GPT-3, which OpenAI has retired. The API uses a current small chat
model (`gpt-5.4-mini` by default, configurable with `OPENAI_MODEL`). This was a deliberate
substitution.

## Data

See [DATABASE.md](DATABASE.md): Enrollment as a separate collection, compound unique index,
denormalized `enrollmentCount`, and transactional cascade on delete.

## Monorepo

npm workspaces with `apps/api`, `apps/web` and `packages/shared`, all in strict TypeScript. The
shared package is the reason: roles, permissions and zod schemas are written once, and so are the
types inferred from them (`RegisterInput`, `Role`, `Permission`, …). Client-side and server-side
validation, and the code typed against them, cannot drift apart. The package ships TypeScript
source: Next transpiles it, and esbuild bundles it into the API build. Turborepo was left out
because it adds little at three packages.

## Testing strategy

73 Vitest + Supertest tests against an in-memory MongoDB **replica set** (needed for transactions),
one isolated database per test file. They focus on the rules that would be embarrassing to get
wrong: the registration role whitelist, cross-instructor edits, admin vs admin, suspension
revocation, duplicate and concurrent enrollment, the single super admin, and AI id validation.
OpenAI is mocked, so the suite is free and deterministic.

## Known limitations / future work

- **Refresh tokens**: sessions last 24 h, then the user signs in again.
- **Email verification and password reset**: not implemented.
- **Rate limit store** is in memory, which is fine for one PM2 instance. Use Redis when scaling out.
- **Search** uses MongoDB `$text`, which matches whole words (stemmed), not prefixes. Atlas Search
  would add autocomplete.
- **Uploads, payments and progress tracking per lesson** are out of scope.
- **CI/CD**: tests, lint and build run locally. A GitHub Actions pipeline would run them on every
  PR and deploy on merge.
