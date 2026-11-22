-- Migration 3: starter reference data (no personal data, no accounts).
-- Safe to review and edit before applying. Admins can rename or deactivate
-- these later in the app.

insert into public.grade_levels (name, sort_order) values
  ('Kindergarten', 0),
  ('Grade 1', 1),
  ('Grade 2', 2),
  ('Grade 3', 3),
  ('Grade 4', 4),
  ('Grade 5', 5),
  ('Grade 6', 6)
on conflict do nothing;

-- A section with no grade level, for teachers and other non-class borrowers
-- (the legacy prototype used "Faculty").
insert into public.sections (grade_level_id, name) values
  (null, 'Faculty')
on conflict do nothing;
