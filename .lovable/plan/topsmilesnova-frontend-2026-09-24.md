# TopSmilesNova frontend

## Goal
Create a complete premium dental consultation experience for patients and a practical demo administration workspace, using fictional data and no backend.

## Patient experience
- Build shared navigation and footer, plus dedicated Home, Services, Gallery, About, Contact, and Booking Policies pages.
- Use the supplied near-black, charcoal, warm-white, muted-gray, and champagne-gold art direction with editorial typography, restrained motion, strong focus states, and responsive layouts.
- Add relevant dental photography and keep unknown clinic facts as editable placeholders.
- Build `/book` as a polished five-step flow: service, date/time, personal details and guided photos, manual payment proof, then review and submission.
- Validate inputs with Zod and React Hook Form, support unavailable slots and free consultations, and persist fictional draft data locally.
- Add booking status states, rejected-proof resubmission, a verified-payment receipt, printing, and receipt download.

## Admin experience
- Build a responsive `/admin` workspace with overview metrics, activity, notifications, and simulated visitor presence.
- Add booking search/filter/detail workflows and functional confirm, reschedule, and cancel actions.
- Add a payment-review queue with proof preview, required verification confirmation, rejection reasons, and receipt creation after verification.
- Add a form editor with reorder, field configuration, preview, drafts, publishing, protected workflow fields, and retained form-version snapshots.
- Add manual payment settings, services, opening hours, blackout dates, slots, and clinic time-zone controls.

## Data and interaction design
- Keep mock records, schemas, local persistence, and asynchronous API-style calls separate from page components so NestJS REST endpoints can replace them later.
- Provide reusable fields, uploaders, status badges, tables, summaries, and dialogs.
- Include loading, success, empty, error, and disabled states where each workflow needs them; avoid dead controls.

## Technical details
- Keep the project’s TanStack Router foundation while delivering the requested React routing behavior.
- Use React 19, TypeScript, Tailwind CSS, React Hook Form, Zod, and existing UI conventions.
- Give every public and admin route unique metadata.
- Verify the main patient flow and admin payment workflow on desktop and mobile, then check the generated build diagnostics.
