# TopSmilesNova project status

_Last updated: 2026-09-29. Tasks 1–3 are done (foundation, database, admin sign-in). Hosting is Vercel, Neon, and Vercel Blob. Nothing is deployed._

## Repositories

| Repository             | What                                                      | Package manager |
| ---------------------- | --------------------------------------------------------- | --------------- |
| `smile` (this one)     | TanStack Start frontend, mock API, docs                   | Bun             |
| `../topsmilesnova-api` | NestJS API, Prisma schema, local PostgreSQL and MinIO, CI | npm             |

## Done

### Frontend audit and API seam

- Audit: see `PROJECT_AUDIT.md`.
- Tooling:
  - Bun install from the lockfile, Prettier, stricter unused-code checks, a `typecheck` script.
  - Lint passes (0 errors) and the build passes.
- Typed API layer in `src/lib/api/`:
  - Contracts, the `TopSmilesApi` interface, a REST client and a stateful mock.
  - `VITE_API_BASE_URL` selects between them and stays empty for now.
- All screens go through `api`, so admin changes reach the patient flow. The journey bugs listed in the audit are fixed.
- 25 end-to-end checks pass in headless Chrome in mock mode.
- Site-builder (Lovable) tooling was removed: plain `vite.config.ts`, no vendor packages or files.

### Backend foundation (plan task 1), in `../topsmilesnova-api`

- **Platform:** NestJS 11 on Node 24 with strict TypeScript and an npm lockfile.
- **Configuration:** validated at startup. Invalid or missing variables stop the API with a list of named problems; values are never printed.
- **HTTP setup:**
  - `/api` prefix, Helmet, and CORS limited to `CORS_ORIGINS` (`http://localhost:8080` and `http://localhost:8081` locally).
  - Validation pipe that rejects unknown fields.
  - Shared error body: `statusCode`, `error`, `message`, optional `details`, and `requestId`.
  - Request IDs, and pino logs without headers, bodies, query strings or credentials.
  - OpenAPI at `/api/docs`.
- **Health:**
  - `GET /api/health` returns 200.
  - `GET /api/health/ready` checks PostgreSQL and the private bucket and returns 503 with a generic reason when either is down or times out.
- **Local infrastructure** (Docker Compose, project `topsmilesnova`):
  - PostgreSQL 17 on `127.0.0.1:54329`.
  - MinIO on `127.0.0.1:9100` (console on `9101`).
  - Named volumes, health checks, and a one-shot service that creates the private `tsn-private-dev` bucket.
  - Data survives `restart` and `down`/`up` (verified).
- **Tests and CI:**
  - 25 unit/HTTP tests: health, readiness failure and timeout, env validation, allowed and blocked CORS origins, errors, Helmet, docs.
  - 3 integration tests against real PostgreSQL and MinIO.
  - The GitHub Actions workflow runs install from the lockfile, lint, format check, type-check, tests, build, and an integration job with service containers.
- **Frontend connectivity:**
  - A development-only page at `/dev/api-health` calls `/api/health` and `/api/health/ready` from the browser. It returns 404 in production builds and isn't linked from any screen.
  - Verified from `http://localhost:8081` with no CORS or console errors. A second API instance that didn't list that origin was blocked by the browser, as expected.
- **Frontend fixes along the way:**
  - `http.ts` no longer throws a JSON parse error on non-JSON error pages.
  - `vite preview` works again: nitro now loads for preview too.
- Production build target is the nitro `vercel` preset (`vite.config.ts`). The app is not deployed.

### Database schema (plan task 2), in `../topsmilesnova-api`

- Prisma 7, committed migrations, and a development seed. The model is `docs/DATA_MODEL.md` in the API repo.
- Booking and payment status values match `src/lib/api/contracts.ts`. Proof upload does not verify a payment.
- Bookings keep the service, price, currency, form version, and payment-method version they were submitted with. Later edits insert a new version or a new payment attempt.
- Money is integer minor units. Appointments store a UTC instant and the clinic time zone. Files store a private object key and metadata, not image bytes.
- The seed reproduces `TSN-24091`, `TSN-24088`, and `TSN-24076` and can be run twice without duplicating rows. It refuses production and non-local databases. It does not create a login.
- Readiness checks PostgreSQL with `SELECT 1` through Prisma, and still checks MinIO. A failure is `unavailable` or `timeout`.
- CI applies migrations with `prisma migrate deploy` before integration tests. There is no schema push.
- No booking, upload, or payment endpoints. Catalogue screens stay on the mock.

### Admin sign-in (plan task 3)

- Argon2id passwords, server-side sessions, CSRF on state-changing admin routes, account lockout, and address rate limiting. Passwords are not logged or returned.
- `npm run admin:create` in the API repo creates the first owner. There is no public sign-up and no default password.
- `/admin` on the frontend asks the API who you are and sends you to `/admin/login` when the answer is 401. The API is what enforces access.
- `GET /api/admin/staff` is owner-only. Booking data on those screens is still the mock.

## Still mocked

The app itself still runs entirely on the in-browser mock. `VITE_API_BASE_URL` stays empty until modules move over (see "Moving modules from mock to real" in `IMPLEMENTATION_PLAN.md`):

- Bookings, uploads, form versions, services, availability, payment methods, receipts and notifications live in this browser's `localStorage` (prefix `tsn:v2:`).
- Visitor presence is simulated, and the UI says so.
- Booking screens still use the mock. Sign-in is real: `/admin` calls the API and redirects to `/admin/login` without a session.
- The API has the schema and no business endpoints. Screens still read the mock.
- Payment identifiers and all patient records are fictional. Do not enter real patient information.

## Blockers and open decisions

1. **Real payment details:** Cash App tag, Zelle recipient, account holder names and instructions, from the clinic.
2. **Business content:** address, hours, credentials, policies. All are placeholders now.
3. **Email provider** for patient and staff notifications (task 10).
4. **Compliance:** privacy obligations for dental photos and health-related answers in the clinic's jurisdiction (e.g. HIPAA in the US), before real data is collected. This includes whether Neon and Vercel Blob are acceptable stores. It shapes tasks 7 and 10.
5. **CI has not run on GitHub yet:** nothing has been pushed. Workflow steps that have been run were run locally.
6. **Production domain:** staff sessions need one parent domain so the site and API can share an HTTP-only cookie. Two `*.vercel.app` hosts cannot.

Hosting is decided and is not a blocker for tasks 3–6: Vercel for both apps, Neon for PostgreSQL, Vercel Blob for private files. Local Docker PostgreSQL and MinIO stay. Task 7 adds the Blob client. Nothing has been deployed.

## Local startup

```sh
# Terminal 1: API
cd ../topsmilesnova-api
cp .env.example .env        # first time only
npm ci
npm run infra:up            # PostgreSQL + MinIO + bucket
npm run db:migrate:deploy   # apply committed migrations
npm run db:seed             # fictional demo data; safe to re-run
# First owner. Password is read from the environment and is not printed.
ADMIN_PASSWORD='a long passphrase' npm run admin:create -- --email you@example.com --name "Your Name"
npm run start:dev           # http://localhost:3000/api

# Terminal 2: frontend (mock mode)
cd smile
bun install --frozen-lockfile
bun run dev                 # then open /dev/api-health to check connectivity
```

Stop with Ctrl+C in each terminal, then `npm run infra:down` in `topsmilesnova-api`. That keeps the data; `docker compose down -v` deletes it.

## Next task

**`IMPLEMENTATION_PLAN.md` task 4: services and availability.**

- Public and admin endpoints for services and availability.
- Slot calculation in the clinic time zone, including the capacity rule in the API's `docs/DATA_MODEL.md`.
- The admin services screen round-trips through the API. The rest of the app can stay on the mock until that module is switched.
