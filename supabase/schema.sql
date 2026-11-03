create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text not null unique,
  online_elo integer not null default 1000 check (online_elo >= 100),
  online_games integer not null default 0 check (online_games >= 0),
  online_wins integer not null default 0 check (online_wins >= 0),
  online_draws integer not null default 0 check (online_draws >= 0),
  online_losses integer not null default 0 check (online_losses >= 0),
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

alter table public.profiles
  add column if not exists online_elo integer not null default 1000 check (online_elo >= 100),
  add column if not exists online_games integer not null default 0 check (online_games >= 0),
  add column if not exists online_wins integer not null default 0 check (online_wins >= 0),
  add column if not exists online_draws integer not null default 0 check (online_draws >= 0),
  add column if not exists online_losses integer not null default 0 check (online_losses >= 0);

alter table public.profiles enable row level security;

drop policy if exists "Usernames are visible to everyone" on public.profiles;
create policy "Usernames are visible to everyone"
  on public.profiles for select
  using (true);

grant select on public.profiles to anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

create or replace function public.settle_openboard_rated_game(
  p_white_id uuid,
  p_black_id uuid,
  p_white_score numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  white_rating integer;
  black_rating integer;
  white_expected numeric;
  black_expected numeric;
  new_white_rating integer;
  new_black_rating integer;
  white_result text;
  black_result text;
begin
  if p_white_id is null or p_black_id is null or p_white_id = p_black_id
    or p_white_score not in (0, 0.5, 1) then
    raise exception 'invalid_rated_game';
  end if;

  perform id
  from public.profiles
  where id in (p_white_id, p_black_id)
  order by id
  for update;

  select online_elo into white_rating from public.profiles where id = p_white_id;
  select online_elo into black_rating from public.profiles where id = p_black_id;
  if white_rating is null or black_rating is null then
    raise exception 'rated_player_profile_missing';
  end if;

  white_expected := 1 / (1 + power(10::numeric, (black_rating - white_rating)::numeric / 400));
  black_expected := 1 - white_expected;
  new_white_rating := greatest(100, round(white_rating + 32 * (p_white_score - white_expected))::integer);
  new_black_rating := greatest(100, round(black_rating + 32 * ((1 - p_white_score) - black_expected))::integer);
  white_result := case when p_white_score = 1 then 'win' when p_white_score = 0 then 'loss' else 'draw' end;
  black_result := case when p_white_score = 0 then 'win' when p_white_score = 1 then 'loss' else 'draw' end;

  update public.profiles
  set online_elo = new_white_rating,
      online_games = online_games + 1,
      online_wins = online_wins + case when white_result = 'win' then 1 else 0 end,
      online_draws = online_draws + case when white_result = 'draw' then 1 else 0 end,
      online_losses = online_losses + case when white_result = 'loss' then 1 else 0 end
  where id = p_white_id;

  update public.profiles
  set online_elo = new_black_rating,
      online_games = online_games + 1,
      online_wins = online_wins + case when black_result = 'win' then 1 else 0 end,
      online_draws = online_draws + case when black_result = 'draw' then 1 else 0 end,
      online_losses = online_losses + case when black_result = 'loss' then 1 else 0 end
  where id = p_black_id;

  return jsonb_build_object(
    'white', (select jsonb_build_object('username', username, 'online_elo', online_elo, 'online_games', online_games, 'online_wins', online_wins, 'online_draws', online_draws, 'online_losses', online_losses) from public.profiles where id = p_white_id),
    'black', (select jsonb_build_object('username', username, 'online_elo', online_elo, 'online_games', online_games, 'online_wins', online_wins, 'online_draws', online_draws, 'online_losses', online_losses) from public.profiles where id = p_black_id)
  );
end;
$$;

revoke all on function public.settle_openboard_rated_game(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.settle_openboard_rated_game(uuid, uuid, numeric) to service_role;

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
