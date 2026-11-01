create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

drop policy if exists "Usernames are visible to everyone" on public.profiles;
create policy "Usernames are visible to everyone"
  on public.profiles for select
  using (true);

grant select on public.profiles to anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

create or replace function public.claim_openboard_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := new.raw_user_meta_data ->> 'username';
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  if requested_username is null
    or requested_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'username_invalid';
  end if;

  insert into public.profiles (id, username, username_key)
  values (new.id, requested_username, lower(requested_username));

  return new;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;

drop trigger if exists on_openboard_user_created on auth.users;
create trigger on_openboard_user_created
  after insert on auth.users
  for each row execute procedure public.claim_openboard_username();

drop trigger if exists on_openboard_user_verified on auth.users;

insert into public.profiles (id, username, username_key)
select
  users.id,
  users.raw_user_meta_data ->> 'username',
  lower(users.raw_user_meta_data ->> 'username')
from auth.users as users
where users.raw_user_meta_data ->> 'username' ~ '^[A-Za-z0-9_]{3,20}$'
  and not exists (
    select 1 from public.profiles where profiles.id = users.id
  )
order by users.created_at, users.id
on conflict do nothing;
