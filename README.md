# TopSmilesNova

Frontend for TopSmilesNova, a cosmetic dental consultation and booking site. It has a public marketing site, a five-step booking flow with manual payment proof, booking status and receipts, and an admin workspace for bookings, payment review, the consultation form, payment methods, services, availability and visitor presence.

The backend is a separate NestJS service in the sibling repository `../topsmilesnova-api`; see [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). Its platform, database schema, and health checks exist, but it has no business endpoints yet, so the app still runs against an in-browser mock API with fictional data. Production hosting is Vercel for this site and the API, Neon for PostgreSQL, and Vercel Blob for private files. Nothing is deployed yet.

## Stack

- React 19 with TanStack Start (SSR) and file-based TanStack Router (`src/routes/`)
- Vite 8 (`vite.config.ts`) with a nitro server build (Vercel preset)
- Tailwind CSS 4 and shadcn/ui (`src/components/ui/`)
- TanStack Query for data fetching, Zod for validation
- Bun for package management

## Getting started

Requirements: [Bun](https://bun.sh) 1.x (`brew install oven-sh/bun/bun`). The Vite toolchain also needs Node 20+ on your PATH.

```sh
bun install --frozen-lockfile
cp .env.example .env.local   # optional; empty values mean mock mode
bun run dev
```

The dev server prints its URL (default <http://localhost:8080>; it moves to the next free port if that one is taken).

- Public site: `/`
- Booking: `/book`
- Status: `/booking-status?ref=TSN-24076` (demo references: `TSN-24091`, `TSN-24088`, `TSN-24076`)
- Admin: `/admin`. Sign-in is required. Create the first owner in the API repo with `npm run admin:create` (see that repo's README). Booking data on the admin screens is still the local mock.
- API connectivity (development only): `/dev/api-health` calls the local API's `/api/health` and `/api/health/ready` from the browser. It needs `../topsmilesnova-api` running, doesn't change the app's data source, and returns 404 in production builds.

## Commands

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `bun run dev`       | Start the dev server with HMR         |
| `bun run build`     | Production build into `.output/`      |
| `bun run build:dev` | Development-mode build                |
| `bun run preview`   | Serve the production build locally    |
| `bun run typecheck` | TypeScript check (`tsc --noEmit`)     |
| `bun run lint`      | ESLint, including Prettier formatting |
| `bun run format`    | Format the codebase with Prettier     |

There is no automated test suite yet (plan task 12).

## Configuration

| Variable            | Default | Purpose                                                                                                                                                                                                                             |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | empty   | Base URL of the NestJS API including its prefix, e.g. `http://localhost:3000/api`. Empty means the in-browser mock API. Keep it empty for now: setting it points every screen at the API, whose business endpoints don't exist yet. |

Only `VITE_*` variables reach the browser. Never put secrets in them. `.env` and `.env.*` files are git-ignored except `.env.example`.

## Data layer

All UI data goes through `api` from `src/lib/api`:

```
src/lib/api/
  contracts.ts   domain types, request DTOs, status codes and labels
  client.ts      TopSmilesApi interface (public + admin groups)
  http.ts        REST client for the NestJS API
  mock/          stateful in-browser mock and fictional seed data
  hooks.ts       React Query hooks for public data
  queries.ts     query keys and error helpers
  index.ts       exports `api`: http when VITE_API_BASE_URL is set, else mock
```

**Mock mode:**

- Data is kept in this browser's `localStorage` under keys prefixed `tsn:v2:`. Clear site data to reset the demo.
- Admin edits, bookings, payment verification and receipts are shared between screens in the same browser.
- Visitor presence is simulated, and the admin UI labels it as simulated.
- Use fictional data only. Do not enter real patient information: mock data stays in the browser, unencrypted.

## Project docs

- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md): what is done, what is mocked, blockers, next task
- [docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md): journey-by-journey audit and remaining gaps
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): backend plan and the REST contract
- [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md): the original product brief
