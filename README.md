# Pangangan Elementary School Library Management

A responsive web application for the library of Pangangan Elementary School, Lomboy, Calape, Bohol. It manages the book catalog, loans, returns, borrowers, staff accounts and circulation history.

- **Public visitors** can search the catalog and see safe availability counts, with no account.
- **Staff** sign in to record loans and returns and to use reports.
- **There is no public registration.** An administrator invites staff and assigns one role: `admin`, `librarian` or `teacher`.

## Status

The application code, database migrations, Edge Functions and documentation are written. **Nothing has been deployed or configured yet:** no Supabase project, migrations, Edge Functions, administrator, GitHub repository or Render service exists until an operator creates them. Follow [docs/SETUP.md](docs/SETUP.md), then [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Stack

React, TypeScript (strict), Vite, Tailwind CSS, React Router, Framer Motion, Supabase Auth and PostgreSQL with Row Level Security, and two Supabase Edge Functions for trusted account operations.

## Quick start

```bash
npm install
cp .env.example .env   # fill in the public Supabase URL and anon/publishable key
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |

The database must be set up first. See [docs/SETUP.md](docs/SETUP.md) for the Supabase configuration, migrations, Edge Functions and first-administrator steps.

## Routes

| Route | Access |
|---|---|
| `/`, `/catalog` | Public catalog |
| `/login` | Staff sign in (email or username) and password recovery |
| `/auth/set-password` | Landing page for invitation and recovery emails (needs a valid emailed link) |
| `/staff` | Any active staff role; content adapts to the role |
| `/staff/loans`, `/staff/history` | Librarian and admin |
| `/admin/books`, `/admin/categories`, `/admin/academic-structure`, `/admin/people` | Admin |

Route guards only shape the interface. Access is enforced by Row Level Security and trusted database functions.

## Roles

| | Public | Teacher | Librarian | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse catalog and availability | Yes | Yes | Yes | Yes |
| Record loans and returns | | | Yes | Yes |
| View borrowers, loans, history; print and export | | | Yes | Yes |
| Manage books, categories, announcements | | | Yes | Yes |
| Manage grades and sections | | | | Yes |
| Invite staff, change roles, deactivate accounts | | | | Yes |

Teachers and students can be recorded as **borrowers** without having an account.

## Project layout

```text
src/            React application (pages, components, features, lib)
supabase/
  migrations/   Versioned SQL: schema, RLS, functions, seed data
  functions/    staff-login and admin-users Edge Functions
  bootstrap/    One-time first-administrator script (placeholders only)
docs/           Setup, product, architecture, schema, UI and deployment docs
legacy-prototype/  The original static prototype, kept as reference only
public/         Static assets (school logo)
render.yaml     Optional Render Blueprint for the static site
```

## Documentation

- [Setup](docs/SETUP.md)
- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database and security](docs/DATABASE.md)
- [UI and accessibility](docs/UI_UX.md)
- [GitHub and Render deployment](docs/DEPLOYMENT.md)
- [Implementation prompt](docs/IMPLEMENTATION_PROMPT.md) (provider-neutral)

## Security notes

- Only the Supabase project URL and the public anon/publishable key belong in the browser. The service-role key lives only in Supabase's Edge Function environment.
- Never commit `.env` files, credentials, database exports or user data. `.gitignore` excludes them.
- Production migrations are a deliberate, reviewed operation, never part of the Render build.

## Branding

The official library logo is `public/pangangan_es_library_hub_logo.svg` (with corresponding PWA icons and Open Graph share card in `public/`). Its use has been confirmed for Pangangan Elementary School. The former reference school's logo and identity are not used anywhere in the application.
