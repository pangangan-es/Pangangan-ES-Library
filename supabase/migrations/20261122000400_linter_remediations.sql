-- Migration 4: Supabase Security Linter Remediations
-- Fixes:
-- 1. ERROR: security_definer_view on public_catalog and public_categories (Lint 0010)
-- 2. WARN: anon_security_definer_function_executable on functions callable by anon (Lint 0028)
-- 3. WARN: authenticated_security_definer_function_executable on trigger functions (Lint 0029)
-- 4. INFO: rls_enabled_no_policy on login_attempts (Lint 0008)

-- ===========================================================================
-- 1. Views: Enable security_invoker (Lint 0010)
-- ===========================================================================

-- Create a private helper in an unexposed schema for available copies calculation
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.book_outstanding(p_book_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select sum(l.quantity) from public.loans l where l.book_id = p_book_id), 0)::int
       - coalesce((select sum(r.quantity)
                   from public.return_transactions r
                   join public.loans l on l.id = r.loan_id
                   where l.book_id = p_book_id), 0)::int;
$$;
grant execute on function private.book_outstanding(uuid) to anon, authenticated;

-- Grant SELECT to anon and add public read policies on non-archived books and active categories
grant select on public.books to anon;
drop policy if exists books_public_read on public.books;
create policy books_public_read on public.books
  for select to anon, authenticated
  using (not is_archived);

grant select on public.categories to anon;
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (is_active);

-- Recreate public_catalog view with security_invoker = true
create or replace view public.public_catalog
with (security_invoker = true) as
select
  b.id,
  b.title,
  b.author,
  b.isbn,
  c.name  as category,
  b.shelf_location,
  b.description,
  b.total_copies,
  greatest(b.total_copies - private.book_outstanding(b.id), 0)::int as available_copies
from public.books b
left join public.categories c on c.id = b.category_id and c.is_active
where not b.is_archived;

comment on view public.public_catalog is
  'Public catalog view with security_invoker enabled. Available copies computed via private.book_outstanding.';

-- Enable security_invoker on public_categories
alter view public.public_categories set (security_invoker = true);

-- Ensure grants on views remain intact
grant select on public.public_catalog    to anon, authenticated;
grant select on public.public_categories to anon, authenticated;


-- ===========================================================================
-- 2. Revoke execute from anon and public on SECURITY DEFINER functions (Lint 0028)
-- ===========================================================================
revoke execute on function public.checkout_book(uuid, integer, text, text, uuid, uuid, uuid, boolean) from anon, public;
revoke execute on function public.return_copies(uuid, integer) from anon, public;
revoke execute on function public.dashboard_stats() from anon, public;
revoke execute on function public.staff_directory() from anon, public;
revoke execute on function public.update_own_name(text) from anon, public;
revoke execute on function public.current_role_name() from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.is_circulation_staff() from anon, public;
revoke execute on function public.book_outstanding(uuid) from anon, public;


-- ===========================================================================
-- 3. Revoke execute on trigger functions from all client roles (Lint 0029)
-- Trigger functions must only be called by PostgreSQL triggers, never via RPC.
-- ===========================================================================
revoke execute on function public.audit_row_change() from anon, authenticated, public;
revoke execute on function public.stamp_created_by() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;


-- ===========================================================================
-- 4. Explicit reject-all policy on login_attempts (Lint 0008)
-- ===========================================================================
drop policy if exists login_attempts_no_client_access on public.login_attempts;
create policy login_attempts_no_client_access on public.login_attempts
  for all to public
  using (false);
