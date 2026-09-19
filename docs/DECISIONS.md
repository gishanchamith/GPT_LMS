# Design decisions and trade-offs

## Authentication

**JWT in an httpOnly cookie.** JavaScript cannot read the token, so an XSS bug cannot steal it.
`secure` in production, `sameSite: 'lax'` (possible because the Vercel rewrite makes the API
same-origin). The token is never put in a response body, so page scripts can't read it at all;
Swagger, Postman and browsers keep the cookie automatically, and scripts can still send
`Authorization: Bearer`. The cookie's lifetime is taken from the token's own expiry, so the two
always match whatever `JWT_EXPIRES_IN` is set to.

**Changing a password** requires the current one, bumps `tokenVersion` (ending every other
session) and issues a fresh cookie to the device that made the change.

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
`proxy_read_timeout`), and prompts are capped at 500 characters.

**Open to guests, with a tighter budget.** Visitors can try the advisor without an account, which
makes the headline feature visible straight away. Every AI request costs money, so limits are per
15 minutes: 10 per signed-in student (counted per user) and 5 per guest (counted per IP). Signed-in
staff are refused, and a suspended account is refused rather than treated as a guest.

**Personalised by onboarding.** New students answer three questions (fields, level, goal). The
answers drive instant, rule-based suggestions (their fields become the category filter, their
level ranks first, then the next level up), which need no AI call at all. They are also added to
the advisor's system prompt, so vague prompts like "what should I learn next?" still get a
relevant answer.

**Model.** The brief mentions GPT-3, which OpenAI has retired. The API uses a current small chat
model (`gpt-5.4-mini` by default, configurable with `OPENAI_MODEL`). This was a deliberate
substitution.

## Operational safety

- **Client IPs behind two proxies.** In production a request passes through Vercel's rewrite and
  then Nginx. `TRUST_PROXY=2` makes Express take the visitor's IP from `X-Forwarded-For`, so rate
  limits and the audit log are per visitor, not per Vercel server. `GET /api/health` echoes the IP
  the API sees, to check the setting after deploying. Trade-off: someone calling the API domain
  directly could forge that header to dodge the IP-based limits; restricting Nginx to Vercel's
  traffic would close that.
- **The seed script refuses to wipe a remote database** (anything that isn't `localhost`) unless
  `--yes` is passed, because a `.env` pointing at Atlas during development is an easy mistake.
- **Changing an instructor's role is refused while they still own courses**, since nobody else
  could then manage those courses.

## Categories are data, not code

Admins add, rename and hide categories from the dashboard, so the catalog can grow without a
deploy. A new database starts with six defaults. Courses store the category **name** (not an id),
which keeps course queries and filters simple; the cost is that a rename must update every course
and every student's onboarding answers, which `updateCategory` does in the same request.
Categories are never deleted, only hidden, so no course can end up with a category that doesn't
exist. Names are unique case-insensitively (`key` = lowercased name).

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

105 Vitest + Supertest API tests against an in-memory MongoDB **replica set** (needed for
transactions), one isolated database per test file, plus 10 web tests for the route guard and the
API client. The tests focus on the rules that would be embarrassing to get wrong: the
registration role whitelist, cross-instructor edits, admin vs admin, suspension revocation,
duplicate and concurrent enrollment, the single super admin, and AI id validation. OpenAI is
mocked, so the suite is free and deterministic. GitHub Actions runs formatting, lint, type-check,
both test suites and both builds on every push and pull request.

## Known limitations / future work

- **Refresh tokens**: sessions last 24 h (`JWT_EXPIRES_IN`), then the user signs in again.
- **Email verification and forgotten-password reset**: need an email provider. Signed-in users can
  change their password.
- **Rate limit store** is in memory, which is fine for one PM2 instance. Use Redis when scaling out.
- **Search** is a case-insensitive substring match on title, description and category. It scans
  the collection, which is fine for a catalog of hundreds of courses; Atlas Search would add
  relevance ranking and typo tolerance at scale.
- **Uploads, payments and progress tracking per lesson** are out of scope.
- **Deployment** is manual (`deploy/deploy-api.sh` and Vercel). CI checks every push but doesn't
  deploy.
