# SmileBook Pro

Paste this into Lovable. Attach the handbook too so it has the full project context.

Build a premium, responsive React frontend for TopSmilesNova, a dental consultation and appointment booking website.

Reference for the consultation flow:

https://wondersmile.org/online-consultation/

Use the reference for inspiration, but create an original TopSmilesNova design.

Project scope

Create the complete frontend experience:

1. Public marketing website.

2. Multistep consultation and booking form.

3. Manual payment instructions and payment screenshot upload.

4. Booking status and receipt screens.

5. Admin dashboard for managing bookings, form fields, payment details, and visitor notifications.

The backend will be built separately with NestJS. For this phase, use realistic mock data and a clearly separated mock API service layer. Do not set up Supabase or another backend. Make it straightforward to connect the frontend to REST endpoints later.

Use React, TypeScript, Tailwind CSS, reusable components, React Router, React Hook Form, and Zod where appropriate.

Visual direction

The website should feel like a premium cosmetic dental brand.

* Main background: near-black #0B0B0D.

* Cards and elevated surfaces: charcoal #181A1E.

* Primary text: warm white #F7F4EE.

* Secondary text: muted gray #A9ADB5.

* Accent: champagne gold #D6B981.

* Use gold selectively for primary actions, selected states, and small details.

* Elegant editorial typography for headings and a readable sans serif for body text and forms.

* Generous spacing, strong hierarchy, subtle borders, and restrained animation.

* Use beautiful, relevant photography with intentional cropping.

* Avoid excessive gradients, glowing effects, clutter, and generic startup styling.

* Design carefully for mobile, tablet, and desktop.

* Ensure readable contrast, visible focus states, accessible labels, and large touch targets.

Public website

Create these pages or routes:

Home

Include:

* Navigation with TopSmilesNova branding.

* Links to Services, Gallery, About, FAQs, and Contact.

* A prominent “Book a consultation” button.

* A visually striking hero with a large headline, short description, relevant photography, and booking CTA.

* Service cards using clearly editable sample content.

* A simple explanation of the booking process.

* An introduction to the clinic.

* A gallery section.

* FAQs.

* Contact section and footer.

* A mobile booking CTA that does not cover page content.

Do not invent real credentials, patient reviews, clinic addresses, success statistics, or treatment guarantees. Keep unknown business details as editable placeholders.

Supporting pages

Create Services, Gallery, About, Contact, and Booking Policies pages using a consistent design system.

Booking experience

Create a polished multistep form at /book.

Display a progress indicator, Back and Continue controls, inline validation, and an appointment summary.

Step 1 — Service

* Select a consultation or service.

* Display sample duration, format, and consultation fee or deposit.

* Support services that require no payment.

* Clearly distinguish a deposit from the full treatment price.

Step 2 — Appointment

* Choose a date using a calendar.

* Choose an available time slot.

* Show unavailable slots clearly.

* Display the appointment time zone.

* Show a clear empty state when no slots are available.

Step 3 — Your details

Include:

* Full name.

* Email.

* Phone.

* City and country.

* Consultation goals.

* Relevant previous dental procedures.

* An “Other” option with a conditional text field.

* Guided dental photo uploads with previews, replace/remove controls, and upload progress.

* Consent and booking-policy acceptance.

Render configurable questions from a form schema so the admin form editor can change them.

Step 4 — Payment

Payment methods are manual, configured by the admin.

Example:

When the patient selects Cash App, show:

* Payment method name.

* Account holder.

* Cash App tag.

* Copy tag button.

* Exact amount and currency.

* Booking reference.

* Instructions for making the transfer.

Switching payment methods should immediately display the corresponding details.

Use clearly fictional demo payment identifiers. Do not add automatic checkout or payment processing.

After the patient pays externally, allow them to:

* Upload a payment screenshot.

* Preview, replace, or remove the screenshot.

* Enter an optional transaction reference.

* Enter the payer’s name if different.

For a free consultation, skip this step.

Step 5 — Review and submit

Show a clear summary of the appointment, contact details, selected payment method, uploaded proof, and accepted policies.

On submission, display:

“Your booking request and payment proof have been submitted for review.”

Do not mark the payment as verified simply because a screenshot was uploaded.

Booking status and receipt

Create a booking status page with a readable timeline and these states:

* Awaiting payment.

* Payment under review.

* Action needed.

* Confirmed.

* Cancelled.

* Expired.

If payment proof is rejected, show the reason and a button to submit new proof.

After the admin verifies payment, show:

* Confirmed appointment details.

* Verified payment status.

* Receipt number.

* Amount received and currency.

* Payment method.

* Issue date.

* Download receipt and print actions.

Create a clean, print-friendly receipt layout. Label the initial submission acknowledgement separately from a verified payment receipt.

Admin dashboard

Create a separate admin layout at /admin with a sidebar, top bar, notification center, and responsive navigation.

Use the same black brand theme, with strong readability for operational screens.

Overview

Show mock data for:

* Today’s appointments.

* Upcoming bookings.

* Payments awaiting review.

* Confirmed bookings.

* Active visitors.

* Recent activity.

Use meaningful cards, tables, and status badges.

Bookings

Include:

* Search.

* Filters by date, service, booking status, and payment status.

* Booking detail view.

* Patient contact details.

* Form answers.

* Uploaded photos.

* Payment proof.

* Activity history.

* Confirm, reschedule, and cancel actions.

Payment review

Create a queue and detail screen showing:

* Booking reference.

* Expected payment amount.

* Selected method and payment instructions shown to the patient.

* Submitted screenshot with an enlarged preview.

* Transaction reference.

* Verification notes.

* Verify payment and Reject proof actions.

Before verification, show a confirmation dialog reminding staff to check that funds arrived in the receiving account.

Verification should update the mock booking and make the receipt available. Rejection requires a reason.

Form editor

Allow the admin to:

* Add and reorder questions.

* Edit labels and help text.

* Configure required or optional fields.

* Edit dropdown, radio, and checkbox options.

* Show or hide questions.

* Preview the patient form.

* Save a draft and publish changes.

Support text, textarea, select, radio, checkbox, date, consent, and file-upload fields.

Protect essential workflow fields such as service, appointment time, contact details, and payment proof from accidental deletion.

Published changes should update the mock public form. Existing submissions should retain their original form version.

Payment settings

Allow the admin to:

* Add a manual payment method.

* Edit its name.

* Edit the account holder.

* Edit the tag or account identifier.

* Edit payment instructions.

* Enable or disable it.

* Reorder the methods.

Saving changes should update the mock booking payment options.

Keep an instruction snapshot on existing mock bookings so later edits do not change what a previous patient was shown.

Services and availability

Provide screens for editing:

* Services.

* Duration.

* Consultation fee or deposit.

* Currency.

* Appointment format.

* Opening hours.

* Blackout dates.

* Available slots.

* Clinic time zone.

Visitors and notifications

Create a live visitor interface using simulated data.

Show:

* Active visitor count.

* Anonymous session label.

* Current page.

* Arrival time.

* Active or offline state.

Show a simulated arrival notification when a new visitor appears, with controls for notification preferences.

Also include notifications for new bookings, payment proof submissions, rejected proof, and confirmed payments.

Do not invent personal identities for anonymous visitors. Clearly identify the presence feed as simulated within the admin demo.

Interaction and quality requirements

* Make navigation, forms, filters, dialogs, uploads, previews, and mock state changes functional.

* Include loading, empty, error, success, and disabled states.

* Persist only fictional demo data locally where useful.

* Keep mock data and API access separate from presentation components.

* Use reusable components for form fields, payment cards, booking summaries, status badges, tables, and dialogs.

* Avoid dead buttons.

* Do not describe frontend-only controls as secure authentication or real payment verification.

* Keep technical implementation notes out of patient-facing screens.

Prioritize a polished mobile booking experience and an efficient admin workflow. Complete all the requested screens and interactions, not only the homepage.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0967a5d5-0a74-4a02-9cd2-986c269ffe13).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
