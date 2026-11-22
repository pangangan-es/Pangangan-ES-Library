# Data model and security

This describes the schema as implemented in `supabase/migrations/`. Migrations are applied by an operator, never by the frontend build. See [SETUP.md](SETUP.md).

## Principles

- Row Level Security is enabled on **every** table. Privileges are revoked from `anon` and `authenticated` first, then granted minimally; RLS narrows rows further.
- Passwords exist only in Supabase Auth (`auth.users`). No application table stores or copies them.
- Availability is **derived** (`total_copies` minus outstanding loan quantity). There is no editable "available" column.
- History is never rewritten. Loans and returns carry text snapshots of book, borrower, class and staff names, and referenced records are deactivated or archived rather than deleted (`ON DELETE RESTRICT`).

## Tables

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | Staff login accounts | `id` = `auth.users.id`; `full_name`, `username`, `username_normalized` (unique, lowercase, pattern-checked), `email`, `role` (`admin`/`librarian`/`teacher`), `is_active`, `must_change_password` |
| `categories` | Book categories | Unique normalized name; `is_active` |
| `grade_levels` | Kindergarten, Grade 1 to 6, etc. | Unique normalized name; `sort_order`; `is_active` |
| `sections` | Class sections | Optional `grade_level_id`; unique within a grade; `is_active` |
| `books` | Catalog | Title, author, optional ISBN/category/shelf/description, `total_copies >= 0`, `is_archived`, `is_sample`, `is_featured`. Duplicate title and author blocked among non-archived books |
| `announcements` | Library bulletin & events | Title, content, optional event date, badge label, `is_active`, `is_sample` |
| `library_settings` | Operational settings | Key-value JSON store for operating hours, quarter reading challenge goals |
| `borrowers` | Optional borrower directory | Not login accounts. Name, type (`student`/`teacher`/`other`), grade, section, `is_active` |
| `loans` | One row per checkout | Quantity, `borrowed_at`, `issued_by`, plus snapshots (`book_title`, `borrower_name`, `grade_level_name`, `section_name`, `issued_by_name`) |
| `return_transactions` | One row per (partial or full) return | Quantity, `returned_at`, `received_by`, `received_by_name` |
| `audit_log` | Admin and account actions | Actor, action, table, row, small detail; readable by admins only |
| `login_attempts` | Throttling for `staff-login` | Hashed identifier/IP only; no client access at all |

The earlier proposal for a separate `staff_members` table was not needed: staff are `profiles`, and loans/returns reference them with name snapshots.

`loans` and `return_transactions` are **append-only**: triggers reject `UPDATE` and `DELETE`. A mistake is corrected by recording another transaction, which keeps a trustworthy audit trail. (The prototype's "delete history record" feature is intentionally not carried over.)

## Views

| View | Access | Purpose |
|---|---|---|
| `public_catalog` | anon, authenticated | Whitelisted columns of non-archived books plus `available_copies` (`security_invoker = true`). Exposes no borrower, loan or staff data |
| `public_categories` | anon, authenticated | Active categories that have at least one catalog book (`security_invoker = true`) |
| `loan_history` | authenticated, `security_invoker` | Loans joined to return totals, status and a JSON list of return transactions. RLS on `loans`/`return_transactions` applies, so non-circulation roles get no rows |
| `book_inventory` | authenticated, `security_invoker` | Admin inventory with `on_loan` and `has_history`, including archived books |

## Access matrix (enforced in the database)

| Data | anon | teacher | librarian | admin |
|---|---|---|---|---|
| `public_catalog`, `public_categories` | read | read | read | read |
| `announcements`, `library_settings` | read (active) | read | full | full |
| `books` (base table) | none | none | full | full |
| `categories` | read | read | full | full |
| `grade_levels`, `sections` | none | none | read | full |
| `borrowers` | none | none | read | read, update |
| `loans`, `return_transactions`, `loan_history` | none | none | read | read |
| `profiles` | none | own row | own row | all rows (read) |
| `audit_log` | none | none | none | read |
| Writes to loans/returns | none | none | via RPC only | via RPC only |
| Writes to `profiles` | none | none | none | via Edge Function only |

Roles are read from `profiles` by `current_role_name()`, which requires `is_active`. Both `admin` and `librarian` roles pass `private.is_admin()` checks for managing catalog inventory, categories, announcements, and operational settings. A deactivated account, or an Auth user with no profile, therefore has no access even with a valid session. No client policy permits inserting or updating `profiles`, so nobody can assign themselves a role.

## Atomic operations (SECURITY DEFINER, `search_path = ''`)

- `checkout_book(...)` re-checks the caller's role, validates quantity, borrower, grade and section, **locks the book row** (`FOR UPDATE`), derives outstanding copies and refuses to exceed stock. Concurrent checkouts of the same book queue on that lock. It stamps staff identity from `auth.uid()`, not from client input, and may find-or-create a directory borrower.
- `return_copies(loan_id, quantity)` locks the loan row, sums prior returns and refuses to exceed the remaining quantity. A partly returned loan stays open.
- `guard_book_total_copies` (trigger) refuses lowering `total_copies` below copies on loan, and archiving a book that has copies out.
- `dashboard_stats()`, `staff_directory()` (names/roles only, no emails) and `update_own_name()` each re-check permission.
- `complete_password_change()` sets `must_change_password = false` after a staff member securely updates their password upon first sign-in.
- `update_my_profile(p_full_name)` allows an authenticated user to update their own full name on their account page with validation.
- `clear_all_sample_data()` administrative RPC that safely wipes only sample records (`is_sample = true`), preserving permanent categories and real staff-cataloged books.

`EXECUTE` is revoked from `PUBLIC`/`anon` on every function and granted only to `authenticated` where needed.

## Dashboard counting rules

- **Book titles / total copies**: non-archived books.
- **Copies on loan**: sum over all loans of quantity borrowed minus quantity returned.
- **Open loans**: loans with at least one copy not yet returned.
- **Checkouts / returns today**: rows created since local midnight in `Asia/Manila`.
- **Most borrowed**: all-time, by copies lent (books) and by number of loans (borrowers, grouped by recorded name).

There are no due dates in this release, so there is no "overdue" figure.

## Username sign-in

`staff-login` (Edge Function) accepts an email or a username and a password. For a username it looks up the email with the service-role key **server-side**, signs in, and returns only a session. The browser never receives an email for a username, so there is no email directory. All failures return the same generic response, unknown usernames do comparable work, and failed attempts are rate limited per identifier and per IP using hashed keys in `login_attempts`.

## Account provisioning

`admin-users` (Edge Function) re-verifies on every call that the caller is an active admin. It invites by email (the person sets their own password), creates the matching profile (rolling back the Auth user if that fails), changes roles, activates/deactivates (also banning in Auth), and sends password emails. Admins cannot change their own role or deactivate themselves, which guarantees at least one active admin always remains. The first admin is promoted with `supabase/bootstrap/promote_first_admin.sql`.

## Review checklist for operators

- `supabase db push` (or the SQL editor) targets the intended project.
- In the dashboard, confirm RLS shows as enabled on all ten tables.
- Test as anon: `public_catalog` works; `loans`, `profiles`, `borrowers`, `loan_history` return nothing or permission errors.
- Test as a teacher: `loan_history` returns zero rows.
- The service-role key appears nowhere in the repository or the Render environment.

## GitHub and Render boundaries

Commit migrations and non-secret docs only. Never commit access tokens, database passwords, the service-role key, production data, or a populated `.env`. Render needs only the public URL and anon/publishable key at build time.
