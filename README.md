# EBI ALAS — Automated Loan Approval System (Frontend)

The web client for Enterprise Bank Inc's loan origination, evaluation, and monitoring platform. Every feature listed below is wired to live API endpoints.

---

## What it does

ALAS handles the full lifecycle of a consumer loan application at the branch level:

- **CIS lookup**: pull borrower profiles and active loans from the legacy WebLoan system
- **Loan creation**: multi-step form covering personal info, loan parameters, obligations, deviations, and verification
- **Review desk**: queue-based workflow where recommenders, evaluators, and approvers work through pending loans
- **Approval and evaluation**: dedicated pages for each step in the approval chain, with permission gating
- **Monitoring**: searchable loan table with detail drawers, summary cards, weekly trends, and queue widgets
- **Admin**: user management (create, edit, suspend, roles), loan product catalog, workflow settings, and audit logs
- **Notifications**: branch-scoped inbox with real-time updates via SignalR

## Tech stack

| Layer | What we use |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| UI components | shadcn/ui (Base UI variant) |
| Styling | Tailwind CSS 4 |
| Icons | Phosphor Icons |
| Data tables | TanStack Table |
| Charts | Recharts |
| Rich text | Tiptap |
| Realtime | SignalR |
| PDF export | html2canvas-pro + jsPDF |
| Testing | Vitest + Testing Library |

## How it's organized

Feature-first. Each feature owns its pages, components, hooks, API calls, schemas, store, and types. Shared UI primitives and utilities live in `src/shared`. App-level wiring (layout shell, error boundaries, providers) lives in `src/app`.

```
src/
├── app/                        # App-level wiring
│   ├── layout/                 #   AppShell, sidebar, header
│   └── system/                 #   ErrorBoundary, AuthInitProvider, FeatureErrorBoundary
│
├── features/
│   ├── account/                # User profile and session controls
│   ├── admin/
│   │   ├── loan-products/      # CRUD loan product catalog
│   │   ├── users/              # User table, create/edit drawers, role management
│   │   └── workflow/           # Approval workflow configuration
│   ├── audit-logs/             # System audit trail viewer
│   ├── auth/                   # Login, change password, ProtectedRoute, auth store
│   ├── dashboard/              # Summary cards, trends, queues, now-serving
│   ├── loans/
│   │   ├── pages/
│   │   │   ├── approval/       # Loan approval page
│   │   │   ├── create/         # Multi-step loan creation form
│   │   │   ├── evaluation/     # Loan evaluation page
│   │   │   ├── monitoring/     # Loan monitoring table
│   │   │   ├── queue/          # Review desk (recommend/evaluate/approve queue)
│   │   │   └── review/         # Group review components
│   │   ├── api/                # Loan API calls
│   │   ├── components/         # Shared loan components
│   │   ├── hooks/              # Loan-specific hooks
│   │   ├── schemas/            # Zod schemas
│   │   ├── store/              # Escalation store
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Computations, status helpers, timeline
│   └── notifications/          # Inbox with SignalR realtime, presence tracking
│
├── shared/
│   ├── components/             # Reusable non-UI components
│   ├── hooks/                  # Shared hooks
│   ├── lib/                    # API client, JWT utils, types, query client, utils
│   └── ui/                     # shadcn/ui primitives (button, card, table, toast, etc.)
│
├── App.tsx                     # Router and route definitions
├── main.tsx                    # Root: StrictMode → ErrorBoundary → QueryClient → AuthInit → App
└── index.css                   # Tailwind config, theme tokens, dark mode
```

## Authentication and security

Access tokens live in Zustand (in-memory only) and are never written to localStorage or sessionStorage. Refresh tokens are HttpOnly, Secure, SameSite cookies that the browser sends automatically.

On page load, `AuthInitProvider` silently calls `POST /api/auth/refresh` so returning users don't see a login flash. The Axios interceptor handles 401s by queuing concurrent requests behind a single refresh call, then retrying them all. If refresh fails, the session clears and the user lands on `/login`.

Mutating requests (POST, PUT, PATCH, DELETE) automatically attach the `X-XSRF-TOKEN` header read from a cookie. The backend issues and validates it.

When the backend sets `mustChangePassword` in the JWT, `ProtectedRoute` redirects every route to the change-password page until it's cleared.

## Routing

Routes are declared in `src/App.tsx` and code-split with `React.lazy()`. Each protected route specifies a `requiredPermission` (or `requiredAnyPermission`) that mirrors the backend's authorization policies.

```
/login                          → Login form
/change-password                → Forced password change (authenticated)
/dashboard                      → Summary widgets
/loans/monitoring               → Loan monitoring table
/loans/create                   → Multi-step loan form
/loans/queue                    → Review desk (recommend/evaluate/approve)
/loans/approval/:loanId         → Individual loan approval
/loans/evaluation/:loanId       → Individual loan evaluation
/notifications                  → Notification inbox
/account                        → User profile
/admin/users                    → User management
/admin/loan-products            → Loan product catalog
/admin/audit-logs               → Audit trail
/admin/workflow                 → Workflow settings
/forbidden                      → Access denied page
```

## Getting started

You need Node.js 20+ and npm 10+. The backend (`EBI.ALAS.Api`) should be running on `https://localhost:7220` or you can set `VITE_API_BASE_URL` to point elsewhere.

```bash
git clone <repository-url>
cd ebi_alas_frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`. Requests to `/api/*` are proxied to the backend (self-signed certs accepted).

For production:

```bash
npm run build       # type-checks then bundles to dist/
npm run preview     # serves the build locally for smoke-testing
```

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR and `/api` proxy |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch mode) |

## Environment variables

Create a `.env` in the project root. All client-side variables need the `VITE_` prefix.

```env
# In dev, requests go through the /api proxy. In production, they go here directly.
VITE_API_BASE_URL=https://api.ebi-alas.example.com
```

## Theming

Tailwind CSS 4 is configured through `@tailwindcss/vite`, so there's no `tailwind.config.js`. Theme tokens (colors, spacing, radii) are CSS custom properties in `src/index.css`.

Dark mode toggles by adding/removing the `.dark` class on `<html>`. The tokens redefine themselves inside that selector.

The `cn()` utility in `src/shared/lib/utils.ts` combines `clsx` and `tailwind-merge` for conditional class composition.

## State management

Zustand handles client-only state: auth session (`authStore`), notifications (`notificationStore`), presence tracking (`presenceStore`), and escalation (`escalationStore`). None of these persist to localStorage since the app runs on shared branch terminals.

TanStack Query manages all server state. A single `QueryClient` is provided at the root. Feature hooks in `src/features/*/hooks/` wrap mutations and queries against the typed API functions in `src/features/*/api/` and `src/shared/lib/`.

## API contract

The backend returns responses in this shape:

```ts
interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  errors: string[]
  timestamp: string
}
```

`unwrapApiData()` throws on `success === false` and returns `data` otherwise.

## Conventions

**Naming:** React components use kebab-case files with PascalCase exports (`app-sidebar.tsx` → `AppSidebar`). Hooks use `use-thing.ts`. Stores use `thingStore.ts`.

**Imports:** Use the `@/src/...` alias for everything under `src/`. External packages first, then aliases, then relative paths.

**Commits:** Conventional Commits format: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`.

**Architecture rules:** See `AGENTS.md` and `.ai/rules/` for the full engineering contract that governs how code should be structured in this repo.

## Roadmap

- Wire notification store to live API mutations
- Replace dummy data in dashboard and monitoring with real React Query hooks
- Reports sub-nav (Dashboard Summary, Transaction Summary, AO Performance, Realtime Transaction History)
- Storybook for the shared UI library
- Unit and integration tests across all features
- CI/CD pipeline (lint, typecheck, test, build)
- Docker image for static hosting

## License

Proprietary to Enterprise Bank Inc. All rights reserved. Unauthorized copying, modification, distribution, or use is prohibited.