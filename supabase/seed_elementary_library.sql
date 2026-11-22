-- =============================================================================
-- Pangangan Elementary School Library Management
-- Seed & Schema Upgrade: Sample Flag, Philippine Elementary Books & Announcements
-- File: supabase/seed_elementary_library.sql
--
-- This script is completely IDEMPOTENT and safe to run in the Supabase SQL Editor.
-- It:
-- 1. Adds `is_sample` and `is_featured` columns to `books`.
-- 2. Creates the `announcements` and `library_settings` tables with full RLS.
-- 3. Updates views (`public_catalog` and `book_inventory`) to expose these flags.
-- 4. Ensures `public.is_admin()` gives full management powers to both `admin` and `librarian`.
-- 5. Seeds 10 permanent DepEd / Bohol elementary categories (`is_sample = false`).
-- 6. Seeds 15 realistic Philippine elementary books (`is_sample = true`).
-- 7. Seeds 3 library bulletin announcements (`is_sample = true`).
-- 8. Creates a safe RPC `public.clear_all_sample_data()` for one-click cleanup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema Extensions & Table Alterations
-- -----------------------------------------------------------------------------

-- Add sample and featured flags to public.books if they don't already exist
alter table public.books
  add column if not exists is_sample boolean not null default false,
  add column if not exists is_featured boolean not null default false;

-- Create announcements table for library bulletin
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 2 and 200),
  content     text not null check (char_length(btrim(content)) between 2 and 2000),
  event_date  date,
  badge       text check (badge is null or char_length(badge) <= 50),
  is_active   boolean not null default true,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Create library_settings table for operating hours, quarterly goals, etc.
create table if not exists public.library_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Seed default library settings
insert into public.library_settings (key, value)
values
  ('general', '{"operating_hours": "Mon – Fri, 7:30 AM – 4:30 PM", "quarter_name": "Q2 Reading Adventure", "quarter_reading_goal_target": 1200, "quarter_reading_goal_current": 840}'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Role Function Upgrade & RLS Policies
-- -----------------------------------------------------------------------------

-- Ensure public.is_admin() includes both 'admin' and 'librarian'
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() in ('admin', 'librarian'), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- Enable RLS
alter table public.announcements    enable row level security;
alter table public.library_settings enable row level security;

-- Grants
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

grant select on public.library_settings to anon, authenticated;
grant insert, update, delete on public.library_settings to authenticated;

-- Policies for announcements
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (is_active);

drop policy if exists announcements_staff_write on public.announcements;
create policy announcements_staff_write on public.announcements
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Policies for library_settings
drop policy if exists library_settings_public_read on public.library_settings;
create policy library_settings_public_read on public.library_settings
  for select to anon, authenticated
  using (true);

drop policy if exists library_settings_staff_write on public.library_settings;
create policy library_settings_staff_write on public.library_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- 3. Update Views (public_catalog and book_inventory)
-- -----------------------------------------------------------------------------

-- Drop existing views first with CASCADE to prevent Postgres error 42P16
drop view if exists public.public_catalog cascade;
drop view if exists public.book_inventory cascade;

-- Recreate public_catalog view with security_invoker = true
create view public.public_catalog
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
  greatest(b.total_copies - coalesce(private.book_outstanding(b.id), 0), 0)::int as available_copies,
  b.is_featured,
  b.is_sample,
  b.created_at
from public.books b
left join public.categories c on c.id = b.category_id and c.is_active
where not b.is_archived;

grant select on public.public_catalog to anon, authenticated;

-- Recreate book_inventory view for admin/librarian
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
  exists (select 1 from public.loans x where x.book_id = b.id) as has_history,
  b.is_featured,
  b.is_sample
from public.books b
left join public.categories c on c.id = b.category_id
left join lateral (select sum(l.quantity) as qty from public.loans l where l.book_id = b.id) lo on true
left join lateral (
  select sum(t.quantity) as qty
  from public.return_transactions t join public.loans l2 on l2.id = t.loan_id
  where l2.book_id = b.id
) re on true;

grant select on public.book_inventory to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Seed 10 Permanent DepEd / Bohol Elementary Categories (is_sample = false)
-- -----------------------------------------------------------------------------

insert into public.categories (name, is_active)
values
  ('Picture Books & Early Readers (Kinder–Grade 2)', true),
  ('Filipino & Philippine Folktales', true),
  ('Sinugbuanong Binisaya / Mother Tongue', true),
  ('English Storybooks & Fiction', true),
  ('Science, Nature & Environment', true),
  ('Mathematics & Logic Puzzles', true),
  ('Araling Panlipunan & Bohol Heritage', true),
  ('Edukasyon sa Pagpapakatao (Values)', true),
  ('Reference & Dictionaries', true),
  ('DepEd Textbooks & Learning Modules', true)
on conflict (name_normalized) do update set is_active = true;

-- -----------------------------------------------------------------------------
-- 5. Seed 15 Sample Philippine Elementary Books (is_sample = true)
-- -----------------------------------------------------------------------------

do $$
declare
  cat_folktales uuid;
  cat_early uuid;
  cat_bisaya uuid;
  cat_english uuid;
  cat_science uuid;
  cat_math uuid;
  cat_heritage uuid;
  cat_values uuid;
  cat_ref uuid;
  cat_deped uuid;
begin
  select id into cat_folktales from public.categories where name_normalized = public.normalize_text('Filipino & Philippine Folktales') limit 1;
  select id into cat_early from public.categories where name_normalized = public.normalize_text('Picture Books & Early Readers (Kinder–Grade 2)') limit 1;
  select id into cat_bisaya from public.categories where name_normalized = public.normalize_text('Sinugbuanong Binisaya / Mother Tongue') limit 1;
  select id into cat_english from public.categories where name_normalized = public.normalize_text('English Storybooks & Fiction') limit 1;
  select id into cat_science from public.categories where name_normalized = public.normalize_text('Science, Nature & Environment') limit 1;
  select id into cat_math from public.categories where name_normalized = public.normalize_text('Mathematics & Logic Puzzles') limit 1;
  select id into cat_heritage from public.categories where name_normalized = public.normalize_text('Araling Panlipunan & Bohol Heritage') limit 1;
  select id into cat_values from public.categories where name_normalized = public.normalize_text('Edukasyon sa Pagpapakatao (Values)') limit 1;
  select id into cat_ref from public.categories where name_normalized = public.normalize_text('Reference & Dictionaries') limit 1;
  select id into cat_deped from public.categories where name_normalized = public.normalize_text('DepEd Textbooks & Learning Modules') limit 1;

  -- 1. Ang Alamat ng Pinya
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Ang Alamat ng Pinya',
    'Rene O. Villanueva',
    cat_folktales,
    'Shelf FLK-01',
    'Ang tanyag na alamat tungkol sa batang si Pinang na hindi ginagamit ang mga mata sa paghahanap ng gamit.',
    4,
    true,
    false
  ) on conflict do nothing;

  -- 2. Si Pilandok at ang Buwaya
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Si Pilandok at ang Buwaya',
    'Virgilio S. Almario',
    cat_folktales,
    'Shelf FLK-02',
    'Isang nakatutuwang kwentong-bayan tungkol sa mautak na si Pilandok at kung paano niya nalinlang ang mababangis na buwaya.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 3. Chenelyn! Chenelyn!
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Chenelyn! Chenelyn!',
    'Rhandee Garlitos',
    cat_early,
    'Shelf PIC-01',
    'Isang masayang aklat pambata tungkol sa pamilyang laging umaasa sa kanilang masipag na kasambahay hanggang sa siya ay nagkasakit.',
    5,
    true,
    false
  ) on conflict do nothing;

  -- 4. Mga Kuwento ni Lola Basyang: Ang Mahiwagang Singsing
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Mga Kuwento ni Lola Basyang: Ang Mahiwagang Singsing',
    'Severino Reyes',
    cat_folktales,
    'Shelf FLK-03',
    'Klasikong salaysay ng paglalakbay, katapangan, at mahika na nagpapakita ng kabayanihan at katapatan ng Pilipino.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 5. Ang Munting Ibon
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Ang Munting Ibon',
    'Robert Magnuson',
    cat_early,
    'Shelf PIC-02',
    'Kuwento para sa mga nagsisimulang magbasa tungkol sa isang ibong natutong lumipad nang may tiwala sa sarili.',
    4,
    true,
    false
  ) on conflict do nothing;

  -- 6. Mga Sugilanon sa Bohol
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Mga Sugilanon sa Bohol',
    'Boholano Cultural Heritage Group',
    cat_heritage,
    'Shelf HER-01',
    'Koleksyon sa mga karaang sugilanon ug mito gikan sa lungsod sa Calape, Pangangan, ug tibuok lalawigan sa Bohol.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 7. Bohol: Land of the Chocolate Hills and Tarsiers
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Bohol: Land of the Chocolate Hills and Tarsiers',
    'Marianita C. Ramos',
    cat_heritage,
    'Shelf HER-02',
    'An illustrated guide to Bohol heritage, marine sanctuaries, coral reefs, and the world-famous Chocolate Hills.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 8. Sinugbuanong Binisaya: Unang Grado Kat-on sa Pagbasa
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Sinugbuanong Binisaya: Unang Grado Kat-on sa Pagbasa',
    'DepEd Region VII Bohol Division',
    cat_bisaya,
    'Shelf MTB-01',
    'Aklat-sanayan sa Mother Tongue-Based Multilingual Education (MTB-MLE) para sa mga mag-aaral sa Pangangan Elementary School.',
    6,
    true,
    false
  ) on conflict do nothing;

  -- 9. Illustrated Filipino-English-Cebuano Dictionary for Children
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Illustrated Filipino-English-Cebuano Dictionary for Children',
    'Adarna House Editorial',
    cat_ref,
    'Shelf REF-01',
    'Tri-lingual reference dictionary featuring colorful illustrations and example sentences in Filipino, English, and Cebuano.',
    2,
    true,
    false
  ) on conflict do nothing;

  -- 10. Science Adventures for Grade 4: Exploring Earth and Space
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Science Adventures for Grade 4: Exploring Earth and Space',
    'Evelyn L. Josue',
    cat_science,
    'Shelf SCI-01',
    'Interactive science textbook covering Philippine weather systems, rocks, soil, living organisms, and simple environmental experiments.',
    5,
    true,
    false
  ) on conflict do nothing;

  -- 11. Fun with Numbers: Math Puzzles & Games for Grade 3
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Fun with Numbers: Math Puzzles & Games for Grade 3',
    'Danica M. Perez',
    cat_math,
    'Shelf MTH-01',
    'Creative problem-solving exercises, multiplication riddles, and fraction games tailored for intermediate elementary pupils.',
    4,
    true,
    false
  ) on conflict do nothing;

  -- 12. Ang Mabait na Kalabaw (Edukasyon sa Pagpapakatao)
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Ang Mabait na Kalabaw',
    'Grace D. Chong',
    cat_values,
    'Shelf VAL-01',
    'Kuwentong nagtuturo ng sipag, tiyaga, paggalang sa kapwa, at pagmamalasakit sa kapaligiran para sa mababang paaralan.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 13. The Boy Who Harnessed the Wind (Librarian's Pick / Featured Book)
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'The Boy Who Harnessed the Wind (Young Readers Edition)',
    'William Kamkwamba & Bryan Mealer',
    cat_english,
    'Shelf ENG-01',
    'The inspiring true story of a 14-year-old boy in Malawi who built a windmill from scrapyard metal to bring electricity and water to his village.',
    4,
    true,
    true
  ) on conflict do nothing;

  -- 14. Charlotte''s Web
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Charlotte''s Web',
    'E.B. White',
    cat_english,
    'Shelf ENG-02',
    'The timeless story of friendship between a pig named Wilbur and a wise spider named Charlotte on the Zuckerman farm.',
    3,
    true,
    false
  ) on conflict do nothing;

  -- 15. Matatag Curriculum Science 4 Learning Activity Sheets
  insert into public.books (title, author, category_id, shelf_location, description, total_copies, is_sample, is_featured)
  values (
    'Matatag Curriculum Science 4 Learning Activity Sheets',
    'DepEd Bureau of Learning Resources',
    cat_deped,
    'Shelf MOD-01',
    'Official Department of Education MATATAG curriculum supplementary modules and hands-on worksheets for Pangangan ES pupils.',
    8,
    true,
    false
  ) on conflict do nothing;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Seed 3 Sample Announcements (is_sample = true)
-- -----------------------------------------------------------------------------

insert into public.announcements (title, content, event_date, badge, is_active, is_sample)
values
  (
    'National Reading Month Celebration',
    'Join our schoolwide Drop Everything And Read (DEAR) sessions every morning this November! Special storytelling sessions and reader certificates await active participants.',
    current_date + interval '7 days',
    'School Event',
    true,
    true
  ),
  (
    'Friday Storytelling Hour with Guest Teachers',
    'Every Friday afternoon, guest teachers and volunteer storytellers bring Philippine legends and Sinugbuanong Binisaya folktales to life in the library reading corner.',
    current_date + interval '3 days',
    'Weekly Event',
    true,
    true
  ),
  (
    'Brigada Pagbasa Book Donation Drive',
    'Help enrich our collection! Donate gently-used children''s storybooks, science magazines, or English-Filipino dictionaries at the library desk.',
    current_date + interval '14 days',
    'Community',
    true,
    true
  )
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 7. One-Click Sample Data Cleanup Function
-- -----------------------------------------------------------------------------

create or replace function public.clear_all_sample_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_book_ids uuid[];
begin
  -- Only admin and librarian can clear sample data
  if not (select public.is_admin()) then
    raise exception 'Only administrators and librarians can clear sample data.' using errcode = '42501';
  end if;

  -- Collect sample book IDs
  select array_agg(id) into v_book_ids
  from public.books
  where is_sample = true;

  if v_book_ids is not null and array_length(v_book_ids, 1) > 0 then
    -- Clean any return transactions on loans of sample books
    delete from public.return_transactions
    where loan_id in (select id from public.loans where book_id = any(v_book_ids));

    -- Clean any loans of sample books
    delete from public.loans
    where book_id = any(v_book_ids);

    -- Delete sample books
    delete from public.books
    where is_sample = true;

    get diagnostics v_count = row_count;
  end if;

  -- Delete sample announcements
  delete from public.announcements
  where is_sample = true;

  return v_count;
end;
$$;

revoke execute on function public.clear_all_sample_data() from anon, public;
grant execute on function public.clear_all_sample_data() to authenticated;
