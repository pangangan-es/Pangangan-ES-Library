-- Migration 5: User management, librarian administrative access, and temporary passwords
--
-- 1. Adds must_change_password column to public.profiles.
-- 2. Grants librarian the same administrative powers as admin in private.is_admin().
-- 3. Adds complete_password_change() and update_my_profile() RPC functions.

-- 1. Add must_change_password column (defaults to false for existing users, true for new users)
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- 2. Update private.is_admin() so librarians have all system administrative functions as admin
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'librarian')
      and p.is_active
  );
$$;

-- 3. RPC for signed-in user to complete their first-time password change
create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = (select auth.uid());
end;
$$;

revoke execute on function public.complete_password_change() from anon, public;
grant execute on function public.complete_password_change() to authenticated;

-- 4. RPC for any signed-in user to update their own full name on their account page
create or replace function public.update_my_profile(p_full_name text)
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

  update public.profiles
  set full_name = btrim(p_full_name),
      updated_at = now()
  where id = (select auth.uid())
    and is_active;
end;
$$;

revoke execute on function public.update_my_profile(text) from anon, public;
grant execute on function public.update_my_profile(text) to authenticated;
