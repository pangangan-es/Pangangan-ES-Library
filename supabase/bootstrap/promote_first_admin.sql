-- ===========================================================================
-- FIRST ADMINISTRATOR BOOTSTRAP  (run once, by a trusted operator)
-- ===========================================================================
-- Why this exists: the app has no public sign-up and only admins can create
-- staff accounts, so the very first admin must be created outside the app.
--
-- Steps
--  1. Apply the three migrations in supabase/migrations/ first.
--  2. In the Supabase Dashboard: Authentication > Users > "Invite user"
--     (or "Add user" and let the person reset their password). Use the
--     real email address of the person who will be the first admin.
--     They set their own password; you never choose or see it.
--  3. Open Dashboard > SQL Editor (runs as the postgres role) and run the
--     statement below after replacing ALL THREE placeholders.
--  4. The person can now sign in at /login and create other staff accounts.
--
-- This file contains placeholders only. Do not commit real names or emails.
-- It refuses to run if an active admin already exists.
-- ===========================================================================

do $$
declare
  v_email    text := 'REPLACE_WITH_ADMIN_EMAIL';
  v_name     text := 'REPLACE WITH FULL NAME';
  v_username text := 'replace.with.username';   -- 3-32 chars: a-z 0-9 . _ -
  v_user_id  uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin' and is_active) then
    raise exception 'An active admin already exists. Use the app to manage accounts.';
  end if;

  if v_email like 'REPLACE%' or v_name like 'REPLACE%' or v_username like 'replace.%' then
    raise exception 'Edit the three placeholders before running this script.';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_email);
  if v_user_id is null then
    raise exception 'No Supabase Auth user with that email. Invite/add the user first (step 2).';
  end if;

  insert into public.profiles (id, full_name, username, username_normalized, email, role)
  values (v_user_id, v_name, v_username, lower(btrim(v_username)), lower(v_email), 'admin');

  insert into public.audit_log (action, table_name, row_id, detail)
  values ('bootstrap_admin', 'profiles', v_user_id::text, jsonb_build_object('note', 'first admin promoted by operator'));
end $$;
