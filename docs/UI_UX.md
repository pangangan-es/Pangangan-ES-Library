# UI and interaction guidance

## Visual direction

Create a calm, contemporary library tool for Pangangan Elementary School in Lomboy, Calape, Bohol: warm paper-like neutrals, deep ink/navy for navigation, and a restrained green or teal accent for successful circulation. Use the correct school name and location in appropriate branding. Use clear type hierarchy, generous but efficient spacing, subtle borders, and strong contrast. Avoid decorative AI slop, excessive shadows, and cramped dense tables. The official library logo (`public/pangangan_es_library_hub_logo.svg`) has been confirmed for Pangangan Elementary School Library Hub branding, along with high-resolution PWA icons and Open Graph preview cards.

## Layout

- Desktop: persistent sidebar or compact top navigation, clear page heading, primary action near the page title, and content in readable-width panels.
- Mobile: compact header and drawer/bottom navigation as appropriate; prioritize search and common checkout/return actions. Ensure dialogs fit small screens and avoid hover-only controls.
- Inventory and history: provide accessible table layouts on larger screens and stacked record cards or intentionally scrollable tables on narrow screens.
- Dashboard: show high-value counts (catalogue titles/copies, copies currently loaned, overdue loans if due dates are introduced) and useful recent activity. Do not add due dates unless product rules define them.

## Interaction quality

- Every form has persistent labels, inline validation, actionable error text, and saving/disabled states.
- Confirm irreversible deletes and offer archive/deactivate actions when history references a record.
- Show available copies and remaining loan quantity before confirmation.
- Use clear status text alongside color, with accessible contrast.
- Provide empty states that explain the next action, and loading skeletons only when they improve perceived continuity.
- Keep filters visible and easy to reset; preserve sensible filter state while navigating where feasible.
- Make print and CSV export usable without exposing unrelated account or security data.

## Accessibility and motion

Target WCAG 2.2 AA fundamentals: keyboard access, visible focus, semantic headings, labeled inputs, sufficient contrast, screen-reader names, and dialogs with correct focus behavior. Use Framer Motion only for brief transitions that reinforce navigation or feedback; respect reduced motion and keep controls responsive.

## Deployed behavior

Verify that the actual Render URL supports direct navigation and page refresh on every React Router route. Auth confirmation, recovery, and sign-out flows must use the deployed origin and return to meaningful in-app pages. Show clear configuration/network errors if the browser cannot reach Supabase; never display or log secret values.

## As implemented

- Navy sidebar (desktop) or a "Menu" disclosure (phone) for staff; an accessible top bar with official school branding and an in-app "Install App" prompt for public pages. Warm paper background, navy ink, and teal/emerald for positive circulation actions.
- Interactive 3D storybook hero scene (`HeroBook3D`) created with Three.js / React Three Fiber, featuring a floating open storybook, orbiting mini elements (planet, pencil, books), and a dynamic spotlight card connected to Supabase's featured book. In mobile/portrait viewports, the hero artwork renders cleanly at the top before headlines.
- Category browsing grid with color-coded pastel themes for DepEd and Bohol heritage topics, multi-line titles with `line-clamp-2` for readability, and a full-width "All Available Books" banner spanning across the bottom of the grid.
- Tactile New Arrivals cards featuring mini book covers / category-tinted spine strips, author legibility enhancements, and live stock badges.
- Wide tables become stacked cards below the `md` breakpoint (`ResponsiveList`), so nothing depends on horizontal scrolling. All controls are at least 44 px tall.
- Dialogs use the native `<dialog>` element, which supplies the focus trap and Escape handling; focus returns to the opener on close, and closing is blocked while a save is running. Destructive actions use a confirmation dialog and prefer archive/deactivate.
- Checkout shows live available copies and how many would remain; return shows the loan, copies still out and what will remain.
- Status is always text plus colour (badges). Errors appear inline per field and as a summary alert; successes use a polite live-region toast.
- Motion: restrained Framer Motion transitions honoring `prefers-reduced-motion` (and a global CSS fallback).
- PWA & Social Share: Web app manifest (`manifest.webmanifest`) supporting standalone PWA installation, offline service worker (`sw.js`), 192px/512px maskable icons, and a 1200x630 Open Graph preview card (`og-image.png`).
- Print: the history page builds a dedicated print section (school name and address, filters used, date, confidentiality notice) and hides navigation and controls.
- CSV export escapes quotes, commas and newlines (RFC 4180), neutralises spreadsheet formulas (cells starting with `=`, `+`, `-` or `@`), adds a UTF-8 byte-order mark for Excel, and caps at 10,000 rows with a notice.

Accessibility has not been verified with assistive technology or an automated audit in this build.
