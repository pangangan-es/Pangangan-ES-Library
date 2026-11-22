# GitHub and Render deployment

This is the GitHub to Render path for the React/Vite application. The values below were checked against this repository's `package.json` (`"build": "tsc --noEmit && vite build"`) and Vite's default output folder. **No GitHub repository, Render service or Supabase project has been created yet**; this guide describes what to do. Complete [SETUP.md](SETUP.md) (Supabase, migrations, Edge Functions, first admin) before or alongside it.

## 1. Prepare the repository

- Create a GitHub repository and push the application source, Markdown documentation, and reviewed `supabase/migrations/` files.
- Add a `.gitignore` before pushing. Exclude `.env`, `.env.*` (while allowing `.env.example`), `node_modules/`, `dist/`, local editor state, credentials, and database exports.
- Run `npm install` locally once and commit the generated `package-lock.json` so Render can install reproducibly with `npm ci`. (The lockfile is not in the repository until this is done.)
- Commit the lockfile so Render can install reproducibly. Do not commit personal data, production database dumps, Supabase access tokens, or service-role keys.
- Keep `.env.example` limited to names and placeholder values, for example:

  ```dotenv
  VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
  VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-OR-PUBLISHABLE-KEY
  ```

  Use the variable names actually read by the application. These Vite values are bundled into public browser code. Never use a service-role key in a `VITE_` variable.

## 2. Create the Render site

In Render, create a **Static Site** connected to the GitHub repository and the chosen deployment branch. For a typical Vite project, configure:

- Build command: `npm ci && npm run build` once `package-lock.json` is committed. Until the lockfile exists, `npm ci` fails, so use `npm install && npm run build` for the first build (the included `render.yaml` handles both cases automatically).
- Publish directory: `dist`.
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public values only). Changing them requires a new deploy because Vite inlines them at build time.
- Node version: set `NODE_VERSION` to a current LTS (for example `22`) if Render's default differs from `package.json`'s `engines` (`>=18.18`).

Verify the package manager, build command, and generated output directory against the repository. Do not add production database migrations to the static site's build command.

## 3. Support client-side routes

Add a Render rewrite rule:

- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

This lets React Router serve routes such as `/books` or `/history` on direct navigation and page refresh. Confirm the behavior on the deployed URL.

## 4. Configure Supabase Auth

In the intended Supabase project, set the production Render URL (`https://panganganeslibrary.onrender.com`) as the Auth **Site URL** and add it to allowed redirect URLs. Invitation and recovery emails return to **`/auth/set-password`**, so allow exactly `https://panganganeslibrary.onrender.com/auth/set-password`. Also ensure the Edge Function secrets `SITE_URL` and `ALLOWED_ORIGINS` include `https://panganganeslibrary.onrender.com`, or invitations will link to the wrong place and the browser will be blocked by CORS. Make sure public sign-up is **disabled**. Add preview origins only if they are intentionally used, and keep the production origin explicitly listed. Configure email confirmation and password recovery redirects to the implemented routes on that origin. Never use wildcard redirects more broadly than required.

## 5. Apply database migrations

Review migrations in `supabase/migrations/`, then apply them to the intended Supabase project using the team's trusted Supabase workflow. Confirm the target project before applying changes. Keep schema migrations versioned in GitHub, but run them as an explicit controlled operation rather than a side effect of a Render frontend build. Deploy the two Edge Functions, then create the first administrator with `supabase/bootstrap/promote_first_admin.sql` as described in SETUP.md. None of this is part of the Render build.

## 6. Release checklist

- GitHub branch and Render deployment branch are the intended pair.
- Render build succeeds and serves the production assets.
- Root and nested routes load directly and survive refresh.
- Supabase Auth confirmation, recovery, login, logout, and redirect flows use the production origin.
- Anonymous visitors can browse only the public-safe catalog; RLS blocks access to borrower identities, profiles, loans, and returns.
- RLS enforces admin, librarian, and teacher permissions; no public sign-up or self-assignment of roles is possible.
- Checkout and return invariants hold under the database's atomic operations.
- No secrets appear in the repository, browser bundle, page output, or logs.
- Inventory, loans, dialogs, filters, and reports are usable on phone and desktop sizes.
- Print and CSV export work from the deployed site.
- `/auth/set-password` opens from a real invitation email and lets the invited person choose a password.
- Browser DevTools shows `staff-login` and `admin-users` requests succeeding (no CORS errors).

## Optional Render Blueprint

A `render.yaml` Blueprint is included at the repository root. It runs `npm ci` when a lockfile is present (else `npm install`) followed by `npm run build`, publishes `dist`, defines the `/*` to `/index.html` **rewrite**, adds basic security headers, and declares the two `VITE_` variables with `sync: false` so their values are entered in the dashboard rather than committed. Review it before use; if you configure the site manually in the dashboard instead, add the rewrite rule yourself (Redirects/Rewrites, source `/*`, destination `/index.html`, action Rewrite). The Blueprint has not been run against a real Render account.
