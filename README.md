# EBI ALAS — Automated Loan Approval System (Frontend)

> **Enterprise Bank Inc — Automated Loan Approval System (ALAS)**
> Production-grade React 19 single-page application for the bank’s loan origination, evaluation, monitoring, and administration workflows.

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React_Router-7.18-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-443E38)](https://zustand-demo.pmnd.rs/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Base_UI-000000)](https://ui.shadcn.com/)

---

## Table of Contents

- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Application Modules](#application-modules)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Authentication & Security](#authentication--security)
- [Routing & Authorization](#routing--authorization)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [UI Component Library](#ui-component-library)
- [State Management](#state-management)
- [API Contract](#api-contract)
- [Theming & Styling](#theming--styling)
- [Conventions](#conventions)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**EBI ALAS Frontend** is the web client for the **Automated Loan Approval System (ALAS)** of [Enterprise Bank Inc.](https://www.enterprisebank.ph/) — a long-running internal platform for processing, evaluating, and monitoring consumer loan applications across the bank’s branch network.

The app is a single-page application that talks to the **EBI.ALAS.Api** backend (ASP.NET Core) and the legacy **WebLoan** core banking interface for borrower profile lookups. It implements the full front-office workflow:

- CIS (Customer Information System) lookup against WebLoan
- Loan application entry with multi-section form (personal info, loan params, obligations, deviations, verification)
- Approval/recommendation flow with permission gating
- Real-time loan monitoring dashboards and queue views
- Administration of users, roles/permissions, and loan products
- Branch-scoped notifications and account profile

This is a **production frontend**, not a template. All listed modules are implemented and wired to live API endpoints.

---

## Key Capabilities

| Capability                          | Description                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| 🔐 Secure auth                      | Access token in memory (Zustand) + HttpOnly refresh cookie + silent refresh on boot               |
| 🛡 Permission-gated routes          | `<ProtectedRoute requiredPermission=…>` mirrors backend `[Authorize(Policy=…)]` policies          |
| 🔄 Auto token refresh               | Axios interceptor queues concurrent 401s behind a single refresh, then retries the original call  |
| 🧾 XSRF protection                  | Reads `XSRF-TOKEN` cookie and attaches `X-XSRF-TOKEN` on every mutating request                   |
| 🧭 Sidebar + top bar shell          | Single `AppShell` component wraps every authenticated page; consistent layout everywhere          |
| 👤 User & role admin                | Full CRUD with drawers, role matrix, and activation/suspension flows                             |
| 💼 Loan product admin               | Manage the catalog of loan products (term, rate, product code, etc.)                             |
| 📋 Loan creation wizard             | Multi-section form: CIS lookup → personal info → loan params → obligations → deviations → verify |
| 📊 Loan monitoring & dashboards     | Live summary cards, weekly trends, queues, approved loans, push-back, and now-serving widgets     |
| 🔔 Notifications center             | Branch-scoped feed with mark-read and approve/decline actions                                    |
| 🧱 Reusable UI library              | 25+ shadcn/ui (Base UI) primitives + custom `Field`, `Spinner`, `Sidebar`                        |
| 🌗 Dark mode                        | CSS custom properties + `.dark` class toggle on `<html>`                                         |
| 📱 Responsive layout                | Mobile-first; sidebar collapses on small screens, grid layouts adapt                             |
| 📄 PDF export                       | `html2canvas-pro` + `jspdf` for downloadable approval/preview documents                           |
| 📈 Data tables & charts             | `@tanstack/react-table` for admin tables, `recharts` for trends                                  |
| 📅 Date pickers                     | `react-day-picker` integrated with `date-fns`                                                     |
| 🧰 Drag & drop                      | `@dnd-kit/core` + sortable for future re-orderable lists                                         |
| 🍞 Toast notifications              | `sonner` rich toaster wired at the root                                                          |
| ⚠️ Global error boundary            | `<ErrorBoundary>` wraps the entire app to surface render-time failures                           |

---

## Application Modules

| Module                  | Path                       | Permission(s) required            | Description                                                                                   |
| ----------------------- | -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| **Login**               | `/login`                   | —                                  | Username + password, Zod-validated, on success stores session and redirects to `/dashboard`   |
| **Change Password**     | `/change-password`         | Authenticated                     | Forced when `user.mustChangePassword === true`; intercepts all other routes until completed  |
| **Dashboard**           | `/dashboard`               | Authenticated                     | Summary cards, weekly trend, pending queue, approved loans, now-serving, push-back widgets   |
| **Loan Monitoring**     | `/loans/monitoring`        | `loans.view` (implicit)            | Searchable/filterable monitoring table with detail drawer                                     |
| **Loan Creation**       | `/loans/create`            | `loans.create`                     | Multi-section form with CIS lookup, validation, preview, and PDF export                       |
| **Notifications**       | `/notifications`           | Authenticated                     | Inbox of branch-scoped events; mark-read and resolve pending actions                          |
| **Account**             | `/account`                 | Authenticated                     | Profile, branch info, session controls                                                        |
| **Users (admin)**       | `/admin/users`             | `user.view`                        | Paginated user table; create/edit drawers, suspend/activate via confirm action sheet         |
| **Roles (admin)**       | `/admin/roles`             | `role.view`                        | Static role → permissions matrix                                                             |
| **Loan Products (admin)** | `/admin/loan-products`   | `loan_product.manage`              | CRUD catalog of loan products; product form + table                                           |
| **403 Forbidden**       | `/forbidden`               | —                                  | Friendly error page for users blocked by `requiredPermission`                                 |
| **Catch-all**           | `*`                        | —                                  | Redirects to `/login`                                                                         |

---

## Tech Stack

### Runtime

| Layer                | Technology                                | Version    |
| -------------------- | ----------------------------------------- | ---------- |
| Framework            | React                                     | ^19.2.8    |
| Language             | TypeScript                                | ~6.0.2     |
| Build tool           | Vite                                      | ^8.2.0     |
| Routing              | React Router DOM                          | ^7.18.2    |
| Server state         | TanStack React Query                      | ^5.102.1   |
| Client state         | Zustand                                   | ^5.0.15    |
| HTTP client          | Axios                                     | ^1.19.0    |
| Forms                | React Hook Form                           | ^7.86.0    |
| Validation           | Zod + `@hookform/resolvers`               | ^3.25.76   |
| UI primitives        | shadcn/ui (Base UI variant, `@base-ui/react`) | ^1.7.0 |
| Styling              | Tailwind CSS                              | ^4.3.3     |
| Icons                | Phosphor Icons (`@phosphor-icons/react`)  | ^2.1.10    |
| Font                 | Geist Variable (`@fontsource-variable/geist`) | ^5.3.0 |
| Data tables          | TanStack Table                            | ^9.1.2     |
| Charts               | Recharts                                  | ^3.8.0     |
| Date picker          | `react-day-picker` + `date-fns`           | ^10.0.1 / ^4.4.0 |
| Toasts               | Sonner                                    | ^2.0.8     |
| Theme                | `next-themes`                             | ^0.4.6     |
| Drag & drop          | `@dnd-kit/core` / `sortable` / `modifiers`| ^6/10/9    |
| PDF export           | `html2canvas-pro` + `jspdf`               | ^2.4.0 / ^4.2.1 |
| Tailwind animations  | `tw-animate-css`                          | ^1.4.0     |
| Class utilities      | `clsx`, `tailwind-merge`, `class-variance-authority` | — |

### Build & Quality

| Tool                | Version    |
| ------------------- | ---------- |
| `@vitejs/plugin-react` | ^6.0.4 |
| `eslint`               | ^10.8.0 |
| `typescript-eslint`    | ^8.65.0 |
| `eslint-plugin-react-hooks` | ^7.1.1 |
| `eslint-plugin-react-refresh` | ^0.5.3 |
| `@types/node`          | ^24.13.3 |
| `@types/react`         | ^19.2.17 |
| `@types/react-dom`     | ^19.2.3 |

---

## Architecture

### High-Level Component Tree

```
<main.tsx>
└── <StrictMode>
    └── <ErrorBoundary>
        └── <QueryClientProvider>             ← React Query
            └── <AuthInitProvider>            ← silent refresh-token bootstrap
                └── <Toaster /> (sonner)
                    └── <App>
                        └── <BrowserRouter>
                            └── <Suspense>   ← lazy route fallback (Spinner)
                                └── <Routes>
                                    ├── /login                  → <Login>
                                    ├── /change-password        → <ProtectedRoute>
                                    ├── /forbidden              → <Forbidden>
                                    ├── /dashboard              → <ProtectedRoute>
                                    ├── /loans/monitoring       → <ProtectedRoute>
                                    ├── /loans/create           → <ProtectedRoute>
                                    ├── /notifications          → <ProtectedRoute>
                                    ├── /account                → <ProtectedRoute>
                                    ├── /admin/users            → <ProtectedRoute requiredPermission="user.view">
                                    ├── /admin/roles            → <ProtectedRoute requiredPermission="role.view">
                                    ├── /admin/loan-products    → <ProtectedRoute requiredPermission="loan_product.manage">
                                    └── *                       → <Navigate to="/login">
```

### Authenticated Page Layout

Every page rendered behind `<ProtectedRoute>` follows the same chrome:

```
<AppShell>
├── <AppSidebar>     ← nav (sidebar)
├── <SidebarInset>
│   ├── <SiteHeader> ← page title + user menu
│   └── <main>       ← page content
```

### Data Flow

```
Page / Form
   │
   ├─ React Hook Form + Zod ──► client-side validation
   │
   ├─ TanStack Query mutation / query ──► API endpoint
   │           │
   │           ▼
   │       <apiClient> (Axios)
   │           │
   │           ├─ request interceptor:
   │           │     • attach Authorization: Bearer <accessToken>
   │           │     • attach X-XSRF-TOKEN on POST/PUT/PATCH/DELETE
   │           │
   │           └─ response interceptor:
   │                 • on 401 → queue behind single refresh, then retry
   │                 • on refresh fail → clearSession + redirect /login
   │
   └─ on success ──► Zustand (auth/notification) ──► re-render
```

### Design Principles

- **Feature-based organization** — `pages/{feature}/`, `hooks/use-{feature}.ts`, `lib/api/{feature}.ts`, `store/{feature}Store.ts`
- **Separation of concerns** — UI (`components/`), business logic (`hooks/`), state (`store/`), and utilities (`lib/`) are decoupled
- **Composition over inheritance** — shadcn/ui primitives in `components/ui/` are composed into feature components
- **Lazy-loaded routes** — every page is dynamically imported, producing per-route chunks
- **Security first** — tokens in memory, CSRF headers on mutations, permission checks mirrored from backend
- **Strict TypeScript** — strict mode on, no `any` in feature code, types mirror backend DTOs in `lib/api/types.ts`

---

## Authentication & Security

### Token Strategy

| Token          | Storage                                  | Lifetime    | Purpose                                  |
| -------------- | ---------------------------------------- | ----------- | ---------------------------------------- |
| `accessToken`  | **Zustand (in-memory only)**             | Short (~15m) | Sent as `Authorization: Bearer …`       |
| `refreshToken` | **HttpOnly, Secure, SameSite cookie**    | Long (~7d)  | Sent automatically by browser on `/api/auth/refresh` |

- Access tokens are **never** written to `localStorage` or `sessionStorage` — this prevents XSS theft.
- Refresh cookies are **HttpOnly** — JavaScript cannot read them — so the SPA must hit `POST /api/auth/refresh` and let the browser attach the cookie.

### Silent Bootstrap (`useAuthInit`)

On every page load, `<AuthInitProvider>` runs `useAuthInit()` which calls `POST /api/auth/refresh`. A full-screen spinner is shown until the response settles, preventing the “flash of login page” for users with a still-valid refresh cookie. The hook decodes the returned JWT via `extractUserFromToken()` and calls `setSession(token, user)`.

### 401 Refresh & Retry

`apiClient`’s response interceptor:

1. On 401, if a refresh is already in flight, the failed request is **queued**.
2. Otherwise it marks the request `_retry`, flips `isRefreshing`, and calls `POST /api/auth/refresh`.
3. On success: stores the new access token, replays the queue, and retries the original request with the fresh token.
4. On failure: clears the session and redirects to `/login`.

This pattern is race-safe — N concurrent 401s produce exactly one refresh call.

### CSRF Protection

Mutating requests (`POST` / `PUT` / `PATCH` / `DELETE`) automatically read the `XSRF-TOKEN` cookie and attach it as `X-XSRF-TOKEN`. The backend is expected to issue the cookie and validate the header.

### Forced Password Change

When the backend sets `user.mustChangePassword = true` in the JWT, `<ProtectedRoute>` redirects every route except `/change-password` to the change-password page. The flag is cleared after a successful change.

### Validation Rules (Login)

```ts
username: 3–50 chars
password: 8–100 chars
```

---

## Routing & Authorization

Routes are declared in `src/App.tsx` and code-split via `React.lazy()`. Authorization is enforced by `<ProtectedRoute>`, which accepts an optional `requiredPermission`:

```tsx
<Route
  path="/admin/users"
  element={
    <ProtectedRoute requiredPermission={PERMISSIONS.userView}>
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

Permission constants are defined in `src/lib/api/types.ts` and mirror the backend’s `Common/Constants/Permissions.cs`:

```ts
PERMISSIONS = {
  loansCreate, loansView, loansRecommend, loansEvaluate,
  loansApprove, loansReject,
  loanProductManage, loanProductView,
  userCreate, userView, userEdit, userSuspend,
  roleManage, roleView,
} as const
```

`useAuthStore.hasPermission(...)` returns `true` if the user’s permission list contains `*` (super admin) or every required permission.

---

## Project Structure

```
ebi_alas_frontend/
├── index.html                              # Vite entry
├── package.json                            # Dependencies & scripts
├── vite.config.ts                          # Vite + Tailwind + /api proxy → https://localhost:7220
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js                        # ESLint flat config (v9+)
├── components.json                         # shadcn/ui (base-lyra style, neutral base, phosphor icons)
│
├── public/                                 # Static assets served as-is
│   ├── enterprise_bank-logo.png
│   ├── EBI_bg_login.png
│   ├── favicon.svg
│   └── icons.svg
│
└── src/
    ├── main.tsx                            # Root: StrictMode → ErrorBoundary → QueryClient → AuthInit → App + Toaster
    ├── App.tsx                             # Router + lazy routes
    ├── index.css                           # Tailwind, theme tokens, dark mode
    │
    ├── assets/                             # Imported-from-code assets
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    │
    ├── components/
    │   ├── auth/
    │   │   ├── Gate.tsx
    │   │   └── ProtectedRoute.tsx          # Auth + permission guard
    │   │
    │   ├── layout/
    │   │   ├── AppShell.tsx                # Sidebar + header + main shell
    │   │   ├── app-sidebar.tsx
    │   │   ├── nav-main.tsx
    │   │   ├── nav-user.tsx
    │   │   └── site-header.tsx
    │   │
    │   ├── system/
    │   │   ├── AuthInitProvider.tsx        # Silent session bootstrap
    │   │   └── ErrorBoundary.tsx
    │   │
    │   └── ui/                             # shadcn/ui (Base UI) primitives
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── drawer.tsx
    │       ├── dropdown-menu.tsx
    │       ├── field.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── popover.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── sonner.tsx
    │       ├── spinner.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toggle.tsx
    │       ├── toggle-group.tsx
    │       └── tooltip.tsx
    │
    ├── hooks/
    │   ├── auth.ts                         # Legacy login mutation
    │   ├── useAuthInit.ts                  # Silent refresh on boot
    │   ├── use-dashboard.ts                # Dashboard data hook
    │   ├── useDashboardData.ts             # Legacy alias
    │   ├── useAccount.ts
    │   ├── use-loan-monitoring.ts
    │   ├── use-loan-products.ts
    │   ├── use-mobile.ts                   # useMediaQuery('(max-width: …)')
    │   ├── use-roles.ts
    │   └── use-users.ts
    │
    ├── lib/
    │   ├── apiClient.ts                    # Axios + auth/CSRF/refresh interceptors + getErrorMessage
    │   ├── jwt.ts                          # extractUserFromToken — decode JWT payload into UserSession
    │   ├── navigation.ts                   # Single source of truth for the nav tree
    │   ├── notifications.ts                # Notification model + dummy data
    │   ├── pdf.ts                          # PDF export helpers
    │   ├── utils.ts                        # cn() (clsx + tailwind-merge)
    │   └── api/
    │       ├── account.ts                  # /api/account/* calls
    │       ├── roles.ts                    # /api/roles + /api/roles/matrix
    │       ├── types.ts                    # All DTOs mirroring backend + PERMISSIONS + branch lists
    │       ├── users.ts                    # /api/users CRUD
    │       └── webloans.ts                 # /api/webloans/* (CIS lookup, active loans)
    │
    ├── pages/
    │   ├── dashboard.tsx                   # Dashboard export
    │   ├── dashboard/
    │   │   ├── types.ts
    │   │   ├── data/dummy-data.ts
    │   │   └── components/
    │   │       ├── approved-loans.tsx
    │   │       ├── dashboard-summary.tsx
    │   │       ├── now-serving.tsx
    │   │       ├── pending-queue.tsx
    │   │       ├── push-back.tsx
    │   │       └── weekly-trend.tsx
    │   │
    │   ├── account/
    │   │   ├── account.tsx
    │   │   └── index.tsx
    │   │
    │   ├── admin/
    │   │   ├── loan-products/
    │   │   │   ├── index.tsx
    │   │   │   ├── loan-products-page.tsx
    │   │   │   ├── types.ts
    │   │   │   └── components/
    │   │   │       ├── product-form.tsx
    │   │   │       └── products-table.tsx
    │   │   ├── roles/
    │   │   │   ├── index.tsx
    │   │   │   └── role-matrix.tsx
    │   │   └── users/
    │   │       ├── index.tsx
    │   │       ├── users-data-table.tsx
    │   │       └── components/
    │   │           ├── confirm-action-sheet.tsx
    │   │           ├── user-create-drawer.tsx
    │   │           └── user-edit-drawer.tsx
    │   │
    │   ├── auth/
    │   │   ├── login.tsx
    │   │   ├── login-form.tsx
    │   │   └── change-password.tsx
    │   │
    │   ├── errors/
    │   │   └── Forbidden.tsx
    │   │
    │   ├── loans/
    │   │   ├── create/
    │   │   │   ├── index.tsx
    │   │   │   ├── loan-creation.tsx
    │   │   │   ├── schema.ts
    │   │   │   └── components/
    │   │   │       ├── active-loans-table.tsx
    │   │   │       ├── application-details.tsx
    │   │   │       ├── approval-form-preview.tsx
    │   │   │       ├── cis-lookup.tsx
    │   │   │       ├── deviations-section.tsx
    │   │   │       ├── loan-parameters-section.tsx
    │   │   │       ├── obligations-section.tsx
    │   │   │       ├── other-obligations.tsx
    │   │   │       ├── personal-info-section.tsx
    │   │   │       ├── personal-info.tsx
    │   │   │       └── verification-section.tsx
    │   │   └── monitoring/
    │   │       ├── index.tsx
    │   │       ├── loan-monitoring.tsx
    │   │       ├── types.ts
    │   │       ├── data/dummy-data.ts
    │   │       └── components/
    │   │           ├── loan-details-drawer.tsx
    │   │           ├── monitoring-table.tsx
    │   │           └── monitoring-toolbar.tsx
    │   │
    │   └── notifications/
    │       ├── index.tsx
    │       └── notifications.tsx
    │
    └── store/
        ├── authStore.ts                    # accessToken + user + hasPermission
        └── notificationStore.ts            # notifications + markRead/resolveNotification
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (Vite 8 + TypeScript 6 require modern Node)
- **npm** ≥ 10 (or pnpm / yarn)
- The **EBI.ALAS.Api** backend running on `https://localhost:7220` (default for Vite proxy) or set `VITE_API_BASE_URL` to your own

### Install & Run

```bash
# 1. Clone
git clone <repository-url>
cd ebi_alas_frontend

# 2. Install
npm install

# 3. Start dev server (Vite + HMR)
npm run dev
# → http://localhost:5173
```

During development, Vite proxies `/api/*` → `https://localhost:7220` (see `vite.config.ts`). Self-signed certs are accepted (`secure: false`).

### Production Build

```bash
# Type-check then build
npm run build

# Preview the built bundle
npm run preview
```

The output is emitted to `dist/`. Deploy it to any static host (nginx, Azure Static Web Apps, S3+CloudFront, etc.) and set `VITE_API_BASE_URL` to the public API origin.

---

## Available Scripts

| Command           | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `npm run dev`     | Start Vite dev server with HMR and `/api` proxy              |
| `npm run build`   | `tsc -b` (type-check) then `vite build` for production       |
| `npm run preview` | Serve the production build locally for smoke-testing         |
| `npm run lint`    | Run ESLint over the project                                  |

---

## Configuration

### Vite (`vite.config.ts`)

- **Plugins:** `@tailwindcss/vite`, `@vitejs/plugin-react`
- **Alias:** `@` → project root (so `@/src/...` resolves to `src/...`)
- **Dev proxy:** `/api` → `https://localhost:7220` (override in your local clone as needed)

### TypeScript

- **Target:** ES2023
- **Module resolution:** bundler
- **Strict mode:** on
- **Path alias:** `@/*` maps to project root (configured in all three `tsconfig*.json` files)

### ESLint

Flat config (`eslint.config.js`) with:
- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

### shadcn/ui (`components.json`)

| Setting       | Value                  |
| ------------- | ---------------------- |
| Style         | `base-lyra`            |
| Base color    | `neutral`              |
| CSS variables | enabled                |
| Icon library  | `phosphor`             |
| RSC           | false (Vite SPA)       |
| Aliases       | components → `@/components`, ui → `@/src/components/ui`, utils → `@/src/lib/utils`, lib → `@/lib`, hooks → `@/hooks` |

Add primitives with:

```bash
npx shadcn@latest add <component-name>
```

---

## Environment Variables

Create a `.env` (or `.env.local`) in the project root. All variables must be prefixed with `VITE_` to be exposed to the client bundle.

```env
# Used in production builds only (dev uses the /api proxy in vite.config.ts).
# In dev: requests go to /api/* and are proxied to https://localhost:7220.
# In prod: requests go directly to this base URL.
VITE_API_BASE_URL=https://api.ebi-alas.example.com
```

---

## UI Component Library

The project uses **shadcn/ui (Base UI variant)** — headless primitives from `@base-ui/react`, styled with Tailwind CSS, and variant-managed with `class-variance-authority`.

| Component         | File                              | Notes                                  |
| ----------------- | --------------------------------- | -------------------------------------- |
| `Avatar`          | `ui/avatar.tsx`                   |                                        |
| `Badge`           | `ui/badge.tsx`                    | CVA variants                           |
| `Button`          | `ui/button.tsx`                   | CVA variants                           |
| `Calendar`        | `ui/calendar.tsx`                 | Built on `react-day-picker`            |
| `Card`            | `ui/card.tsx`                     |                                        |
| `Chart`           | `ui/chart.tsx`                    | Recharts wrapper with theming          |
| `Checkbox`        | `ui/checkbox.tsx`                 | Base UI                                |
| `Drawer`          | `ui/drawer.tsx`                   | `vaul`-style sheet                     |
| `DropdownMenu`    | `ui/dropdown-menu.tsx`            | Base UI                                |
| `Field` / `FieldGroup` / `FieldLabel` | `ui/field.tsx`     | Composable form field primitives       |
| `Input`           | `ui/input.tsx`                    | Base UI                                |
| `Label`           | `ui/label.tsx`                    | Base UI                                |
| `Popover`         | `ui/popover.tsx`                  | Base UI                                |
| `Select`          | `ui/select.tsx`                   | Base UI                                |
| `Separator`       | `ui/separator.tsx`                | Base UI                                |
| `Sheet`           | `ui/sheet.tsx`                    | Base UI                                |
| `Sidebar`         | `ui/sidebar.tsx`                  | Used by `AppShell`                     |
| `Skeleton`        | `ui/skeleton.tsx`                 |                                        |
| `Sonner`          | `ui/sonner.tsx`                   | Wraps `sonner`                         |
| `Spinner`         | `ui/spinner.tsx`                  | Phosphor `CircleNotch`                 |
| `Table`           | `ui/table.tsx`                    |                                        |
| `Tabs`            | `ui/tabs.tsx`                     | Base UI                                |
| `Textarea`        | `ui/textarea.tsx`                 | Base UI                                |
| `Toggle`          | `ui/toggle.tsx`                   | Base UI                                |
| `ToggleGroup`     | `ui/toggle-group.tsx`             | Base UI                                |
| `Tooltip`         | `ui/tooltip.tsx`                  | Base UI                                |

---

## State Management

### Zustand Stores

- **`useAuthStore`** — `accessToken`, `user`, `setSession`, `clearSession`, `hasPermission`
- **`useNotificationStore`** — branch-scoped notifications, `markRead`, `markAllRead`, `resolveNotification`

Both stores are in-memory only. They intentionally do not persist to `localStorage` because the app is intended for shared branch terminals and shared devices.

### TanStack React Query

A single `QueryClient` is provided at the root (`src/main.tsx`). Feature hooks in `src/hooks/` (e.g. `use-users.ts`, `use-roles.ts`, `use-loan-monitoring.ts`) wrap React Query mutations/queries and call the typed functions in `src/lib/api/`.

### Persistent Server Cache

The `QueryClient` is created with default options (no persistence). If you need cache across page reloads, add `@tanstack/react-query-persistclient` plus a storage adapter.

---

## API Contract

All endpoints are expected to follow the backend’s `ApiResponse<T>` envelope:

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
  timestamp: string;
}
```

`unwrapApiData(body)` throws on `success === false` and otherwise returns `data`.

### Backend (EBI.ALAS.Api — ASP.NET Core)

| Endpoint                                | Description                              |
| --------------------------------------- | ---------------------------------------- |
| `POST /api/auth/login`                  | Username + password → access token        |
| `POST /api/auth/refresh`                | HttpOnly cookie → fresh access token     |
| `POST /api/auth/change-password`        | Update password (clears `mustChangePassword`) |
| `GET  /api/account/me`                  | Current user profile                     |
| `GET  /api/users`                       | Paginated + filterable users             |
| `POST /api/users`                       | Create user                              |
| `PUT  /api/users/{id}`                  | Update user                              |
| `PATCH /api/users/{id}/status`          | Activate / suspend                       |
| `GET  /api/roles`                       | Role list                                |
| `GET  /api/roles/matrix`                | Role → permissions matrix                |
| `GET  /api/branches`                    | Branch list                              |
| `GET  /api/loan-products`               | Loan product catalog                     |
| `POST /api/loan-products`               | Create product                           |
| `PUT  /api/loan-products/{id}`          | Update product                           |
| `DELETE /api/loan-products/{id}`        | Delete product                           |
| `GET  /api/webloans/cis/{cisNo}`        | Full borrower profile (WebLoan)          |
| `GET  /api/webloans/cis/{cisNo}/accounts/{accountNo}/active-loans` | Recent loans for a CIS+account |

DTOs are mirrored in `src/lib/api/types.ts` (with file-header comments pointing to the corresponding backend source file).

### Permission Constants

```ts
PERMISSIONS.loansCreate        // "loans.create"
PERMISSIONS.loansView          // "loans.view"
PERMISSIONS.loansRecommend     // "loans.recommend"
PERMISSIONS.loansEvaluate      // "loans.evaluate"
PERMISSIONS.loansApprove       // "loans.approve"
PERMISSIONS.loansReject        // "loans.reject"
PERMISSIONS.loanProductManage  // "loan_product.manage"
PERMISSIONS.loanProductView    // "loan_product.view"
PERMISSIONS.userCreate         // "user.create"
PERMISSIONS.userView           // "user.view"
PERMISSIONS.userEdit           // "user.edit"
PERMISSIONS.userSuspend        // "user.suspend"
PERMISSIONS.roleManage         // "role.manage"
PERMISSIONS.roleView           // "role.view"
```

### Branch Lists

`lib/api/types.ts` exports two static branch snapshots:

- **`BRANCHES`** — used by user/role admin (mirrors `Features/Branches`).
- **`WEBLOAN_BRANCHES`** — used by loan creation CIS lookup (mirrors `dbo.branch_set` in the WebLoan DB). If a new branch is added on the WebLoan side, mirror it here or expose it via the API.

---

## Theming & Styling

### Tailwind CSS v4

- Configured via `@tailwindcss/vite` — no `tailwind.config.js` required.
- Theme tokens (colors, spacing, radii) live as CSS custom properties in `src/index.css`.

### Dark Mode

Toggle by adding/removing `.dark` on `<html>`. The color tokens in `index.css` redefine themselves inside the `.dark` selector.

```tsx
document.documentElement.classList.toggle("dark");
```

### `cn()` Utility

`src/lib/utils.ts` exposes `cn()` which combines `clsx` + `tailwind-merge` — safe for conditional classes with proper override ordering.

```tsx
<div className={cn("p-4 rounded", isActive && "bg-primary text-primary-foreground", className)} />
```

---

## Conventions

### File & Folder Naming

| Thing              | Convention                                 | Example                                  |
| ------------------ | ------------------------------------------ | ---------------------------------------- |
| React components   | kebab-case file, PascalCase export         | `app-sidebar.tsx` → `AppSidebar`         |
| Page components    | kebab-case                                 | `change-password.tsx`                    |
| Hooks              | `use-thing.ts` (kebab-case)                | `use-loan-monitoring.ts`                 |
| Stores             | `thingStore.ts` (camelCase + `Store`)      | `authStore.ts`                           |
| API modules        | `thing.ts` in `lib/api/`                   | `lib/api/users.ts`                       |
| Feature folders    | camelCase (or hyphenated domain names)     | `pages/loans/create/`                    |

### Imports

- Use the `@/src/...` alias for everything under `src/`. The Vite/TS alias `@` points to the project root, so `@/src/components/ui/button` is the canonical path.
- Sort imports: external packages first, then internal aliases, then relative paths.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructure (no feature change)
- `chore:` — maintenance / tooling
- `docs:` — documentation only
- `style:` — formatting, no logic change
- `test:` — add or update tests

---

## Roadmap

- [ ] Wire `notificationStore` to live API mutations
- [ ] Replace dummy data in `pages/dashboard/data/` and `pages/loans/monitoring/data/` with real React Query hooks
- [ ] Implement the **Reports** sub-nav (Dashboard Summary, Transaction Summary, AO Performance, Realtime Transaction History)
- [ ] Storybook for the shared `components/ui/` library
- [ ] Unit + integration tests (Vitest + Testing Library)
- [ ] CI/CD pipeline (lint → typecheck → test → build)
- [ ] Docker image for static hosting
- [ ] Optional `@tanstack/react-query-persistclient` for cross-reload cache
- [ ] SIEM hook in `ProtectedRoute` for unauthorized-access auditing (placeholder already present)

---

## License

This project is **proprietary** to Enterprise Bank Inc. All rights reserved.  
Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

---

<p align="center">
  Built for <strong>Enterprise Bank Inc.</strong> — ALAS (Automated Loan Approval System)<br/>
  React 19 · TypeScript 6 · Vite 8 · Tailwind 4 · shadcn/ui (Base UI)
</p>
