# Setup guide

This guide takes the repository from a fresh clone to a working local app connected to a Supabase project. Deployment to Render is covered in [DEPLOYMENT.md](DEPLOYMENT.md).

Nothing here has been done for you: no Supabase project, migrations, Edge Functions, or administrator account exist until an operator performs the steps below.

## Prerequisites

- Node.js 18.18 or newer (22 LTS recommended) and npm.
- A Supabase project (free tier is enough to start).
- The [Supabase CLI](https://supabase.com/docs/guides/cli) for migrations and Edge Functions (or the dashboard SQL editor for migrations).

## 1. Install and run the frontend

```bash
npm install          # creates package-lock.json on first run; commit it
cp .env.example .env # then fill in the two public values
npm run dev
```

`.env` needs only:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The **public** anon / publishable key |

Both are embedded in the browser bundle and are public by design. Never put a service-role/secret key, database password, or access token in any `VITE_` variable. The app refuses to start if it detects a service-role key.

Package scripts: `dev` (Vite dev server), `typecheck` (`tsc --noEmit`), `build` (typecheck then `vite build` to `dist/`), `preview` (serve the build).

## 2. Configure Supabase Auth

In the Supabase dashboard, **Authentication**:

1. **Sign In / Providers → Email**: keep email sign-in on. **Disable "Allow new users to sign up"** (public sign-up). The database also denies access to any Auth user without a staff profile, but sign-up should be off regardless.
2. **Password requirements**: set a minimum length of at least 10 (the app enforces 10 plus a letter and a number in its own form).
3. **URL Configuration**: set **Site URL** to your real app origin and add redirect URLs. For local work add `http://localhost:5173/**`; for production add the exact Render URL, e.g. `https://panganganeslibrary.onrender.com/auth/set-password`. Invitation and recovery emails return to `/auth/set-password`.
4. **SMTP**: Supabase's built-in email sender is heavily rate-limited and meant for testing. Configure a custom SMTP provider before inviting real staff.
5. Optionally customise the **Invite user** and **Reset password** email templates with the school name.

## 3. Apply the database migrations

Migrations in `supabase/migrations/` are applied in filename order:

| File | Purpose |
|---|---|
| `20261122000100_core_schema.sql` | Tables, constraints, role helpers, stock guard, append-only ledger triggers |
| `20261122000200_security_and_circulation.sql` | RLS, grants, public catalog view, atomic checkout/return functions, audit log, login throttle table |
| `20261122000300_seed_reference_data.sql` | Kindergarten and Grades 1 to 6, and a "Faculty" section |
| `20261122000400_linter_remediations.sql` | Linter fixes: security_invoker views, private schema helpers, revoked anon RPC access, explicit deny policies |
| `20261122000500_user_management_and_temporary_passwords.sql` | Password reset enforcement (`must_change_password`), librarian administrative access, `complete_password_change()`, and `update_my_profile()` |
| `seed_elementary_library.sql` | Idempotent seed script in `supabase/`: adds `is_sample` and `is_featured` columns, `announcements` & `library_settings` tables, 10 DepEd / Bohol categories, 15 Philippine elementary books, 3 bulletin announcements, and `clear_all_sample_data()` RPC |

Review them first. Then, targeting the correct project:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Alternatively paste each migration file, in order, into the dashboard SQL editor, followed by `supabase/seed_elementary_library.sql`. Confirm the target project before applying. Migrations are never run by the frontend build.

## 4. Deploy the Edge Functions

Two trusted server functions live in `supabase/functions/`:

- `staff-login` signs in by email **or username** server-side, with throttling, and returns only a session.
- `admin-users` creates (invites) staff, changes roles, deactivates accounts, resets temporary passwords, and sends password emails. It verifies on every call that the caller is an active administrator.

Set their secrets (the service-role key is injected by Supabase automatically; you never handle it):

```bash
supabase secrets set SITE_URL=https://panganganeslibrary.onrender.com
supabase secrets set ALLOWED_ORIGINS=https://panganganeslibrary.onrender.com,http://localhost:5173
supabase secrets set LOGIN_THROTTLE_PEPPER=$(openssl rand -hex 32)
```

`SITE_URL` is where invitation and reset links point; it is never taken from a request. `ALLOWED_ORIGINS` is the CORS allow-list.

Deploy:

```bash
supabase functions deploy staff-login --no-verify-jwt
supabase functions deploy admin-users --no-verify-jwt
```

If your project uses the newer non-JWT **publishable** keys, the platform's default JWT check rejects them; deploy both with `--no-verify-jwt`. This is safe here: `staff-login` is intentionally callable before sign-in, and `admin-users` validates the caller's token itself.

## 5. Create the first administrator

The app has no public sign-up and only admins can create accounts, so the first admin is provisioned by a trusted operator:

1. Dashboard, **Authentication, Users, Invite user**: enter the future administrator's real email. They choose their own password from the emailed link.
2. Open `supabase/bootstrap/promote_first_admin.sql`, replace the three placeholders (email, full name, username), and run it once in the dashboard SQL editor. It refuses to run if an active admin already exists.
3. The administrator signs in at `/login` and can create all other staff under **People and accounts**.

Do not commit the edited script.

## 6. Check it works

- `/catalog` loads without signing in and shows no borrower data.
- `/login` rejects bad credentials with a generic message, and signs in with email or username.
- As admin: add a category and a book, invite a librarian, add a grade and a section.
- As librarian: record a checkout, a partial return, then the remaining return; open the history, print it, and export the CSV.
- A teacher account sees only the catalog and the workspace page.

## Legacy data

The original prototype kept data in browser `localStorage` (`lib_books`, `lib_history`, `lib_staff`, `lib_sections`). Nothing reads or uploads that data automatically, and this release has **no import feature**. See "Legacy data" in [PRODUCT_SPEC.md](PRODUCT_SPEC.md).
