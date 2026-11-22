# Product specification

## Goal

Turn the existing browser-only library tracker into a secure, multi-user web application for the Pangangan Elementary School library in Lomboy, Calape, Bohol. Library staff should be able to use it from desktop and mobile browsers, with authenticated shared data, clear circulation workflows, and useful reports. The former school's static app is a feature reference only; replace its school identity throughout the product.

## Public access and staff accounts

The public catalog and general library information are accessible without login. Visitors can search and view public book details and availability, but cannot see borrower identities, active loan records, staff data, reports containing personal data, or settings. Circulation actions and all administrative changes require staff authentication.

There is no public self-registration. An administrator creates staff accounts and assigns one of three roles: `admin`, `librarian`, or `teacher`. Account creation collects full name, email address, username, and a password setup/invitation flow. Sign-in accepts email address or username plus password. Supabase Auth remains the credential authority; never store plaintext passwords. Admin-provisioned accounts should use an invitation or password setup/reset flow rather than an admin choosing and retaining a user's password.

Role permissions:

| Capability | Public | Teacher | Librarian | Admin |
|---|---:|---:|---:|---:|
| Browse public catalog and availability | Yes | Yes | Yes | Yes |
| View identifiable loans, returns, or staff records | No | No | Yes | Yes |
| Record checkout and returns | No | No | Yes | Yes |
| View/search/export circulation history | No | No | Yes | Yes |
| Add/edit/archive books and categories | No | No | Yes | Yes |
| Manage announcements and library bulletin | No | No | Yes | Yes |
| Manage grade levels and sections | No | No | No | Yes |
| Create/deactivate staff accounts and assign roles | No | No | No | Yes |
| Manage operational application settings | No | No | Yes | Yes |

Teachers are staff accounts with read-only catalog access by default. They can also be represented as borrower records without an account. Do not confuse app roles with borrower types. An admin may explicitly grant further privileges only through documented policy and matching RLS changes.

Username sign-in must resolve usernames securely without exposing an email directory or enabling easy account enumeration; implement a narrowly scoped trusted server-side function/RPC or equivalent flow, with normalization, uniqueness, abuse controls, and generic auth errors. Never expose the Supabase service-role key to the browser. RLS is the security boundary; hiding links or buttons is not sufficient.

## Pages (one route-level TSX file per page)

- `/` or `/catalog` — public, searchable catalog and public availability; no login required.
- `/login` — staff email-or-username and password sign-in; clear generic errors and recovery path.
- `/staff` or `/dashboard` — authenticated staff workspace; circulation overview and actions vary by role.
- `/staff/loans` — librarian/admin active loans and checkout/return workflows.
- `/staff/history` — librarian/admin circulation history, filters, print-friendly report, and CSV export.
- `/admin/books` — admin catalog and book management.
- `/admin/categories` — admin category management.
- `/admin/people` — admin account creation, deactivation, and role assignment.
- `/admin/academic-structure` — admin grade-level and section management.

Do not expose a public `/register` route. Use separate page files for each route-level page, and protect private pages with UX route guards plus database RLS.

Use route-level loading, empty, error, and unauthorized states. Reuse shared components for the navigation shell, forms, dialogs, tables/cards, status badges, and notifications.

## Core workflows

### Books

Track title, author, optional ISBN/category/shelf location/description, total copies, and timestamps. Categories are admin-managed. Availability is derived from total copies minus copies currently out across open loans. Publish only catalog fields and aggregate availability publicly. Do not let total copies fall below the outstanding quantity. Prevent deletion of a book with active loans; explain the resolution.

### Loans and returns

A loan captures a book, borrower full name, borrower type (student/teacher/other as approved), grade level, section, quantity, issuing staff member, and timestamp. Borrower records are not login accounts by default. Validate positive integer quantities and available stock. Each return is a separate transaction with positive quantity, receiving staff, and timestamp. Enforce that returned quantity cannot exceed the loan quantity, and prevent concurrent checkouts from overselling stock (use a database transaction/RPC or other atomic operation). Keep partially returned loans open until all copies are returned. Retain historical records when titles or people change; snapshot relevant display fields where needed. Restrict borrower-identifiable data to librarian/admin roles.

### Lists and reporting

Admins maintain categories, grade levels, sections, and staff accounts/roles with safe handling of referenced records. Librarians and admins can use circulation filters and reports. Provide search and date/staff/borrower/status filters in history, a print-friendly report, and CSV export with proper CSV escaping. Dashboard metrics should come from shared database data and clearly define their counting method. Do not include personal circulation details in the public catalog.

## Responsive and interaction requirements

Support narrow mobile screens, tablet, and desktop. Convert wide tables into usable mobile card/list layouts or carefully contained horizontal scrolling. Keep critical actions reachable, forms usable with touch, and dialogs within the viewport. Use confirmation and undo/recovery affordances for destructive actions. Show success/error feedback and disable duplicate submissions while saving.

## Data migration

The current browser data is in `lib_books`, `lib_history`, `lib_staff`, and `lib_sections` localStorage keys. If migration is offered, make it a user-triggered, validated import with a preview, duplicate handling, and explicit confirmation. Never silently upload local data. Preserve partial returns and transaction details; flag legacy dates that cannot be parsed reliably.

## Delivery target

Source code and reviewed SQL migrations are maintained in GitHub. The intended frontend host is Render Static Site; the intended hosted authentication/database service is Supabase. Build and redirect settings must match the actual Vite app. Treat Render previews as separate origins and configure only approved URLs in Supabase Auth. This specification does not imply that a repository, Supabase project, or Render service has already been created.

## Out of scope until requested

Student self-service accounts, online reservations, fines/payments, barcode hardware, notifications, and external student-information-system integrations.

## Implementation decisions and defaults

Where the specification left room, these safe defaults were implemented. Each can be revisited with the owner.

- **Issuing and receiving staff are the signed-in user.** The prototype let staff pick an "in-charge" name from a list. Here the database records the authenticated librarian/admin, which cannot be spoofed, and keeps a name snapshot.
- **History is append-only.** Loans and return transactions cannot be edited or deleted, including by admins. Corrections are made with another transaction. The prototype's "delete history record" and "reset logs" features, and its hardcoded password, are not carried over.
- **Borrower directory.** Borrowers are remembered automatically (checkbox, on by default) to speed up repeat checkouts and can be hidden by admins. Loans keep their own snapshot of the borrower's name, type, grade and section.
- **Borrower types:** student, teacher, other.
- **Books are archived, not removed**, once they have loan history. A book that was never borrowed can be deleted.
- **Teacher accounts** see the catalog and a short workspace page only. They cannot see identifiable loans.
- **Public catalog fields:** title, author, ISBN, category, shelf location, description, total copies and available copies. Archived books are hidden. If the school wants shelf location or ISBN kept private, remove those columns from the `public_catalog` view.
- **No due dates, overdue tracking, fines or reservations** (listed as out of scope).
- **Admins cannot change their own role or deactivate themselves**, so at least one admin always remains.

## Legacy data

The prototype's `lib_books`, `lib_history`, `lib_staff` and `lib_sections` browser data are **not** read, uploaded or migrated automatically, and this release does **not** include an import tool. An import is a reasonable future feature but needs a decision first: how to treat legacy `toLocaleString()` dates (ambiguous across locales), whether historic outstanding loans should count against current stock, and how to match legacy titles to books. If an import is added it must be admin-only, validated, previewed, duplicate-aware, explicitly confirmed, preserve each partial return, and flag any date it cannot parse reliably. Until then, recreate the catalog in `/admin/books` and start recording loans from go-live; export or print any legacy history from the old browser if it must be kept.
