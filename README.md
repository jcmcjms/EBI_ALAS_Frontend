# EBI Template

> Enterprise Bank Inc (EBI) -- A modern React web application template for banking applications, built with cutting-edge frontend tooling and a production-ready architecture.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Available Scripts](#available-scripts)
- [UI Components](#ui-components)
- [Authentication Flow](#authentication-flow)
- [Routing](#routing)
- [Adding New Pages](#adding-new-pages)
- [Styling](#styling)
- [Environment Variables](#environment-variables)
- [Git Workflow](#git-workflow)
- [Roadmap](#roadmap)
- [License](#license)

---

## About

**EBI Template** is a front-end starter/scaffold for building modern banking web applications for [Enterprise Bank Inc](https://www.enterprisebank.ph/). It provides a fully functional authentication (login) flow as the foundation, with a clean architecture designed to scale as you add new features.

This is **not** a complete application -- it is a **template** meant to be extended with additional pages, features, and integrations.

### Current State

- **Implemented:** Login page with form validation, API integration, and auth state management
- **Planned:** Dashboard, account management, transactions, and other banking features

---

## Tech Stack

| Layer              | Technology                          | Version  |
| ------------------ | ----------------------------------- | -------- |
| **Framework**      | React                               | ^19.2.8  |
| **Language**       | TypeScript                          | ~6.0.2   |
| **Build Tool**     | Vite                                | ^8.2.0   |
| **Styling**        | Tailwind CSS                        | ^4.3.3   |
| **UI Components**  | shadcn/ui (Base UI variant)         | ^4.19.0  |
| **State**          | Zustand                             | ^5.0.15  |
| **Server State**   | TanStack React Query                | ^5.102.1 |
| **HTTP Client**    | Axios                               | ^1.19.0  |
| **Forms**          | React Hook Form + Zod               | ^7.86.0  |
| **Validation**     | Zod                                 | ^3.25.76 |
| **Routing**        | React Router DOM                    | ^7.18.2  |
| **Icons**          | Phosphor Icons                      | ^2.1.10  |
| **Font**           | Geist Variable                      | ^5.3.0   |

---

## Features

- **Modern React 19** with full TypeScript 6 support
- **Vite 8** dev server with instant HMR
- **Tailwind CSS v4** utility-first styling with CSS custom properties
- **shadcn/ui** component library using Base UI primitives (`@base-ui/react`)
- **Dark mode** support via CSS custom properties
- **Form validation** with React Hook Form + Zod schemas
- **Authentication flow** with access token stored in memory (XSS-safe)
- **Axios interceptor** for automatic Bearer token attachment
- **React Router v7** with lazy-loaded routes
- **Zustand** lightweight global state management
- **TanStack React Query** for server state and API caching
- **Responsive design** with mobile-first approach
- **Path aliases** (`@/` maps to `src/`)
- **ESLint** with TypeScript and React hooks rules

---

## Getting Started

### Prerequisites

- **Node.js** >= 18 (recommended: 20+)
- **npm** >= 9 (or yarn/pnpm)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ebi_template

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
# Type-check and build
npm run build

# Preview the production build locally
npm run preview
```

---

## Project Structure

```
ebi_template/
├── index.html                         # Vite entry HTML
├── package.json                       # Dependencies and scripts
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # Root TypeScript config
├── tsconfig.app.json                  # App TypeScript config
├── tsconfig.node.json                 # Node TypeScript config
├── eslint.config.js                   # ESLint flat config
├── components.json                    # shadcn/ui configuration
│
├── public/                            # Static assets (served as-is)
│   ├── enterprise_bank-logo.png       # Bank logo
│   ├── EBI_bg_login.png              # Login page background
│   ├── favicon.svg                    # SVG favicon
│   └── icons.svg                      # SVG icons
│
└── src/                               # Application source code
    ├── main.tsx                       # Entry point (React Query + StrictMode)
    ├── App.tsx                        # Root component (BrowserRouter + lazy routes)
    ├── App.css                        # App-level styles
    ├── index.css                      # Global styles (Tailwind, theme, dark mode)
    │
    ├── assets/                        # Static assets imported into code
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    │
    ├── components/                    # Reusable UI components
    │   ├── login-form.tsx             # Login form component
    │   └── ui/                        # shadcn/ui primitive components
    │       ├── button.tsx             # Button with CVA variants
    │       ├── field.tsx              # Field/FieldGroup/FieldLabel
    │       ├── input.tsx              # Input (wraps @base-ui/react)
    │       ├── label.tsx              # Label component
    │       ├── separator.tsx          # Separator/divider
    │       └── spinner.tsx            # Loading spinner
    │
    ├── hooks/                         # Custom React hooks
    │   └── auth.ts                    # useLogin() mutation hook
    │
    ├── lib/                           # Utilities and API client
    │   ├── apiClient.ts              # Axios instance with auth interceptor
    │   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
    │
    ├── pages/                         # Route-level page components
    │   └── auth/
    │       └── login.tsx              # Login page (split layout)
    │
    └── store/                         # Zustand state stores
        └── authStore.ts              # Auth state (access token)
```

---

## Architecture

### Design Principles

- **Feature-based organization**: Pages, hooks, and stores are grouped by feature
- **Separation of concerns**: UI components (`components/`), business logic (`hooks/`), state (`store/`), and utilities (`lib/`) are clearly separated
- **Component composition**: shadcn/ui primitives in `components/ui/` are composed into feature components
- **Security-conscious**: Auth tokens stored in memory via Zustand (not `localStorage`), preventing XSS theft
- **Lazy-loaded routes**: Pages are loaded on-demand for optimal bundle size

### Data Flow

```
User Action
    │
    ▼
Page Component (src/pages/)
    │
    ├── Form Handling ──► React Hook Form + Zod validation
    │
    ├── API Calls ──► Custom Hook (src/hooks/)
    │                     │
    │                     ▼
    │                 Axios Client (src/lib/apiClient.ts)
    │                     │
    │                     ▼
    │                 Backend API (/api/...)
    │
    └── State Updates ──► Zustand Store (src/store/)
                              │
                              ▼
                         React Re-render
```

### Component Hierarchy

```
<main.tsx>
  └── QueryClientProvider (React Query)
      └── App.tsx
          └── BrowserRouter (React Router)
              └── Routes
                  └── /login ──► LoginPage
                                   ├── Logo + Branding
                                   ├── LoginForm
                                   │    ├── Input (username)
                                   │    ├── Input (password)
                                   │    ├── Button (submit)
                                   │    └── Error/Loading states
                                   └── Background Image
```

---

## Configuration

### Vite (`vite.config.ts`)

- **Plugins**: `@vitejs/plugin-react` (Oxc-based), `@tailwindcss/vite`
- **Path alias**: `@` resolves to `./src`

### TypeScript

- **Target**: ES2023
- **Module**: ESNext with bundler resolution
- **Strict mode** enabled
- **Path alias**: `@/*` maps to `./src/*`

### ESLint (`eslint.config.js`)

- Flat config format (ESLint v9+)
- TypeScript-ESLint recommended rules
- React Hooks linting rules
- React Refresh linting rules

### shadcn/ui (`components.json`)

- **Style**: base-lyra
- **Base color**: neutral
- **CSS variables**: enabled
- **Icons**: Phosphor Icons
- **Path aliases**: `@/components`, `@/lib/utils`

---

## Available Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start Vite dev server with HMR                   |
| `npm run build`   | Type-check with `tsc` then build for production   |
| `npm run lint`    | Run ESLint across the project                     |
| `npm run preview` | Preview the production build locally              |

---

## UI Components

The project uses a **shadcn/ui (Base UI variant)** component system. Components are built on `@base-ui/react` headless primitives, styled with Tailwind CSS, and use `class-variance-authority` (CVA) for variant management.

### Available Components

| Component   | File                              | Description                          |
| ----------- | --------------------------------- | ------------------------------------ |
| `Button`    | `src/components/ui/button.tsx`    | CVA-powered button with variants     |
| `Input`     | `src/components/ui/input.tsx`     | Text input wrapping Base UI          |
| `Field`     | `src/components/ui/field.tsx`     | Field, FieldGroup, FieldLabel, etc.  |
| `Label`     | `src/components/ui/label.tsx`     | Form field label                     |
| `Separator` | `src/components/ui/separator.tsx` | Visual divider                       |
| `Spinner`   | `src/components/ui/spinner.tsx`   | Loading indicator (Phosphor icon)    |

### Adding New Components

```bash
# Using the shadcn/ui CLI
npx shadcn@latest add <component-name>
```

Or manually create a new file in `src/components/ui/` following the existing patterns.

---

## Authentication Flow

The authentication system is already implemented and follows security best practices:

### Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Login Form  │────►│  useLogin()  │────►│  Axios Client    │────►│  Backend API │
│  (Zod valid) │     │  (React      │     │  (Bearer token   │     │  /api/auth/  │
│              │     │   Query)     │     │   interceptor)   │     │   login      │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Zustand     │
                    │  Auth Store  │
                    │  (in-memory) │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Redirect to │
                    │  /dashboard  │
                    └──────────────┘
```

### Key Details

- **Validation**: Username (3-50 chars, alphanumeric + underscores), Password (8-100 chars)
- **Token Storage**: Access token stored in Zustand (memory only, not `localStorage`)
- **Axios Interceptor**: Automatically attaches `Authorization: Bearer <token>` to all requests
- **Route Protection**: Unauthenticated users are redirected to `/login`

---

## Routing

Built with **React Router DOM v7** with lazy-loaded routes for code splitting:

| Path        | Component    | Description                 |
| ----------- | ------------ | --------------------------- |
| `/login`    | `LoginPage`  | Authentication login page   |
| `*`         | Redirects to | `/login` (catch-all)        |
| `/dashboard`| _Not yet_    | _Implemented (planned)_     |

Routes are defined in `src/App.tsx` using `React.lazy()` for automatic code splitting.

---

## Adding New Pages

### Step 1: Create the page component

```tsx
// src/pages/dashboard/index.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your dashboard content */}
    </div>
  );
}
```

### Step 2: Add the route in App.tsx

```tsx
import { lazy } from "react";

const DashboardPage = lazy(() => import("./pages/dashboard"));

// Inside <Routes>:
<Route path="/dashboard" element={<DashboardPage />} />
```

### Step 3: Update the login redirect (if needed)

In `src/hooks/auth.ts`, the `onSuccess` callback redirects to `/dashboard`:

```tsx
onSuccess: () => {
  navigate("/dashboard");
},
```

---

## Styling

### Tailwind CSS v4

The project uses **Tailwind CSS v4** with the Vite plugin. Configuration is handled via:

- `src/index.css` -- Global styles, CSS custom properties, dark mode definitions
- `@tailwindcss/vite` plugin in `vite.config.ts`

### Dark Mode

Dark mode is implemented via CSS custom properties in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  /* ... */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

Toggle dark mode by adding/removing the `dark` class on the `<html>` element.

### Adding Tailwind Utilities

The `cn()` utility in `src/lib/utils.ts` combines `clsx` and `tailwind-merge` for safe class merging:

```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-classes", conditional && "conditional-classes", "override-classes")} />
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# API base URL (used in src/lib/apiClient.ts)
VITE_API_BASE_URL=http://localhost:3000
```

Environment variables must be prefixed with `VITE_` to be exposed to the client bundle.

---

## Git Workflow

The project uses a clean commit history:

```bash
080e872 feat: add authentication flow with login form and routing
4e5c245 refactor: move UI components and utils into src/ directory
016c6ec feat: add login page with UI components and project config
e9a65a4 first commit
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` -- New feature
- `fix:` -- Bug fix
- `refactor:` -- Code restructure (no feature change)
- `chore:` -- Maintenance tasks
- `docs:` -- Documentation changes
- `style:` -- Formatting, missing semicolons, etc.
- `test:` -- Adding or updating tests

---

## Roadmap

- [ ] Dashboard page with account overview
- [ ] Protected route wrapper (auth guard)
- [ ] User profile and settings page
- [ ] Account management features
- [ ] Transaction history and transfers
- [ ] API integration with real backend
- [ ] Unit and integration tests
- [ ] CI/CD pipeline setup
- [ ] Docker configuration
- [ ] Storybook for component documentation

---

## License

This project is proprietary to Enterprise Bank Inc. All rights reserved.

---

> Built with modern React tooling for fast development and production-ready performance.
