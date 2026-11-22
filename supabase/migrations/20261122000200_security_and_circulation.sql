-- Migration 2: Row Level Security, grants, public catalog view,
-- atomic circulation functions, audit log, login throttle.

-- ---------------------------------------------------------------------------
-- Extra tables
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_name text,
  action     text not null,
  table_name text not null,
  row_id     text,
  detail     jsonb not null default '{}'::jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);

-- Used only by the staff-login Edge Function (service role). No client access.
create table public.login_attempts (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('identifier', 'ip')),
  key_hash     text not null,
  succeeded    boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index login_attempts_lookup_idx on public.login_attempts (kind, key_hash, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (default deny)
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.grade_levels        enable row level security;
alter table public.sections            enable row level security;
alter table public.books               enable row level security;
alter table public.borrowers           enable row level security;
alter table public.loans               enable row level security;
alter table public.return_transactions enable row level security;
alter table public.audit_log           enable row level security;
alter table public.login_attempts      enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges: start from nothing, grant the minimum.
-- RLS policies below further restrict rows. Both layers must allow access.
-- ---------------------------------------------------------------------------

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant select on public.profiles            to authenticated;
grant select, insert, update, delete on public.categories   to authenticated;
grant select, insert, update, delete on public.grade_levels to authenticated;
grant select, insert, update, delete on public.sections     to authenticated;
grant select, insert, update, delete on public.books        to authenticated;
grant select, update                 on public.borrowers    to authenticated;
grant select on public.loans               to authenticated;
grant select on public.return_transactions to authenticated;
grant select on public.audit_log           to authenticated;
-- login_attempts: no grants. Only the service role (bypasses RLS) touches it.

-- Role helpers are used inside policies, so the calling role needs EXECUTE.
grant execute on function public.current_role_name()    to authenticated;
grant execute on function public.is_admin()             to authenticated;
grant execute on function public.is_circulation_staff() to authenticated;
grant execute on function public.book_outstanding(uuid) to authenticated;
grant execute on function public.normalize_text(text)   to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- profiles: you can read your own row; admins read all. NO insert/update/delete
-- policy exists for any client role, and the privileges are revoked above, so
-- roles/usernames/status can only change through the admin-users Edge Function
-- (service role) or the SECURITY DEFINER functions below. Nobody can
-- self-assign a role.
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Reference data: circulation staff (admin + librarian) can read, admins write.
create policy categories_select on public.categories
  for select to authenticated using ((select public.is_circulation_staff()));
create policy categories_admin_write on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy grade_levels_select on public.grade_levels
  for select to authenticated using ((select public.is_circulation_staff()));
create policy grade_levels_admin_write on public.grade_levels
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy sections_select on public.sections
  for select to authenticated using ((select public.is_circulation_staff()));
create policy sections_admin_write on public.sections
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Books: only admins touch the base table. Everyone else (including anon and
-- teachers) reads the public_catalog view below.
create policy books_admin_all on public.books
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Borrowers: identifiable, so circulation staff only. Inserts happen inside
-- checkout_book(); admins may rename/deactivate.
create policy borrowers_select on public.borrowers
  for select to authenticated using ((select public.is_circulation_staff()));
create policy borrowers_admin_update on public.borrowers
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Loans and returns: readable by circulation staff only. No client write
-- policies exist: writes go through checkout_book() / return_copies().
create policy loans_select on public.loans
  for select to authenticated using ((select public.is_circulation_staff()));
create policy returns_select on public.return_transactions
  for select to authenticated using ((select public.is_circulation_staff()));

-- Audit log: admins read. Written by triggers / trusted functions only.
create policy audit_select_admin on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- login_attempts: RLS on, no policies, no grants => unreachable from clients.

-- ---------------------------------------------------------------------------
-- Public-safe catalog (readable by anon). Whitelists columns, hides archived
-- books and exposes only an availability COUNT; no borrower, loan or staff data.
-- Runs with the view owner's rights on purpose so anon needs no table access.
-- ---------------------------------------------------------------------------

create view public.public_catalog as
select
  b.id,
  b.title,
  b.author,
  b.isbn,
  c.name  as category,
  b.shelf_location,
  b.description,
  b.total_copies,
  greatest(b.total_copies - coalesce(o.out_qty, 0), 0)::int as available_copies
from public.books b
left join public.categories c on c.id = b.category_id and c.is_active
left join lateral (
  select coalesce((select sum(l.quantity) from public.loans l where l.book_id = b.id), 0)
       - coalesce((select sum(r.quantity)
                   from public.return_transactions r
                   join public.loans l2 on l2.id = r.loan_id
                   where l2.book_id = b.id), 0) as out_qty
) o on true
where not b.is_archived;

comment on view public.public_catalog is
  'Public-safe catalog. Security definer by design: exposes whitelisted book fields and an availability count only.';

create view public.public_categories as
select c.id, c.name
from public.categories c
where c.is_active
  and exists (select 1 from public.books b where b.category_id = c.id and not b.is_archived);

grant select on public.public_catalog    to anon, authenticated;
grant select on public.public_categories to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Loan history view (invoker rights: the loans/returns RLS above applies, so
-- non-circulation roles get zero rows, and anon has no grant at all).
-- ---------------------------------------------------------------------------

create view public.loan_history
with (security_invoker = true) as
select
  l.id,
  l.book_id,
  l.book_title,
  l.book_author,
  l.borrower_id,
  l.borrower_name,
  l.borrower_type,
  l.grade_level_name,
  l.section_name,
  l.quantity,
  l.borrowed_at,
  l.issued_by,
  l.issued_by_name,
  l.legacy_date_flag,
  coalesce(r.returned_qty, 0)::int                as returned_qty,
  (l.quantity - coalesce(r.returned_qty, 0))::int as outstanding_qty,
  case
    when coalesce(r.returned_qty, 0) = 0         then 'out'
    when coalesce(r.returned_qty, 0) < l.quantity then 'partial'
    else 'returned'
  end                                             as status,
  r.last_returned_at,
  coalesce(r.transactions, '[]'::jsonb)           as transactions
from public.loans l
left join lateral (
  select
    sum(t.quantity)       as returned_qty,
    max(t.returned_at)    as last_returned_at,
    jsonb_agg(jsonb_build_object(
      'id', t.id,
      'quantity', t.quantity,
      'returned_at', t.returned_at,
      'received_by', t.received_by,
      'received_by_name', t.received_by_name
    ) order by t.returned_at) as transactions
  from public.return_transactions t
  where t.loan_id = l.id
) r on true;

grant select on public.loan_history to authenticated;

-- Admin inventory view: every book (including archived) with copies on loan.
-- Invoker rights => only admins (who can read books AND loans) get rows.
create view public.book_inventory
with (security_invoker = true) as
select
  b.id,
  b.title,
  b.author,
  b.isbn,
  b.category_id,
  c.name as category_name,
  b.shelf_location,
  b.description,
  b.total_copies,
  b.is_archived,
  b.created_at,
  b.updated_at,
  (coalesce(lo.qty, 0) - coalesce(re.qty, 0))::int as on_loan,
  exists (select 1 from public.loans x where x.book_id = b.id) as has_history
from public.books b
left join public.categories c on c.id = b.category_id
left join lateral (select sum(l.quantity) as qty from public.loans l where l.book_id = b.id) lo on true
left join lateral (
  select sum(t.quantity) as qty
  from public.return_transactions t join public.loans l2 on l2.id = t.loan_id
  where l2.book_id = b.id
) re on true;

grant select on public.book_inventory to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic circulation functions (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

create or replace function public.checkout_book(
  p_book_id        uuid,
  p_quantity       integer,
  p_borrower_name  text,
  p_borrower_type  text,
  p_grade_level_id uuid default null,
  p_section_id     uuid default null,
  p_borrower_id    uuid default null,
  p_remember       boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_staff     public.profiles%rowtype;
  v_book      public.books%rowtype;
  v_out       integer;
  v_available integer;
  v_name      text := btrim(coalesce(p_borrower_name, ''));
  v_type      text := p_borrower_type;
  v_grade     public.grade_levels%rowtype;
  v_section   public.sections%rowtype;
  v_grade_id  uuid := p_grade_level_id;
  v_section_id uuid := p_section_id;
  v_borrower_id uuid := p_borrower_id;
  v_loan_id   uuid;
begin
  select * into v_staff from public.profiles where id = v_uid and is_active;
  if not found or v_staff.role not in ('admin', 'librarian') then
    raise exception 'Not permitted to record checkouts.' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Quantity must be a whole number of at least 1.' using errcode = '22023';
  end if;

  -- Directory borrower: its stored details win over whatever the form sent.
  if v_borrower_id is not null then
    select b.full_name, b.borrower_type, b.grade_level_id, b.section_id
      into v_name, v_type, v_grade_id, v_section_id
    from public.borrowers b
    where b.id = v_borrower_id and b.is_active;
    if not found then
      raise exception 'That borrower is not available.' using errcode = '22023';
    end if;
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Enter the borrower''s full name (2 to 120 characters).' using errcode = '22023';
  end if;
  if v_type is null or v_type not in ('student', 'teacher', 'other') then
    raise exception 'Choose a borrower type.' using errcode = '22023';
  end if;

  if v_grade_id is not null then
    select * into v_grade from public.grade_levels where id = v_grade_id and is_active;
    if not found then
      raise exception 'That grade level is not available.' using errcode = '22023';
    end if;
  end if;
  if v_section_id is not null then
    select * into v_section from public.sections where id = v_section_id and is_active;
    if not found then
      raise exception 'That section is not available.' using errcode = '22023';
    end if;
    if v_section.grade_level_id is not null and v_grade_id is not null
       and v_section.grade_level_id <> v_grade_id then
      raise exception 'The section does not belong to the chosen grade level.' using errcode = '22023';
    end if;
    -- Infer the grade from the section when only the section was sent.
    if v_grade_id is null and v_section.grade_level_id is not null then
      v_grade_id := v_section.grade_level_id;
      select * into v_grade from public.grade_levels where id = v_grade_id;
    end if;
  end if;

  -- Serialise every checkout/total-copies change for this book. Two concurrent
  -- checkouts queue here, so the availability check below cannot be oversold.
  select * into v_book from public.books where id = p_book_id for update;
  if not found or v_book.is_archived then
    raise exception 'That book is not available for checkout.' using errcode = '22023';
  end if;

  v_out := public.book_outstanding(v_book.id);
  v_available := v_book.total_copies - v_out;
  if p_quantity > v_available then
    raise exception 'Only % cop% available for "%".',
      greatest(v_available, 0), case when v_available = 1 then 'y is' else 'ies are' end, v_book.title
      using errcode = '23514';
  end if;

  -- Optionally remember this borrower in the directory (find-or-create).
  if v_borrower_id is null and p_remember then
    select b.id into v_borrower_id
    from public.borrowers b
    where b.name_normalized = public.normalize_text(v_name)
      and b.borrower_type = v_type
      and b.grade_level_id is not distinct from v_grade_id
      and b.section_id is not distinct from v_section_id
    limit 1;
    if v_borrower_id is null then
      insert into public.borrowers (full_name, borrower_type, grade_level_id, section_id, created_by)
      values (v_name, v_type, v_grade_id, v_section_id, v_uid)
      returning id into v_borrower_id;
    end if;
  end if;

  insert into public.loans (
    book_id, borrower_id, quantity, issued_by,
    book_title, book_author, borrower_name, borrower_type,
    grade_level_id, grade_level_name, section_id, section_name, issued_by_name
  ) values (
    v_book.id, v_borrower_id, p_quantity, v_uid,
    v_book.title, v_book.author, v_name, v_type,
    v_grade_id, v_grade.name, v_section_id, v_section.name, v_staff.full_name
  ) returning id into v_loan_id;

  return v_loan_id;
end;
$$;

create or replace function public.return_copies(
  p_loan_id  uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_staff     public.profiles%rowtype;
  v_loan      public.loans%rowtype;
  v_returned  integer;
  v_remaining integer;
  v_id        uuid;
begin
  select * into v_staff from public.profiles where id = v_uid and is_active;
  if not found or v_staff.role not in ('admin', 'librarian') then
    raise exception 'Not permitted to record returns.' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be a whole number of at least 1.' using errcode = '22023';
  end if;

  -- Row lock on the loan serialises concurrent returns for the same loan.
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found then
    raise exception 'Loan not found.' using errcode = '22023';
  end if;

  select coalesce(sum(quantity), 0) into v_returned
  from public.return_transactions where loan_id = v_loan.id;

  v_remaining := v_loan.quantity - v_returned;
  if v_remaining <= 0 then
    raise exception 'This loan has already been fully returned.' using errcode = '23514';
  end if;
  if p_quantity > v_remaining then
    raise exception 'Only % cop% still outstanding on this loan.',
      v_remaining, case when v_remaining = 1 then 'y is' else 'ies are' end
      using errcode = '23514';
  end if;

  insert into public.return_transactions (loan_id, quantity, received_by, received_by_name)
  values (v_loan.id, p_quantity, v_uid, v_staff.full_name)
  returning id into v_id;

  return v_id;
end;
$$;

-- Staff directory for filters: names/roles only (no emails), circulation staff only.
create or replace function public.staff_directory()
returns table (id uuid, full_name text, role text, is_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.role, p.is_active
  from public.profiles p
  where (select public.is_circulation_staff())
  order by p.full_name;
$$;

-- A signed-in user may change only their own display name.
create or replace function public.update_own_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_full_name, ''))) not between 2 and 120 then
    raise exception 'Enter a name between 2 and 120 characters.' using errcode = '22023';
  end if;
  update public.profiles set full_name = btrim(p_full_name)
  where id = (select auth.uid()) and is_active;
end;
$$;

-- Dashboard metrics (circulation staff). Counting rules are documented in
-- docs/DATABASE.md. "Today" uses the school's timezone (Asia/Manila).
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
  v_result jsonb;
begin
  if not (select public.is_circulation_staff()) then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'titles',            (select count(*) from public.books where not is_archived),
    'total_copies',      (select coalesce(sum(total_copies), 0) from public.books where not is_archived),
    'copies_on_loan',    (select coalesce(sum(outstanding_qty), 0) from public.loan_history),
    'open_loans',        (select count(*) from public.loan_history where outstanding_qty > 0),
    'loans_today',       (select count(*) from public.loans where borrowed_at >= v_today_start),
    'returns_today',     (select count(*) from public.return_transactions where returned_at >= v_today_start),
    'top_books', coalesce((
      select jsonb_agg(x) from (
        select book_title as title, sum(quantity)::int as copies
        from public.loans group by book_title order by sum(quantity) desc, book_title limit 5
      ) x), '[]'::jsonb),
    'top_borrowers', coalesce((
      select jsonb_agg(x) from (
        select borrower_name as name, count(*)::int as loans
        from public.loans group by borrower_name order by count(*) desc, borrower_name limit 5
      ) x), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Execute rights: signed-in users only (each function re-checks the role).
grant execute on function public.checkout_book(uuid, integer, text, text, uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.return_copies(uuid, integer) to authenticated;
grant execute on function public.staff_directory()  to authenticated;
grant execute on function public.update_own_name(text) to authenticated;
grant execute on function public.dashboard_stats()  to authenticated;

-- ---------------------------------------------------------------------------
-- Audit triggers for catalog/config changes made by signed-in admins
-- ---------------------------------------------------------------------------

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_actor uuid := (select auth.uid());
begin
  insert into public.audit_log (actor_id, actor_name, action, table_name, row_id, detail)
  values (
    v_actor,
    (select p.full_name from public.profiles p where p.id = v_actor),
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    jsonb_strip_nulls(jsonb_build_object(
      'title', v_row ->> 'title',
      'name', v_row ->> 'name',
      'total_copies', v_row ->> 'total_copies',
      'is_active', v_row ->> 'is_active',
      'is_archived', v_row ->> 'is_archived'
    ))
  );
  return null;
end;
$$;

create trigger books_audit        after insert or update or delete on public.books        for each row execute function public.audit_row_change();
create trigger categories_audit   after insert or update or delete on public.categories   for each row execute function public.audit_row_change();
create trigger grade_levels_audit after insert or update or delete on public.grade_levels for each row execute function public.audit_row_change();
create trigger sections_audit     after insert or update or delete on public.sections     for each row execute function public.audit_row_change();

-- Stamp created_by from the real caller so it cannot be spoofed.
create or replace function public.stamp_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := (select auth.uid());
  return new;
end;
$$;
create trigger books_stamp before insert on public.books
  for each row execute function public.stamp_created_by();
