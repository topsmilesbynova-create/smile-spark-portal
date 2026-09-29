# TopSmilesNova frontend audit

Audit of the generated frontend at commit `a59d84a`, taken on 2026-09-24 before backend work began. It records what the code actually did, not what the product brief (`PRODUCT_BRIEF.md`) asked for. Section 4 lists what Task 1 changed.

## 1. Stack and structure

| Area            | Finding                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | React 19 and TanStack Start (`@tanstack/react-start`) with file-based TanStack Router. SSR runs through nitro, whose default build target is Cloudflare. The brief asked for React Router; the TanStack router works and was kept. |
| Build           | Vite 8. At baseline the config came from a vendor wrapper package; it has since been replaced by a plain `vite.config.ts` (see section 4).                                                                                         |
| Package manager | Bun (`bun.lock`, `bunfig.toml` with a 24-hour minimum package age).                                                                                                                                                                |
| Styling         | Tailwind 4 with theme tokens in `src/styles.css`: near-black background, charcoal surfaces, warm-white text, champagne-gold primary. DM Serif Display and Manrope fonts.                                                           |
| UI kit          | shadcn/ui (`src/components/ui/`, vendored).                                                                                                                                                                                        |
| Data            | React Query was installed and provided in `__root.tsx` but unused. All data came from `src/lib/mock-api.ts` through `useEffect` calls, or from its seed arrays imported directly.                                                  |
| Forms           | Zod for one details schema. React Hook Form was installed but unused.                                                                                                                                                              |
| Auth / backend  | None. No `fetch` calls and no environment variables.                                                                                                                                                                               |
| Tests           | None.                                                                                                                                                                                                                              |
| Editor sync     | At baseline the repo was connected to an external site-builder that synced from `main`. That connection and its files were removed after Task 1.                                                                                   |

**Routes** (`src/routes/`): `/`, `/services`, `/gallery`, `/about`, `/contact`, `/booking-policies`, `/book`, `/booking-status?ref=`, `/admin` (layout), `/admin/bookings`, `/admin/payments`, `/admin/form-editor`, `/admin/payment-settings`, `/admin/services`, `/admin/visitors`. Each route file only sets metadata and renders a component.

**Components**: `site-shell.tsx` (public header, footer, mobile CTA), `marketing.tsx` (home and content pages), `booking-flow.tsx` (five-step booking), `admin-dashboard.tsx` (the admin shell and all seven admin screens), `shared.tsx` (status badge, upload box, copy button, metric, empty state).

## 2. Checks at baseline

| Check                           | Result                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile` | OK                                                                                                                                                                                                                                |
| `tsc --noEmit`                  | Pass                                                                                                                                                                                                                              |
| `eslint .`                      | **Fail**: 151 `prettier/prettier` errors across 23 files (components were minified onto single lines), 1 `no-empty`, 1 `react-hooks/exhaustive-deps`, 7 `react-refresh/only-export-components` warnings                           |
| `vite build`                    | Pass (one framework warning about `inlineDynamicImports`, still present)                                                                                                                                                          |
| Relaxed settings                | `@typescript-eslint/no-unused-vars: off`; `noUnusedLocals` and `noUnusedParameters: false`. Enabling them surfaced 8 unused imports. `noUncheckedIndexedAccess` is off; that is not a relaxation of `strict`, so it was left off. |

## 3. Journey audit (baseline)

Status key: **Implemented** means it works against shared state. **Mocked** means it works, but only against local fictional data. **Incomplete** means the UI exists but the behavior is partly fake or broken. **Missing** means it isn't there.

| Journey                            | Status at baseline | Evidence and gaps                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public navigation                  | Implemented        | `site-shell.tsx`. Header, mobile menu, footer and FAQ anchor all work. The fixed mobile "Book a consultation" bar also shows on `/book`, and no bottom padding is reserved for it, so it can cover the last content on a page. Still open.                                                                                                                                                                                                       |
| Service and appointment selection  | Incomplete         | `booking-flow.tsx` read the static `services` seed, so admin service edits never reached patients. The six time slots were hardcoded, with slots 2 and 5 always "Full". The calendar used the browser's local date while the copy claimed ET.                                                                                                                                                                                                    |
| Intake form and photo uploads      | Incomplete         | The form layout was hardcoded. `initialFields` was used only for two labels, so the form editor had no effect. Photo slots were a positional array: uploading only the side view stored it as the front photo, and removing the front moved the side view into its slot. The draft autosave wrote base64 photos and payment proof to `localStorage` without error handling, risking a quota exception and leaving patient photos in the browser. |
| Manual payment selection           | Mocked             | Switching methods updated the details on screen immediately. The methods came from the static seed, so admin edits were ignored. The reference shown was the literal `TSN-PENDING`, so patients couldn't quote a real reference in their transfer.                                                                                                                                                                                               |
| Payment screenshot submission      | Incomplete         | The upload and preview worked, but `submitBooking` discarded the screenshot, transaction reference, payer name, answers and photos, and stored no instruction snapshot.                                                                                                                                                                                                                                                                          |
| Booking status                     | Incomplete         | `booking-status.tsx`. Lookup worked. Proof resubmission only changed component state and was lost on reload. The timeline marked payment review done for rejected, cancelled and expired bookings. "ET" and the receipt issue date were hardcoded.                                                                                                                                                                                               |
| Admin booking management           | Incomplete         | Search and the status filter worked, and confirm, reschedule and cancel saved changes. But "Form answers", "Uploaded photos" and "Activity history" were hardcoded text. Reschedule always moved the booking to "Sep 29, 2026, 11:00 AM". "Confirm booking" could confirm a booking whose payment was never verified. No date, service or payment-status filters.                                                                                |
| Payment verification and rejection | Incomplete         | The confirm dialog and required rejection reason worked and saved changes. But the screenshot was a placeholder, the identifier and instruction snapshot were hardcoded strings, "Enlarge preview" did nothing, there was no verification-notes field, and receipt numbers were random with no issue date.                                                                                                                                       |
| Receipt display                    | Mocked             | Print and text download worked, but the issue date was hardcoded.                                                                                                                                                                                                                                                                                                                                                                                |
| Form editor                        | Incomplete         | Add, reorder, edit, the required/visible toggles and the preview all worked locally. The editor started from seed fields, not saved ones. "Save draft" only showed a message. Publish saved the fields, but the patient form never read them, and the success message always said "Version 2". Protected fields could change type. No form versions were stored.                                                                                 |
| Payment settings                   | Incomplete         | Edit, add and enable all worked and were saved. The screen started from seeds, so saved edits disappeared on reload, and the booking flow ignored them. No reorder.                                                                                                                                                                                                                                                                              |
| Availability settings              | Incomplete         | Time zone, opening hours, blackout dates and slots were read-only inputs (`onChange={() => {}}`) that looked editable.                                                                                                                                                                                                                                                                                                                           |
| Services settings                  | Incomplete         | Edits were saved but never read back by any screen. Deposit and consultation fee couldn't be switched.                                                                                                                                                                                                                                                                                                                                           |
| Visitor presence and notifications | Mocked             | The visitor table was hardcoded, and one row was added after 2.5 seconds. Only the first preference switch worked; the others were stuck on. Arrival notifications only appeared as a new table row. The notification bell showed three hardcoded items and always had an unread dot.                                                                                                                                                            |
| Admin access                       | Missing            | `/admin` is open to anyone and linked from the public footer. There is no auth of any kind (expected at this stage).                                                                                                                                                                                                                                                                                                                             |

**Shared mock state, summarised:** the only data that moved between screens was the bookings list, via the old `mockApi.getBookings`/`saveBookings`. Every admin setting was write-only, and patient-facing screens always rendered the seeds.

## 4. What Task 1 changed

- **Tooling:**
  - Switched to Bun and removed a stray `package-lock.json`.
  - Formatted the code with Prettier.
  - Restored `no-unused-vars` (`^_` ignore pattern) and `noUnusedLocals`/`noUnusedParameters`, and fixed the lint errors.
  - Added a `typecheck` script.
  - Added `.env` to `.gitignore`.
- **API layer** (`src/lib/api/`):
  - `contracts.ts` holds the typed domain models, request DTOs and status codes.
  - `client.ts` defines the `TopSmilesApi` interface, split into `public` and `admin` groups.
  - `http.ts` is the REST client for NestJS.
  - `mock/` is a stateful in-browser implementation.
  - `index.ts` selects `api` from `VITE_API_BASE_URL`.
  - `hooks.ts` and `queries.ts` hold the React Query hooks and keys.
- **Mock behaviour:**
  - All settings and bookings share one store in `localStorage` (prefix `tsn:v2:`). If storage fails or the quota is exceeded, it falls back to memory.
  - Bookings store answers, photos, proof, transaction reference, payer name, an immutable payment-instruction snapshot, an activity log and a receipt.
  - Form versions are kept.
  - Slots are derived from the availability settings.
  - Each action creates an admin notification.
  - Visitor presence is a subscription that pushes simulated arrivals.
- **Screens:**
  - Every screen reads and writes through `api`, so admin changes reach patients.
  - Admin-added questions render in the patient form.
  - A real booking reference is reserved before the payment step.
  - Photo slots are keyed as front and side.
  - The draft stores text only.
  - Free services become "Under review" instead of auto-confirming.
  - The status timeline reflects rejection, cancellation and expiry.
  - Resubmitted proof is saved.
  - Receipts use a sequential number and a real issue date.
  - The admin booking detail shows the real answers, photos and activity.
  - Confirmation requires a verified or not-required payment.
  - Reschedule uses a calendar and slot picker.
  - Payment review shows the actual screenshot, snapshot and enlarge dialog, and adds verification notes.
  - Form drafts are saved.
  - Protected field types are locked.
  - Payment methods can be reordered.
  - Availability inputs work.
  - All notification preferences work, and visitor arrivals raise a toast.
- **Site-builder removal (follow-up):**
  - Replaced the vendor Vite wrapper with a plain `vite.config.ts` that uses the same plugins and options: Tailwind, TanStack Start with import protection, nitro with the Cloudflare preset, React, and the `@` alias.
  - Removed the vendor's runtime error-reporting hook, its generation plan folder, its agent instructions and its package exclusions.
  - Removed the unused `vite-tsconfig-paths` package.
- **Visual design:** unchanged, apart from loading skeletons and the new controls listed above.

## 5. Remaining gaps and risks

| Priority | Gap                                                                                                                                                                                                                | Where it's addressed                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| P0       | No authentication or authorization. The admin UI is a demo, and anyone can open `/admin`.                                                                                                                          | Plan task 3                                         |
| P0       | Patient data (names, contact details, answers, photos) lives in browser `localStorage` in mock mode. Use fictional data only until the backend exists.                                                             | Plan tasks 6–7                                      |
| P0       | Status lookup needs only the reference, which can be guessed.                                                                                                                                                      | Plan task 6 (reference plus email or a signed link) |
| P1       | Payment instructions are fictional placeholders. Real Cash App and Zelle details are needed from the clinic.                                                                                                       | Blocker in PROJECT_STATUS                           |
| P1       | Business details (address, hours, credentials, policies) are placeholders.                                                                                                                                         | Blocker in PROJECT_STATUS                           |
| P1       | No automated tests.                                                                                                                                                                                                | Plan task 12                                        |
| P2       | Admin bookings list lacks date, service and payment-status filters. There's no way to add or delete a service.                                                                                                     | Plan task 4 / 6                                     |
| P2       | Public services and the booking form render after hydration, so the server HTML has skeletons. Once the API exists, use route loaders with React Query prefetching so the SEO-relevant content is server-rendered. | Plan task 12                                        |
| P2       | The mobile booking bar shows on `/book` and can cover the last lines of each page.                                                                                                                                 | Plan task 12                                        |
| P2       | Receipt download is plain text. A branded PDF is expected.                                                                                                                                                         | Plan task 9                                         |
| P3       | Vendored shadcn files trigger 6 `react-refresh/only-export-components` warnings. Harmless.                                                                                                                         | —                                                   |
