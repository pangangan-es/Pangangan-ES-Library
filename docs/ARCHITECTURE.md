# Architecture

## Structure

```text
src/
  app/              App.tsx: routes and role-based route groups
  components/       Layouts, buttons, form fields, dialog, toast, feedback states, responsive list
  features/
    auth/           AuthProvider, access map, RequireRole guard, sign-in/recovery service
    catalog/        Public catalog queries
    books/          Book service and add/edit dialog
    loans/          Checkout/return dialogs and RPC service
    history/        Filtered history queries, CSV building
    dashboard/      Dashboard queries
    settings/       Categories, grades, sections, staff accounts, borrowers
  hooks/            useAsync (stale-safe loading), useDebounced
  lib/              Supabase client, env validation, CSV, dates, errors, search sanitising, validation
  pages/            One route-level .tsx file per page
  types/            Domain types
supabase/
  migrations/       Versioned SQL: schema, RLS, functions, seed data
  functions/        staff-login, admin-users (Deno Edge Functions)
  bootstrap/        First-administrator script (placeholders only)
docs/
render.yaml         Optional Render Blueprint
```

Pages compose feature components and call feature services. Presentational components contain no Supabase calls. Private pages are code-split with `React.lazy`, so public visitors never download staff code.

## Data flow

Public catalog route → catalog service → typed Supabase client → a public-safe catalog view/policy. Staff route → authenticated feature hook/service → typed Supabase client → Postgres/Auth. Use RLS for every table and role-aware database policies. Public users must never receive borrower, loan, return, profile, or staff data. Use database transactions or narrowly scoped RPC functions for multi-row circulation operations and stock-sensitive checkout. Keep client state as a view/cache of server data, not as the source of truth.

## Authentication and username sign-in

Implemented as: the browser posts the identifier and password to the `staff-login` Edge Function, which resolves a username server-side, signs in, and returns only a session that the client installs with `setSession`. Emails are never returned to the browser. Account administration goes through the `admin-users` Edge Function. See [DATABASE.md](DATABASE.md). The general design notes follow.

There is no public registration. An administrator provisions staff accounts through a trusted invitation/password-setup flow and assigns `admin`, `librarian`, or `teacher`. Supabase Auth normally authenticates by email/password. If username login is enabled, use a trusted server-side lookup or narrowly scoped Edge Function/RPC to resolve a normalized username to the Auth email, then call the standard Auth sign-in flow. Protect that lookup against enumeration and abuse, return generic errors, and never make the profile table an unauthenticated email lookup API. Store a unique normalized username on a profile row linked to `auth.users`; enforce uniqueness in the database. Do not put passwords in profiles or custom tables.

The frontend may contain only the project URL and public/anon key. Enforce roles and access in RLS; a hidden button or route guard is only a user-experience aid. Anonymous visitors can browse the public-safe catalog. Librarians handle circulation. Admins manage accounts, roles, catalog, categories, grade levels, and sections. Teachers have read-only catalog access by default. Create the initial administrator through a documented trusted administrative process.

## UI state and motion

Represent loading, empty, error, and success states explicitly. Use semantic controls, accessible labels, keyboard-operable dialogs, and focus management. Use Framer Motion for short page/overlay transitions where it clarifies state; honor `prefers-reduced-motion` and avoid motion that delays staff workflows.

## Environment and operations

Provide `.env.example` with placeholder values for the Supabase URL and publishable/anon key. Validate required environment variables at startup and show a useful configuration error. Keep migrations in version control. Document local development, migration, seed/demo-data, and deployment procedures as they become real. Never invent credentials, claim a migration ran when it did not, or commit secrets.

## Hosting model

The target hosting path is GitHub → Render Static Site for the Vite frontend, with Supabase Auth/Postgres as the managed backend. A standard Vite production build publishes `dist`; verify this against the actual package scripts. Configure a Render rewrite to `/index.html` for React Router. The browser bundle is public, so only the Supabase URL and publishable/anon key may be exposed. Put any future privileged server-side operations in a trusted backend/Edge Function, never in the static frontend. Set Supabase production Site URL and allowed Auth redirect URLs to the actual Render origin. Keep production migrations explicit and separate from frontend builds.
