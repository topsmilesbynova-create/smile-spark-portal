# TopSmilesNova implementation plan

Ordered tasks to replace the in-browser mock with a NestJS backend. Each task lists its dependencies and acceptance criteria. The frontend audit and API seam that came before these tasks are complete (see `PROJECT_AUDIT.md`). **Tasks 1 and 2 below are done**; the backend lives in the sibling repository `../topsmilesnova-api`.

## Decisions

**NestJS lives in a separate repository** (suggested name `topsmilesnova-api`):

- The two apps stay in separate repositories and both deploy to Vercel: the frontend as a nitro Vercel build, the API as a Node function. PostgreSQL is Neon. Private files are Vercel Blob. Local development stays on Docker PostgreSQL and MinIO. Scheduled work in production is Vercel Cron, not an in-process timer.
- The API holds patient data, so a separate repo keeps its access, secrets and CI apart from the public site.
- A monorepo (`apps/web`, `apps/api`, shared `packages/contracts`) is also workable now that the frontend has no external editor sync. Choose it if one team will own both apps and wants shared types without codegen.

**Other decisions:**

- **Contracts:** `src/lib/api/contracts.ts` is the source of truth until the API publishes OpenAPI. After that, generate frontend types from the API's OpenAPI document (`openapi-typescript`) and keep `contracts.ts` as a thin re-export.
- **Money:** never automated. Staff verify manual transfers (Cash App, Zelle, bank). No payment processor, no card data.
- **Appointments:** stored as clinic wall-clock `date` + `time` + IANA `timeZone`. The API also stores the UTC instant for sorting and reminders.
- **Suggested stack:** NestJS 11, PostgreSQL, Prisma, `class-validator` DTOs, `@nestjs/swagger`, a transactional email provider. Hosting is decided: Vercel for both apps, Neon for PostgreSQL, Vercel Blob for private files. Local object storage stays S3-compatible (MinIO) until task 7 adds the Blob client. Two `*.vercel.app` hosts do not share an HTTP-only cookie, so production staff sessions need one parent domain (task 3).

## REST contract the frontend already targets

The paths are implemented in `src/lib/api/http.ts`. Bodies and responses use the types in `contracts.ts`. All `/admin/*` routes require an authenticated staff session.

| Method    | Path                                          | Request                     | Response                            |
| --------- | --------------------------------------------- | --------------------------- | ----------------------------------- |
| GET       | `/services`                                   | —                           | `Service[]` (enabled only)          |
| GET       | `/payment-methods`                            | —                           | `PaymentMethod[]` (enabled only)    |
| GET       | `/forms/consultation/published`               | —                           | `PublishedForm`                     |
| GET       | `/availability`                               | —                           | `AvailabilitySettings`              |
| GET       | `/availability/slots?date=YYYY-MM-DD`         | —                           | `TimeSlot[]`                        |
| POST      | `/bookings/reservations`                      | —                           | `ReservedReference`                 |
| POST      | `/uploads`                                    | multipart `file`, `kind`    | `UploadRef`                         |
| POST      | `/bookings`                                   | `CreateBookingRequest`      | `PublicBookingStatus`               |
| GET       | `/bookings/status/:reference`                 | —                           | `PublicBookingStatus` or 404        |
| POST      | `/bookings/status/:reference/payment-proof`   | `SubmitPaymentProofRequest` | `PublicBookingStatus`               |
| GET       | `/admin/bookings`                             | —                           | `Booking[]`                         |
| POST      | `/admin/bookings/:id/confirm`                 | —                           | `Booking`                           |
| POST      | `/admin/bookings/:id/reschedule`              | `RescheduleBookingRequest`  | `Booking`                           |
| POST      | `/admin/bookings/:id/cancel`                  | `CancelBookingRequest`      | `Booking`                           |
| POST      | `/admin/bookings/:id/payment/verify`          | `VerifyPaymentRequest`      | `Booking`                           |
| POST      | `/admin/bookings/:id/payment/reject`          | `RejectPaymentRequest`      | `Booking`                           |
| GET / PUT | `/admin/services`                             | `Service[]`                 | `Service[]`                         |
| GET / PUT | `/admin/availability`                         | `AvailabilitySettings`      | `AvailabilitySettings`              |
| GET / PUT | `/admin/payment-methods`                      | `PaymentMethod[]`           | `PaymentMethod[]`                   |
| GET       | `/admin/forms/consultation/published`         | —                           | `PublishedForm`                     |
| GET       | `/admin/forms/consultation/versions/:version` | —                           | `PublishedForm`                     |
| GET / PUT | `/admin/forms/consultation/draft`             | `{ fields }`                | `FormDraft` (GET may return `null`) |
| POST      | `/admin/forms/consultation/publish`           | `{ fields }`                | `PublishedForm`                     |
| GET       | `/admin/notifications`                        | —                           | `AdminNotification[]`               |
| POST      | `/admin/notifications/read`                   | —                           | 204                                 |
| GET       | `/admin/visitors`                             | —                           | `VisitorSession[]`                  |
| GET (SSE) | `/admin/visitors/stream`                      | —                           | `VisitorEvent` messages             |

Errors return `{ statusCode, error, message, details?, requestId }` (implemented in task 1). `message` is always a single readable string, which the frontend shows in a toast; field-level validation problems go in `details`. The mock (`src/lib/api/mock/index.ts`) implements the same rules and is the reference for validation behavior.

## Moving modules from mock to real

Today `src/lib/api/index.ts` picks one implementation for everything: the mock when `VITE_API_BASE_URL` is empty, the HTTP client otherwise. Setting the URL now would point every screen at endpoints that don't exist yet, so it stays empty until modules are switched one at a time:

1. **Per-module selection.** Split `api` into modules that map to backend tasks:
   - `catalogue`: services, payment methods, availability, slots (task 4).
   - `forms`: published form, drafts, versions (task 5).
   - `bookings`: reservations, create, status, admin actions (task 6).
   - `uploads` (task 7).
   - `payments`: verify, reject, resubmit (tasks 8–9).
   - `notifications` (task 10).
   - `presence` (task 11).
   - `auth` (task 3).

   A build-time variable, `VITE_API_REAL_MODULES=catalogue,forms`, lists the modules served by the HTTP client; every other module stays on the mock. `index.ts` composes `api` from the two implementations module by module.

2. **Fail loudly on bad config.** A module listed without `VITE_API_BASE_URL`, or an unknown module name, stops the app at startup with a clear error. It never quietly falls back to the mock.
3. **No silent fallback at runtime.** A failed HTTP call rejects with `ApiError`, and the screen shows its existing error state. Code must never catch an API error and substitute mock or cached demo data. Reviews should reject any `catch` that returns mock values.
4. **Switch dependent modules together.** Real bookings must not reference mock services, and mock bookings must not reference real uploads. Move `catalogue` and `forms` first, then `bookings`, `uploads` and `payments` together, then `notifications` and `presence`.
5. **Label what is still demo.** The admin shell's "Fictional local data only" note becomes a per-module indicator derived from the same configuration, so staff can see which screens are still showing demo data.
6. **Prove each switch.** Each switch needs the module's endpoints in the API's OpenAPI document, contract types updated if they changed, and the browser e2e journeys for that module passing against the real API.

Until then, the development-only page `/dev/api-health` checks browser-to-API connectivity (including CORS) without changing which implementation the app uses.

## Tasks

### 1. Backend repository and platform setup — done (2026-09-24)

**Status:** implemented in `../topsmilesnova-api`. It has:

- Node 24, npm lockfile, strict TypeScript.
- Zod-validated environment that fails fast with a list of named problems.
- `/api` prefix, Helmet, and CORS from `CORS_ORIGINS` (defaults to `http://localhost:8080` and `http://localhost:8081`).
- Whitelisting validation pipe, the shared error body, request IDs, and pino logs without headers, bodies or query strings.
- OpenAPI at `/api/docs`.
- `GET /api/health` (liveness) and `GET /api/health/ready`, which checks PostgreSQL with `SELECT 1` and the private bucket with HeadBucket, and returns 503 on failure.
- Docker Compose with PostgreSQL 17 and MinIO on 127.0.0.1-only ports, named volumes, health checks, and a bucket-init service.
- A GitHub Actions workflow with a unit job and an integration job.

The GitHub workflow has not run yet because nothing has been pushed; every step was run locally.

**Depends on:** nothing. Hosting is decided (Vercel, Neon, Vercel Blob). Task 7 implements Blob; deployment itself is still later.

**Work:**

- Create the NestJS repo with strict TypeScript, ESLint and Prettier.
- Validate config with `@nestjs/config` plus a schema.
- Add a health endpoint, OpenAPI at `/api/docs`, global prefix `/api`, and structured logging.
- Add CORS for the frontend origin only, with credentials.
- Add Helmet and a global validation pipe (`whitelist`, `forbidNonWhitelisted`).
- Add a Docker Compose file for Postgres and an S3-compatible store (MinIO).
- Set up CI for lint, type-check, test and build.

**Acceptance:**

- `GET /api/health` returns 200.
- OpenAPI renders.
- CI passes.
- The frontend, still in mock mode, reaches `GET /api/health` and `/api/health/ready` from the browser without CORS errors, via `/dev/api-health`. It does not set `VITE_API_BASE_URL`; see "Moving modules from mock to real".

### 2. Database schema — done (2026-09-24)

**Status:** implemented in `../topsmilesnova-api`. Prisma 7, the initial migration, and a repeatable development seed are in place. The model is documented in that repo's `docs/DATA_MODEL.md`. Readiness runs `SELECT 1` through Prisma and still times out with a generic public error. CI applies the committed migrations with `migrate deploy` before the integration tests.

Names differ from the list below where the schema is stricter:

- `AdminUser` is the staff actor. There is no password and no `Session` table; login is task 3. The seed's only staff row is disabled.
- Availability is `AvailabilitySettings` plus `AvailabilityRule` (weekday, start time, capacity) and `BlackoutPeriod` (date range). Capacity is not a unique index; the booking module must lock and count. See `DATA_MODEL.md`.
- Payment instructions are immutable `PaymentMethodVersion` rows referenced by each `PaymentAttempt`, not a single snapshot table. A new proof submission is a new attempt; the previous review stays.
- `StoredFile` keeps the object key and metadata, never image bytes or a public URL.
- `VisitorSession` is deferred to task 11. The `visitor_arrived` notification type is already in the enum.
- Receipt numbers come from `receipt_number_seq`. One verified attempt can have one receipt. Sequence gaps after a rollback are accepted; duplicate numbers are not.

**Depends on:** 1.

**Work** (Prisma models and migrations; Prisma replaces the health check's temporary `pg` pool, and the check keeps running `SELECT 1` through Prisma):

- `StaffUser`, `Session`.
- `Service`.
- `AvailabilitySettings`, `BlackoutDate`.
- `PaymentMethod` (with `sortOrder`).
- `FormVersion` (immutable, JSON fields), `FormDraft`.
- `Booking` (reference unique, status enums matching `contracts.ts`, appointment wall time plus UTC instant, patient contact, `answers` JSON, `formVersion` FK).
- `BookingReservation`.
- `Upload` (object key, kind, content type, size, checksum, booking FK).
- `PaymentInstructionSnapshot` (immutable, 1:1 with booking).
- `PaymentReview` (verify/reject history, staff FK, notes, reason).
- `Receipt` (sequential number, issued-at, amounts).
- `BookingEvent`, `Notification`.
- `VisitorSession` (anonymous id, path, timestamps).
- `AuditLog`.

Seed the fictional demo data from `src/lib/api/mock/seed.ts`.

**Acceptance:**

- Migrations apply on a clean database.
- The seed script reproduces the three demo bookings.
- Enum values match `BookingStatus` and `PaymentStatus` exactly.

### 3. Admin authentication and authorization — done (2026-09-29)

**Status:** implemented in `../topsmilesnova-api` and the frontend login screen. Email and password (argon2id), server-side sessions in an HTTP-only `SameSite=Lax` cookie, CSRF on state-changing `/admin` routes, per-account lockout, and per-address rate limiting. `GET /api/admin/me` requires a session. `GET /api/admin/staff` is owner-only. `npm run admin:create` creates the first owner; there is no sign-up. The frontend `/admin` routes redirect to `/admin/login` when the API returns 401. Booking data still comes from the mock.

**Depends on:** 2.

**Work:**

- Email and password login with argon2id hashing.
- Server-side sessions in an HTTP-only, `Secure`, `SameSite=Lax` cookie. The site and API are separate Vercel apps, and two `*.vercel.app` hosts do not share that cookie. Production needs one parent domain, with the site and API on subdomains, and the cookie set for that parent.
- CSRF protection for state-changing admin routes.
- Rate limiting and lockout on login.
- Roles: `owner` and `staff`.
- A guard on all `/admin/*` routes.
- A CLI to create the first owner. No public sign-up.
- Frontend: a `/admin/login` screen and a route guard that redirects on 401. The guard is UX only; the API enforces access.

**Acceptance:**

- Every `/admin/*` route returns 401 without a session and 403 for the wrong role.
- Covered by e2e tests.
- Sessions expire and can be revoked.
- Passwords never appear in logs.

### 4. Services and availability

**Depends on:** 3.

**Work:**

- Public and admin service and availability endpoints.
- Slot computation in the clinic time zone (use a tz library such as Luxon or date-fns-tz). It must honour working days, blackout dates, booking window, existing bookings and past times.
- Allow adding and archiving services. Never hard-delete a service that has bookings.

**Acceptance:**

- The unit tests cover:
  - A DST transition.
  - A blackout date.
  - Same-day past slots.
  - A slot taken by another booking.
  - A cancelled booking freeing its slot.
- The admin "Services & availability" screen round-trips through the API.

### 5. Consultation form drafts and publishing

**Depends on:** 3.

**Work:**

- Draft save, then publish to a new immutable `FormVersion`.
- Server-side validation mirroring `validateFields` in the mock: protected fields can't be removed or change type, and choice fields need options.
- Fetch a form by version.

**Acceptance:**

- Publishing creates version N+1.
- Existing bookings still resolve their original version.
- An attempt to remove a protected field returns 400.

### 6. Bookings

**Depends on:** 4, 5.

**Work:**

- Reserve a reference with a TTL. References are random, not sequential.
- Create a booking in a transaction:
  - Re-check the slot by locking the availability rule and counting bookings for that start instant, as described in the API's `docs/DATA_MODEL.md`. Do not add a unique index on the start time: capacity can be greater than 1, and cancelled or expired bookings free the slot.
  - Check the service is enabled and the reservation valid.
  - Validate the answers against the submitted form version.
  - For paid services, require proof and capture the instruction snapshot.
  - Free services go to `pending_review`.
- Public status lookup must not let people enumerate references: require the reference plus the patient's email, or a signed link sent by email. This needs a small frontend change (an email field on `/booking-status`).
- Admin list with server-side filters (date range, service, status, payment status), search and pagination.
- Admin confirm, reschedule and cancel, with an audit event for each.
- A scheduled job moves unpaid or unreviewed bookings past a deadline to `expired`.

**Acceptance:**

- Two simultaneous requests for the same slot produce exactly one booking.
- `confirm` is rejected unless payment is `verified` or `not_required`.
- The public status response never includes contact details, answers or photos.

### 7. Private uploads

**Depends on:** 2. Can run in parallel with 4–6.

**Work:**

- `POST /uploads` streams to private object storage. Locally that is MinIO through the existing S3 client. Production is a private Vercel Blob store, via the Blob SDK, not a public URL. Postgres continues to store the object key and file metadata only.
- Allow JPEG, PNG, HEIC and WebP up to 10 MB. Check magic bytes, not just the extension.
- Strip EXIF data and re-encode images.
- Uploads start unattached and expire if not linked to a booking within 24 hours. Cleanup runs on Vercel Cron, not an in-process timer.
- Serve files only through short-lived access, issued to staff or for the patient's own proof preview.
- No public buckets or public Blob URLs. Confirm Neon and Vercel Blob meet the clinic's privacy obligations before any real photo is stored.

**Acceptance:**

- A non-image upload is rejected.
- An unattached upload is deleted by the cleanup job.
- A signed URL expires.
- Photos can't be reached without a valid URL.

### 8. Payment verification

**Depends on:** 6, 7.

**Work:**

- A review queue (`paymentStatus = proof_submitted`).
- Verify, with required confirmation and optional notes.
- Reject, with a required reason. The patient can resubmit (a new `Upload`), and the history is kept.
- The instruction snapshot is immutable.
- Every decision records the staff member and time in `PaymentReview` and `AuditLog`.

**Acceptance:**

- Verify and reject return 409 if the proof isn't in `proof_submitted`.
- Editing a payment method never changes an existing snapshot.
- A resubmission after rejection returns the booking to the queue.

### 9. Receipts

**Depends on:** 8.

**Work:**

- Issue a receipt only in the same transaction as payment verification.
- Gap-free sequential numbering (a database sequence) formatted `RCP-000001`.
- A receipt records the amount received, currency, method, booking reference and issue time.
- Branded PDF endpoint, plus the existing print view.

**Acceptance:**

- No code path creates a receipt without a verified payment.
- Numbers are unique and increasing under concurrent verification.
- The PDF matches the on-screen receipt.

### 10. Notifications

**Depends on:** 6, 8.

**Work:**

- In-app notifications for:
  - New booking.
  - Proof submitted or resubmitted.
  - Proof rejected.
  - Payment verified.
  - Visitor arrival (from task 11).
- Unread and read state per staff member.
- An SSE stream so the bell updates live; the current 15-second polling can remain as a fallback. On Vercel, treat polling as the dependable path: a Node function will not hold a long-lived SSE connection open. Email delivery and expiry jobs use Vercel Cron.
- Email to staff for new bookings and proof submissions.
- Email to patients for:
  - Submission acknowledgement.
  - Rejection with the reason and a link to resubmit.
  - Confirmation with the receipt.
- Per-staff preferences stored server-side. These replace the browser-only preferences in `src/lib/notification-prefs.ts`.

**Acceptance:**

- Each event produces exactly one notification per subscribed staff member.
- Emails contain no photos or answers.
- Opening the bell marks items read.

### 11. Visitor presence

**Depends on:** 1, 10.

**Work:**

- A small public script creates an anonymous session id (random, stored in `sessionStorage`) and sends a heartbeat with the current path about every 20 seconds.
- Admins get SSE `snapshot` and `arrived` events matching `VisitorEvent`. On Vercel, fall back to polling on the same interval as the notification bell; do not depend on a long-lived SSE connection. Purge expired presence rows with Vercel Cron.
- A session goes offline after missing heartbeats.
- Store no IP address, user agent or personal data. Keep records for a short time (for example, 24 hours).
- Respect Do Not Track and consent requirements.

**Acceptance:**

- An arrival shows in `/admin/visitors` and raises a toast within 5 seconds.
- Records are purged after the retention period.
- Presence data can't be linked to a patient.

### 12. Frontend cut-over, tests and release

**Depends on:** each backend module as it lands.

**Work:**

- Point `VITE_API_BASE_URL` at the API. Remove any remaining mock-only UI copy ("Simulated…").
- Add route loaders with React Query prefetching for public services, so SSR includes them.
- Add the booking-status email field (task 6) and `/admin/login` (task 3).
- Add Vitest for the mock rules and utilities, and Playwright e2e for the journeys in the audit. The scratch e2e script used in Task 1 is a starting point.
- Hide the mobile booking bar on `/book` and add bottom padding for it.
- Accessibility pass with axe.
- Deploy the frontend and API to Vercel staging, with Neon and Vercel Blob. Only then configure real payment identifiers and business details.

**Acceptance:**

- All journeys in the audit are **Implemented** against the API.
- The e2e suite passes in CI.
- No `mockApi` import is reachable in the production build when `VITE_API_BASE_URL` is set.
