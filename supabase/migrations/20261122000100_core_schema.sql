-- Pangangan Elementary School Library Management
-- Migration 1: core schema.
--
-- Apply deliberately to the intended Supabase project (see docs/DEPLOYMENT.md).
-- Never run this as part of a frontend build.
--
-- Design notes
--  * Staff login accounts (profiles) are separate from borrowers.
--  * Passwords live only in Supabase Auth (auth.users). Nothing here stores them.
--  * Availability is DERIVED (total_copies minus outstanding loan quantity);
--    there is no editable "available" column.
--  * Referenced records are archived/deactivated, never hard-deleted
--    (foreign keys use ON DELETE RESTRICT, and loans keep text snapshots).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------------

create or replace function public.normalize_text(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: staff login accounts (one row per auth user)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null check (char_length(btrim(full_name)) between 2 and 120),
  username            text not null check (char_length(btrim(username)) between 3 and 32),
  username_normalized text not null unique
                      check (username_normalized ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  email               text not null,
  role                text not null check (role in ('admin', 'librarian', 'teacher')),
  is_active           boolean not null default true,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'Staff login accounts. Email is kept only for admin display and is synchronised by trusted code. Passwords live in auth.users only.';

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Role helpers. SECURITY DEFINER so policies on other tables can call them
-- without recursing into profiles RLS. They only ever read the caller's own row.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() = 'admin', false);
$$;

create or replace function public.is_circulation_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() in ('admin', 'librarian'), false);
$$;

-- ---------------------------------------------------------------------------
-- Academic structure and categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(btrim(name)) between 1 and 80),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index categories_name_unique on public.categories (name_normalized);
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create table public.grade_levels (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(btrim(name)) between 1 and 40),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index grade_levels_name_unique on public.grade_levels (name_normalized);
create trigger grade_levels_touch before update on public.grade_levels
  for each row execute function public.touch_updated_at();

create table public.sections (
  id              uuid primary key default gen_random_uuid(),
  grade_level_id  uuid references public.grade_levels (id) on delete restrict,
  name            text not null check (char_length(btrim(name)) between 1 and 60),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- A section name is unique within its grade level. Sections without a grade
-- level (for example "Faculty") are unique among themselves.
create unique index sections_name_unique
  on public.sections (coalesce(grade_level_id, '00000000-0000-0000-0000-000000000000'::uuid), name_normalized);
create trigger sections_touch before update on public.sections
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------

create table public.books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(btrim(title)) between 1 and 250),
  author         text not null check (char_length(btrim(author)) between 1 and 200),
  isbn           text check (isbn is null or char_length(btrim(isbn)) between 1 and 32),
  category_id    uuid references public.categories (id) on delete restrict,
  shelf_location text check (shelf_location is null or char_length(shelf_location) <= 80),
  description    text check (description is null or char_length(description) <= 2000),
  total_copies   integer not null check (total_copies >= 0),
  is_archived    boolean not null default false,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index books_title_idx  on public.books (lower(title));
create index books_author_idx on public.books (lower(author));
-- Same title AND author is treated as a duplicate among non-archived books.
create unique index books_title_author_unique
  on public.books (public.normalize_text(title), public.normalize_text(author))
  where not is_archived;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Borrowers: optional managed directory. NOT login accounts.
-- ---------------------------------------------------------------------------

create table public.borrowers (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 120),
  name_normalized text generated always as (public.normalize_text(full_name)) stored,
  borrower_type   text not null check (borrower_type in ('student', 'teacher', 'other')),
  grade_level_id  uuid references public.grade_levels (id) on delete restrict,
  section_id      uuid references public.sections (id) on delete restrict,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index borrowers_name_idx on public.borrowers (name_normalized);
create trigger borrowers_touch before update on public.borrowers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Loans and return transactions
-- ---------------------------------------------------------------------------

create table public.loans (
  id                  uuid primary key default gen_random_uuid(),
  book_id             uuid not null references public.books (id) on delete restrict,
  borrower_id         uuid references public.borrowers (id) on delete restrict,
  quantity            integer not null check (quantity > 0),
  borrowed_at         timestamptz not null default now(),
  issued_by           uuid not null references public.profiles (id) on delete restrict,
  -- Historical snapshots: stay correct even if the source rows are renamed.
  book_title          text not null,
  book_author         text not null,
  borrower_name       text not null check (char_length(btrim(borrower_name)) between 2 and 120),
  borrower_type       text not null check (borrower_type in ('student', 'teacher', 'other')),
  grade_level_id      uuid references public.grade_levels (id) on delete restrict,
  grade_level_name    text,
  section_id          uuid references public.sections (id) on delete restrict,
  section_name        text,
  issued_by_name      text not null,
  -- Set only when a legacy import could not parse the original date reliably.
  legacy_date_flag    text,
  created_at          timestamptz not null default now()
);
create index loans_book_idx      on public.loans (book_id);
create index loans_borrowed_idx  on public.loans (borrowed_at desc);
create index loans_issued_by_idx on public.loans (issued_by);

create table public.return_transactions (
  id               uuid primary key default gen_random_uuid(),
  loan_id          uuid not null references public.loans (id) on delete restrict,
  quantity         integer not null check (quantity > 0),
  returned_at      timestamptz not null default now(),
  received_by      uuid not null references public.profiles (id) on delete restrict,
  received_by_name text not null,
  created_at       timestamptz not null default now()
);
create index returns_loan_idx on public.return_transactions (loan_id);
create index returns_date_idx on public.return_transactions (returned_at desc);

-- Loan and return rows are an audit trail: block UPDATE and DELETE outright.
-- (Corrections are made by recording a new, compensating transaction.)
create or replace function public.block_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Circulation records are append-only (% on %).', tg_op, tg_table_name
    using errcode = '42501';
end;
$$;

create trigger loans_append_only
  before update or delete on public.loans
  for each row execute function public.block_ledger_mutation();

create trigger returns_append_only
  before update or delete on public.return_transactions
  for each row execute function public.block_ledger_mutation();

-- ---------------------------------------------------------------------------
-- Stock invariants
-- ---------------------------------------------------------------------------

-- Copies currently out for a book, derived from loans minus returns.
create or replace function public.book_outstanding(p_book_id uuid)
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

-- Prevent total_copies dropping below copies still out, even from a direct
-- UPDATE. Locks the row (the UPDATE already holds it) so it races safely with
-- checkout, which locks the same books row first.
create or replace function public.guard_book_total_copies()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_out integer;
begin
  if new.total_copies < old.total_copies or (new.is_archived and not old.is_archived) then
    v_out := public.book_outstanding(new.id);
    if new.total_copies < v_out then
      raise exception 'Total copies (%) cannot be lower than the % copies currently on loan.',
        new.total_copies, v_out using errcode = '23514';
    end if;
    if new.is_archived and not old.is_archived and v_out > 0 then
      raise exception 'This book has % copies on loan. Record their return before archiving.', v_out
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger books_guard_copies
  before update on public.books
  for each row execute function public.guard_book_total_copies();
