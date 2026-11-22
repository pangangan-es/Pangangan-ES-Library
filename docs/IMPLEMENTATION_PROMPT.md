# Master implementation prompt

Copy the prompt below into a coding assistant after opening this repository in VS Code. It is provider-neutral and can be used with any capable coding model.

---

You are responsible for building the Pangangan Elementary School Library Management web application in this repository, from the current prototype through implementation and deployment preparation. The school is at Lomboy, Calape, Bohol.

## 1. Inspect and plan

Before editing, inspect the repository, `AGENTS.md`, `README.md`, and all Markdown in `docs/`. Review the existing static HTML, JavaScript, CSS, and assets. The prototype features book inventory, active loans, partial/full returns, staff and grade/section lists, borrowing summaries, history filters, print reports, and CSV export; it stores data in `localStorage`.

Preserve useful library workflows, but replace the old school identity, browser-only data model, insecure hardcoded password, inline event handlers, and unsafe HTML string rendering. The current `images/ferminlogo.png` belongs to the former reference identity; do not use it as Pangangan Elementary School branding unless approved. Work in coherent stages, keep docs current, and inspect your changes before moving on.

## 2. Product access rules

This is the school's library catalog and circulation system. **Anyone can open the site and browse the public catalog without an account.** Public visitors may search and view public book information and safe aggregate availability. They must not see borrower identities, active loans, returns, staff/account records, private reports, or settings.

There is no public registration page and no self-service account creation. Staff login is for authorized library work. Admins create/invite accounts and assign roles. Distinguish application accounts from borrower records: students and teachers can be borrowers without having login accounts.

Implement these roles and default permissions:

- **Admin:** manage staff accounts, activate/deactivate users, assign roles, manage books and categories, manage grade levels and sections, and access circulation features.
- **Librarian:** record checkouts and returns, view/search active loans and circulation history, print/export permitted reports. Do not let librarians assign roles or manage admin-only settings by default.
- **Teacher:** read-only public catalog access by default. A teacher can be recorded as a borrower without an account. Do not expose identifiable loan records to teacher accounts unless requirements are explicitly changed.
- **Public/anonymous:** browse only the public catalog and safe aggregate availability; no circulation actions or personal data.

Use least privilege. Enforce these permissions in Supabase Row Level Security (RLS) and trusted database functions, not only with hidden buttons or frontend route guards. Do not allow anyone to assign themselves a role. Do not introduce public registration.

## 3. Technology and structure

Use React, TypeScript, Vite, Tailwind CSS, React Router, Supabase Auth/Postgres, and Framer Motion. Use a separate `.tsx` module for every route-level page. Keep shared components, domain logic, validation, and Supabase access in reusable modules. Use strict TypeScript and accessible semantic markup.

Build public pages for the catalog and sign-in. Build role-protected staff pages for circulation, history, and admin management. Suggested route groups:

- `/` or `/catalog` — public searchable catalog and safe availability.
- `/login` — staff login with email or username plus password and recovery flow.
- `/staff` — authenticated workspace that adapts to role.
- `/staff/loans` and `/staff/history` — librarian/admin circulation pages.
- `/admin/books`, `/admin/categories`, `/admin/academic-structure`, `/admin/people` — admin-only management pages.

Adapt route names if the existing project structure calls for it, but keep public routes public and enforce private permissions at the database layer.

## 4. Authentication and accounts

Use Supabase Auth for credentials. Staff account data includes full name, email, username, password managed only by Auth, role (`admin`, `librarian`, or `teacher`), and account status. Never store plaintext passwords or duplicate them in app tables. Admin account creation should use a trusted invitation or password setup/reset flow, not an admin choosing and retaining another person's password.

The login form accepts email address or username plus password. If username sign-in is implemented, resolve username to email through a narrowly scoped trusted server-side function/Edge Function or equivalent. Normalize and uniquely constrain usernames; do not expose an unauthenticated email directory; use generic errors and abuse controls. Never expose a Supabase service-role key in client code. Document and implement a secure initial-admin provisioning process.

## 5. Library features and data rules

Create and manage books with title, author, optional ISBN/category/shelf location/description, total copies, and timestamps. Categories are admin-managed. Public catalog reads expose only approved catalog fields and aggregate availability.

Record borrowers separately from app accounts. A loan captures borrower name/type, grade level, section, book, quantity, issuing staff member, and timestamp. Record every return as its own transaction with quantity, receiving staff member, and timestamp. Preserve partial-return history. Keep historical snapshots if book names, grade/section labels, or staff names change.

Validate positive quantities and enforce that checkout cannot exceed available stock and returns cannot exceed the outstanding quantity, including simultaneous requests. Use atomic database transactions or carefully secured RPC functions. Derive availability from copy totals and outstanding loans; do not maintain conflicting editable totals. Avoid destructive deletion of referenced books or academic records; prefer archive/deactivate behavior.

Include searchable inventory, active loans, circulation history, borrower/staff/date/status filters, dashboard metrics, a print-friendly report, and CSV export with proper escaping. Restrict personal circulation data and exports to librarian/admin roles. Add CRUD for staff accounts, roles, books, categories, grade levels, and sections, restricted to admins according to policy.

## 6. Database and security

Create versioned SQL migrations under `supabase/migrations/`. Include appropriate tables for profiles, books, categories, grade levels, sections, loans, return transactions, and optional borrower records. Enable RLS on every application table. Provide public read access only through a safe catalog view or narrowly scoped policy; anonymous users must have no access to profile, staff, borrower, loan, or return data. Enforce admin/librarian/teacher permissions in RLS and RPC functions. Review security-definer functions, set a safe `search_path`, and grant only required execution rights.

Never put the service-role key in Vite variables or browser bundles. The frontend may use only the Supabase URL and public publishable/anon key. Do not put production database migrations in the Render frontend build command. Document migration application as a deliberate, reviewed operation targeting the correct Supabase project.

## 7. UI and accessibility

Create a polished, calm, contemporary interface appropriate for Pangangan Elementary School's library. Use the correct school name and address where branding is shown. Do not use the former school's logo unless approved. Make all pages responsive on mobile, tablet, and desktop. Use responsive navigation, touch-friendly controls, usable mobile lists/cards, clear statuses, loading/empty/error/success states, validation, visible focus, keyboard-operable dialogs, sufficient contrast, and useful confirmation for destructive actions.

Use Framer Motion for restrained, purposeful transitions and respect `prefers-reduced-motion`. Avoid generic dashboard clutter, emoji iconography, excessive gradients/shadows, hover-only controls, or motion that slows circulation work.

## 8. GitHub and Render deployment preparation

Keep the project ready for GitHub and Render Static Site deployment. Add `.gitignore` rules for real environment files, dependencies, build artifacts, local secrets, and database exports. Add `.env.example` with placeholders only. Keep a lockfile committed.

Verify actual package scripts before documenting Render settings. A typical Vite build uses `npm run build` and publishes `dist`. Document a Render rewrite from `/*` to `/index.html` with Rewrite action for React Router. Configure only public Supabase URL and publishable/anon key in Render client environment variables; Vite-prefixed values are public. Configure Supabase Auth Site URL and allowed confirmation/recovery redirects for the real Render URL. Do not claim a GitHub repository, Supabase project, migrations, or Render deployment exists unless it actually does.

## 9. Migration and documentation

Do not silently upload old `localStorage` values (`lib_books`, `lib_history`, `lib_staff`, `lib_sections`). If implementing an import, make it an explicit admin-only operation with validation, preview, duplicate handling, and confirmation. Preserve partial returns and report dates that cannot be reliably parsed.

Update Markdown documentation as implementation proceeds: project setup, product requirements, architecture, schema/RLS, UI, and GitHub-to-Render deployment. Keep the docs provider/model-neutral. Maintain a clear `.env.example`; never include actual credentials or user data.

## 10. Finish and report

Complete the implementation and deployment preparation rather than stopping at a plan. Inspect changed files and resolve issues. Do not invent credentials, school assets, or product decisions. If a consequential decision is required, implement safe defaults above and clearly identify the decision in the final report. Report features implemented, exact setup still needed, deployment readiness, and checks actually performed. Do not add or run tests unless explicitly requested.

---

## Defaults already chosen

- Public catalog access without login.
- No public registration; admins provision accounts.
- Roles are admin, librarian, and teacher.
- Librarians record loans and returns; admins manage accounts, roles, books, categories, grade levels, and sections.
- Teachers have read-only catalog access; teacher/student borrower records do not require accounts.
- GitHub is the source repository and Render is the intended frontend host; Supabase provides Auth and database services.
