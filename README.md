# EBI ALAS — Automated Loan Approval System (Frontend)

The web client for Enterprise Bank Inc's loan origination, evaluation, and monitoring platform. React 19 + TypeScript + Vite, talking to the [`EBI_ALAS_V2_backend`](https://github.com/jcmcjms/EBI_ALAS_V2_backend) API. Every feature listed below is wired to live API endpoints.

---

## What it does

ALAS handles the full lifecycle of a consumer loan application at the branch level:

- **CIS lookup**: search borrowers and pull profiles, accounts, and outstanding loans from the legacy WebLoan system (branch-isolated)
- **Loan creation**: multi-step form covering client confirmation, loan parameters (one or many loans per application group), obligations, deviations, and verification — with live amortization / NTHP computations and a full-screen, print-ready approval form preview
- **Review desk**: role-based desk queue (recommend / evaluate / approve) with claim & release against the backend's leased workflow queues
- **Approval and evaluation**: dedicated pages per step in the approval chain — decision-first action panels, document requirements and checklists, incomplete-document alerts, document flags, deviation remarks, signature chain with e-signature ink, application timeline, and printable Enterprise Bank approval forms
- **Loan revision**: respond to pushbacks at `/loans/revision/:loanId` with revision notes and resubmission
- **Monitoring**: searchable loan table (status / id / flagged filters in the URL), detail drawers, summary cards, weekly trends, and queue widgets
- **Account**: profile with signature-pad e-signature capture, activity feed with date and kind filters, processed loans and recent clients, and session management (IP / device info, revoke one or all others)
- **Admin**: user management (create, edit, suspend/activate, Excel bulk import with one-time temporary passwords), branch registry, loan product catalog (sync from WebLoan, Excel import/export, per-product document requirements), and runtime workflow settings
- **Notifications**: inbox with real-time delivery, toasts, chime, and tab-title alerts via SignalR, plus a live presence directory ("online users")

## Tech stack

| Layer | What we use |
|---|---|
| Framework | React 19 (+ **React Compiler** via `babel-plugin-react-compiler`) |
| Language | TypeScript 6 |
| Build | Vite 8 |
| Routing | TanStack Router 1 (code-split route tree in `src/app/routes/router.tsx`) |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| HTTP | Axios (single `apiClient` with auth/CSRF/refresh interceptors) |
| Forms | React Hook Form + Zod 3 |
| UI components | shadcn/ui (Base UI variant, `base-lyra` style) on `@base-ui/react` |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`, CSS-variable tokens, no config file) |
| Icons | Phosphor Icons |
| Data tables | TanStack Table 9 |
| Charts | Recharts 3 |
| Rich text | Tiptap 3 (output sanitized with DOMPurify) |
| Dates | date-fns + react-day-picker |
| Realtime | `@microsoft/signalr` 10 (WebSocket-only hub connection) |
| Fonts | Geist (variable, self-hosted via Fontsource) |
| Printing | `window.print()` + print-only CSS (`public/print_logo.png` shows only on paper) |
| Testing | Vitest 5 + Testing Library (jsdom); Playwright scaffolded for e2e |
| Lint / architecture | ESLint 10 (flat config) + dependency-cruiser |

## How it's organized

Feature-first. Each feature owns its pages, components, hooks, API calls, schemas, store, and types. Shared UI primitives and utilities live in `src/shared`. App-level wiring (layout shell, route tree, error boundaries, providers) lives in `src/app`.

```
src/
├── app/                          # App-level wiring
│   ├── layout/                   #   AppShell, sidebar, nav, header, online users
│   ├── routes/                   #   TanStack Router tree (code-split, permission-guarded)
│   └── system/                   #   ErrorBoundary, AuthInitProvider, FeatureErrorBoundary
│
├── features/
│   ├── account/                  # Profile + e-signature, activity, sessions, security tab
│   ├── admin/
│   │   ├── branches/             # Branch registry table + create/edit sheets
│   │   ├── loan-products/        # Catalog CRUD, WebLoan sync, Excel import/export,
│   │   │                         #   document-requirements editor
│   │   ├── users/                # User table, create/edit drawers, Excel import,
│   │   │                         #   temporary-password dialog, suspend/activate
│   │   └── workflow/             # Runtime workflow settings (recommendation toggle)
│   ├── auth/                     # Login, forgot-password, change-password, forbidden,
│   │                             #   ProtectedRoute, password strength indicator
│   ├── dashboard/                # Summary widgets, workload tabs, as-of date filter,
│   │                             #   trends, queues, now-serving, flagged documents
│   ├── loans/
│   │   ├── pages/
│   │   │   ├── approval/         # Approval page: action panel, documents tab, print form
│   │   │   ├── create/           # Multi-step loan creation + approval form preview
│   │   │   ├── evaluation/       # Evaluation page
│   │   │   ├── monitoring/       # Loan monitoring table + detail drawer
│   │   │   ├── queue/            # Review desk (claim/release, role desks)
│   │   │   ├── review/           # Shared review components
│   │   │   └── revision/         # Pushback response + resubmission
│   │   ├── api/                  # Typed API functions (loans, groups, webloans, review,
│   │   │                         #   revise, signatures, documents, queries)
│   │   ├── components/           # Timeline, pushback dialog, flag badge, print header…
│   │   ├── constants/            # Role queues, form sections
│   │   ├── hooks/                # Desk queue, computations, submissions, realtime…
│   │   ├── model/                # Domain helpers
│   │   ├── schemas/              # Zod schemas
│   │   ├── store/                # escalationStore
│   │   └── types/                # TypeScript types
│   └── notifications/            # Inbox, read/read-all, SignalR realtime, presence
│
├── shared/
│   ├── components/layout/        # Sidebar primitives
│   ├── config/                   # env (VITE_API_BASE_URL handling)
│   ├── hooks/                    # use-debounced, use-mobile
│   ├── lib/
│   │   ├── api/                  # Shared API types (PERMISSIONS, PagedResult adapters)
│   │   ├── query/                # Centralized query keys
│   │   ├── signalr/              # Shared hub connection, notification + presence hooks
│   │   ├── apiClient.ts          # Axios instance + interceptors (auth, CSRF, refresh)
│   │   ├── jwt.ts                # JWT payload decoding → user session
│   │   └── …                     # format, loan-aging, name-utils, navigation, rich-text
│   ├── store/                    # auth / notification / presence / signalr-connection stores
│   └── ui/                       # shadcn/ui primitives grouped by role:
│                                 #   data-display, feedback, forms (incl. signature-pad,
│                                 #   date-picker, currency-input), navigation, primitives
│
├── App.tsx                       # RouterProvider
├── main.tsx                      # StrictMode → ErrorBoundary → QueryClient → AuthInit → App
└── index.css                     # Tailwind 4 theme tokens, dark mode, Geist font
```

### Architecture rules (enforced)

`npm run architecture:check` (dependency-cruiser, `.dependency-cruiser.js`) and matching ESLint `import/no-restricted-paths` zones fail the build on:

- feature → feature imports (features are islands; share through `src/shared`)
- `shared` → `features` / `app` imports
- `features` → `app` imports
- circular dependencies, unresolved imports, production code importing test modules

## Routing

The route tree lives in `src/app/routes/router.tsx` (TanStack Router). Every page is code-split with `React.lazy()` and wrapped in `ProtectedRoute` (+ a per-feature `FeatureErrorBoundary`). Guards check JWT permissions that mirror the backend's role catalog.

```
/login                          → Login form (public)
/forgot-password                → In-app temporary-password request (public)
/forbidden                      → Access denied (public)
/change-password                → Forced password change (authenticated)

— inside the authenticated AppShell —
/dashboard                      → Summary widgets                (loans.view)
/loans/create                   → Multi-step loan form           (loans.create)
/loans/queue                    → Review desk                    (loans.recommend | evaluate | approve)
/loans/monitoring               → Loan table (status/id/flagged  (loans.view)
                                   filters live in the URL)
/loans/approval/:loanId         → Loan approval page             (loans.view)
/loans/evaluation/:loanId       → Loan evaluation page           (loans.evaluate)
/loans/revision/:loanId         → Pushback response              (loans.revise)
/notifications                  → Notification inbox
/account                        → Profile, activity, sessions, security
/admin/users                    → User management                (users.manage)
/admin/loan-products            → Product catalog                (loan_product.manage)
/admin/branches                 → Branch registry                (branches.manage)
/admin/workflow                 → Workflow settings              (workflow.manage)

*                               → redirects to /login
```

The sidebar (`src/shared/lib/navigation.ts`) shows only the items the current user's permissions allow.

## Authentication and security

Access tokens live in Zustand (in-memory only) and are never written to localStorage or sessionStorage. The refresh token is the backend's HttpOnly, Secure, SameSite cookie (`alas_refresh`, scoped to `/api/auth`) that the browser sends automatically.

- **Silent restore** — on page load, `AuthInitProvider` calls `POST /api/auth/refresh` behind a "Restoring session…" gate so returning users don't see a login flash. The user session (id, name, branch, role, job title, permissions, `mustChangePassword`) is decoded from the JWT claims (`shared/lib/jwt.ts`).
- **401 handling** — the Axios interceptor queues concurrent failed requests behind a single in-flight refresh, then retries them all. If refresh fails, the session clears (dropping the SignalR connection) and the user lands on `/login`.
- **CSRF** — mutating requests (POST/PUT/PATCH/DELETE) attach `X-XSRF-TOKEN` read from the `XsrfToken` claim inside the access JWT (double-submit against the backend). A CSRF-flavored `403` triggers one silent refresh to mint a fresh claim, then retries the request once.
- **Must-change-password** — while the JWT carries `mustChangePassword`, `ProtectedRoute` redirects every route to `/change-password`; the app shell also skips background data sync until it's cleared.
- **Permission gating** — route guards check `requiredPermission` / `requiredAnyPermission` against the JWT's `permission` claims; unauthorized navigation lands on `/forbidden` (and logs a warning in dev).
- **Password policy** — the strength checklist requires 12+ characters, matching the backend; temporary passwords from admin import are shown once in a dialog.
- **Rich text** — Tiptap output is sanitized with DOMPurify before render/save.

## Realtime

A single shared SignalR connection (`shared/lib/signalr/connection.ts`) connects to `{VITE_API_BASE_URL}/hubs/notifications` with the access token, WebSockets only (`skipNegotiation`), and automatic reconnect at 0s / 2s / 10s / 30s. It is rebound when the token rotates and dropped on logout.

| Event | What the UI does |
|---|---|
| `ReceiveNotification` | Adds to the notification store + inbox query invalidation, toast, chime; if the tab is hidden, flashes 🔔 + title until focused |
| `DashboardUpdated` | Invalidates dashboard / monitoring queries |
| `LoanAssigned` | Refreshes approval-page and desk-queue state |
| `PresenceSnapshot` / `PresenceChanged` | Keeps the presence store and the header "online users" widget current |

Presence: the client posts `/api/presence/heartbeat` every 60 seconds while a session is active (the backend considers a user online for 5 minutes after the last beat).

## State management

Zustand handles client-only state: `auth-store` (token + decoded user + permission checks), `notification-store`, `presence-store`, `signalr-connection-store` (all in `src/shared/store`), plus the loans feature's `escalationStore`. None persist to storage — the app runs on shared branch terminals, so a reload always re-establishes state from a silent refresh.

TanStack Query manages all server state through a single root `QueryClient`, with centralized query keys (`shared/lib/query/queryKeys.ts`). Feature hooks in `src/features/*/hooks/` wrap queries and mutations around the typed API functions in `src/features/*/api/`.

## API contract

The backend returns **raw DTOs** — objects, arrays, and `PageResult<T>` pages (`{ items, totalCount, page, pageSize, totalPages }`) — and reports errors as **RFC 9457 `ProblemDetails`** (`{ title, status, detail }`).

On the frontend:

- `mapPageResult()` (`shared/lib/api/types.ts`) adapts backend pages to the UI's `PagedResult<T>` (adds `currentPage`, `hasPreviousPage`, `hasNextPage`)
- `getErrorMessage()` maps `ProblemDetails` / status codes to friendly copy (401, 403, 404, 409, 429, 5xx…)
- A legacy `ApiResponse<T>` envelope + `unwrapApiData()` helper still exists and is used by a few loan/webloan/group functions; new code should consume the raw shapes

In dev, requests go through Vite's `/api` proxy; in production they go directly to `VITE_API_BASE_URL`.

## Getting started

You need **Node.js 22.12+** (Vite 8 requires ≥ 20.19 / ≥ 22.12; Vitest 5 requires ≥ 22.12) and npm. The backend (`EBI_ALAS_V2_backend` → `src/Ebi.Alas.Api`) should be running on `https://localhost:7220`.

```bash
git clone https://github.com/jcmcjms/EBI_ALAS_Frontend.git
cd EBI_ALAS_Frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` (bound to all interfaces, so colleagues on the same network can reach it). Requests to `/api/*` are proxied to `https://localhost:7220` with self-signed certs accepted.

> **Note:** the SignalR hub connects to `VITE_API_BASE_URL` directly (not through the proxy), so set it in `.env` even in dev — see below.

For production:

```bash
npm run build       # type-checks (tsc -b) then bundles to dist/
npm run preview     # serves the build locally for smoke-testing
```

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR, React Compiler, and `/api` proxy |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (flat config, includes architecture import zones) |
| `npm run typecheck` | `tsc -b` only |
| `npm run architecture:check` | dependency-cruiser rules over `src/` |
| `npm run test` | Vitest (single run, jsdom) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run test:e2e` | Playwright (scaffolded — no e2e suite yet) |

## Environment variables

Create a `.env` in the project root. All client-side variables need the `VITE_` prefix.

```env
# Production: the API origin the browser talks to directly.
# Dev: REST calls go through the /api proxy, but this value is still used
# as the SignalR hub origin ({VITE_API_BASE_URL}/hubs/notifications).
VITE_API_BASE_URL=https://localhost:7220
```

## Theming

Tailwind CSS 4 is configured through `@tailwindcss/vite`, so there's no `tailwind.config.js`. Theme tokens (colors, spacing, radii) are CSS custom properties in `src/index.css`; the Geist variable font is imported there as well.

Dark mode toggles by adding/removing the `.dark` class on `<html>` (`@custom-variant dark`); the tokens redefine themselves inside that selector.

shadcn/ui components use the `base-lyra` style on Base UI with Phosphor icons (`components.json`), installed into `src/shared/ui/` and grouped by role (`data-display`, `feedback`, `forms`, `navigation`, `primitives`). The `cn()` utility in `src/shared/lib/utils.ts` combines `clsx` and `tailwind-merge` for conditional class composition.

## Testing

- **Unit/component**: Vitest + Testing Library + `jest-dom` + `user-event`, jsdom environment, globals on. 67 spec files live in `__tests__/` folders and colocated `*.spec.ts(x)` next to the code they cover (router paths, API modules, stores, hooks, layout, auth flow, workflow constants, table columns…).
- **Architecture**: `npm run architecture:check` asserts the layering rules described above.
- **E2E**: Playwright is installed with a `test:e2e` script, but no e2e suite/config has been written yet.

## Conventions

**Naming:** React components use kebab-case files with PascalCase exports (`app-sidebar.tsx` → `AppSidebar`). Hooks use `use-thing.ts`. Shared Zustand stores use `thing-store.ts`.

**Imports:** Use the `@/src/...` alias for everything under `src/` (the `@` alias resolves to the repo root). External packages first, then aliases, then relative paths.

**Commits:** Conventional Commits format: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:` — scoped by feature, e.g. `feat(loans): …`.

**Design docs:** delivered-feature specs, plans, and reports live under `docs/compose/`.

**AI-assisted changes:** keep diffs minimal and honest to the actual contracts in this repo; verify with `lint`, `typecheck`, `architecture:check`, and `test` before claiming done.

## Roadmap

- Playwright e2e suite (login → create → review → approve happy path) and CI pipeline (lint, typecheck, architecture, test, build)
- Reports sub-nav (Dashboard Summary, Transaction Summary, AO Performance, Realtime Transaction History)
- Storybook for the shared UI library
- Docker image for static hosting
- Retire the legacy `ApiResponse` envelope helpers in favor of raw DTO shapes everywhere

Done since the last README revision: live notification mutations, real React Query data across dashboard/monitoring, in-app forgot-password, branch admin, loan revision page, e-signature capture, session IP/device display, and broad unit-test coverage.

## License

Proprietary to Enterprise Bank Inc. All rights reserved. Unauthorized copying, modification, distribution, or use is prohibited.
