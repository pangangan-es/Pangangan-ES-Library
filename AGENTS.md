# Project guidance

## Purpose
Build and maintain a responsive, online library management application for Pangangan Elementary School, Lomboy, Calape, Bohol. This application is for the school's library. The existing static HTML, CSS, JavaScript, and `localStorage` application is a feature reference only; update its former school identity and verify branding assets before reuse. Preserve and improve its useful workflows while replacing browser-only persistence with Supabase.

## General working rules
- Inspect the existing application and all project instructions before making changes.
- Keep changes focused on the library management product. Do not invent unrelated modules.
- Use React, TypeScript, Vite, Tailwind CSS, React Router, Supabase, and Framer Motion unless the repository establishes an equivalent choice.
- Use a separate `.tsx` file for every route-level page. Put shared UI in reusable components.
- Keep TypeScript strict. Avoid `any`, duplicated business logic, unsafe HTML injection, and secrets in client code.
- Prefer accessible semantic HTML, keyboard support, visible focus states, clear validation, and responsive layouts.
- Keep business rules and Supabase access out of presentational components.
- Use Supabase Auth for authentication and Postgres Row Level Security (RLS) for authorization. Client-side checks alone are never security boundaries.
- Never store plaintext passwords or add a hardcoded reset password. Use managed authentication and role-protected administrative actions.
- Keep the catalog and public library information browsable without signing in. Require staff authentication for circulation records and all create/update/delete operations.
- Do not provide public self-registration. An administrator provisions staff accounts and assigns exactly one of the approved roles: `admin`, `librarian`, or `teacher`.
- Keep staff login accounts separate from borrower records. Students and teachers may be recorded as borrowers without receiving app accounts.
- Apply least privilege: admins manage staff accounts, roles, books, categories, grade levels, and sections; librarians manage checkout, returns, and circulation history; teachers have read-only catalog access unless the owner approves more.
- Preserve the distinction between a loan record and its individual return transactions.
- Record timestamps in ISO/timezone-aware form; format dates for display in the user's locale.
- Use Framer Motion for restrained, purposeful transitions and respect reduced-motion preferences.
- Keep documentation provider/model agnostic. Do not include instructions that assume a particular AI assistant.
- Treat GitHub as the source repository and Render as the intended web host. Keep deployment setup reproducible and documented.
- For a Vite client app on Render, configure a Static Site with the repository's actual build command and output folder (commonly `npm run build` and `dist`); add a Render rewrite from `/*` to `/index.html` for client-side routes.
- Set client environment variables in Render's dashboard, not in committed files. Vite-exposed variables are public; only Supabase URL and publishable/anon key belong in the browser.
- Keep Supabase migrations in the repository and apply them deliberately to the intended Supabase project. Do not run production migrations automatically as a side effect of a frontend build.
- Do not add or run tests unless the user asks. If asked to verify, report the exact checks performed.

## Before completing a change
- Summarize what changed and identify any setup that still requires project credentials or a human decision.
- Update relevant project documentation when behavior, schema, setup, or routes change.
- Check the GitHub-to-Render instructions when changing build settings, routes, environment variables, or Supabase deployment requirements.
