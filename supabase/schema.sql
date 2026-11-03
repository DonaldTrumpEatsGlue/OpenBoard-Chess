create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text not null unique,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_data text check (
    avatar_data is null
    or (avatar_data like 'data:image/webp;base64,%' and char_length(avatar_data) <= 180000)
  ),
  online_elo integer not null default 1200 check (online_elo >= 100),
  online_games integer not null default 0 check (online_games >= 0),
  online_wins integer not null default 0 check (online_wins >= 0),
  online_draws integer not null default 0 check (online_draws >= 0),
  online_losses integer not null default 0 check (online_losses >= 0),
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

alter table public.profiles
  add column if not exists country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  add column if not exists bio text not null default '' check (char_length(bio) <= 160),
  add column if not exists avatar_data text check (
    avatar_data is null
    or (avatar_data like 'data:image/webp;base64,%' and char_length(avatar_data) <= 180000)
  ),
  add column if not exists online_elo integer not null default 1200 check (online_elo >= 100),
  add column if not exists online_games integer not null default 0 check (online_games >= 0),
  add column if not exists online_wins integer not null default 0 check (online_wins >= 0),
  add column if not exists online_draws integer not null default 0 check (online_draws >= 0),
  add column if not exists online_losses integer not null default 0 check (online_losses >= 0);

alter table public.profiles alter column online_elo set default 1200;

update public.profiles
set online_elo = 1200
where online_games = 0 and online_elo = 1000;

alter table public.profiles enable row level security;

drop policy if exists "Usernames are visible to everyone" on public.profiles;
create policy "Usernames are visible to everyone"
  on public.profiles for select
  using (true);

grant select on public.profiles to anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_distinct_users check (sender_id <> recipient_id)
);

create unique index if not exists friend_requests_one_pending_direction
  on public.friend_requests (sender_id, recipient_id)
  where status = 'pending';

create table if not exists public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendships_ordered_users check (user_low < user_high)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_distinct_users check (blocker_id <> blocked_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_distinct_users check (sender_id <> recipient_id)
);

create index if not exists direct_messages_conversation_order
  on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists direct_messages_unread
  on public.direct_messages (recipient_id, sender_id, created_at desc)
  where read_at is null;

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;
revoke all on public.friend_requests, public.friendships, public.direct_messages, public.user_blocks from public, anon, authenticated;
grant select, insert, update, delete on public.friend_requests, public.friendships, public.direct_messages, public.user_blocks to service_role;

create or replace function public.openboard_social_overview(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', peer.id,
          'username', peer.username,
          'countryCode', peer.country_code,
          'bio', peer.bio,
          'avatarData', peer.avatar_data,
          'lastMessage', latest.body,
          'lastMessageAt', latest.created_at,
          'lastMessageFromMe', latest.sender_id = p_user_id,
          'unreadCount', coalesce(unread.count, 0)
        )
        order by coalesce(latest.created_at, friendship.created_at) desc
      )
      from public.friendships as friendship
      join public.profiles as peer
        on peer.id = case when friendship.user_low = p_user_id
          then friendship.user_high else friendship.user_low end
      left join lateral (
        select message.body, message.created_at, message.sender_id
        from public.direct_messages as message
        where (message.sender_id = p_user_id and message.recipient_id = peer.id)
          or (message.sender_id = peer.id and message.recipient_id = p_user_id)
        order by message.created_at desc
        limit 1
      ) as latest on true
      left join lateral (
        select count(*) as count
        from public.direct_messages as message
        where message.sender_id = peer.id
          and message.recipient_id = p_user_id
          and message.read_at is null
      ) as unread on true
      where p_user_id in (friendship.user_low, friendship.user_high)
        and not exists (
          select 1 from public.user_blocks as block
          where (block.blocker_id = p_user_id and block.blocked_id = peer.id)
            or (block.blocker_id = peer.id and block.blocked_id = p_user_id)
        )
    ), '[]'::jsonb),
    'incomingRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id,
        'username', sender.username,
        'countryCode', sender.country_code,
        'avatarData', sender.avatar_data,
        'createdAt', request.created_at
      ) order by request.created_at desc)
      from public.friend_requests as request
      join public.profiles as sender on sender.id = request.sender_id
      where request.recipient_id = p_user_id and request.status = 'pending'
        and not exists (
          select 1 from public.user_blocks as block
          where (block.blocker_id = p_user_id and block.blocked_id = sender.id)
            or (block.blocker_id = sender.id and block.blocked_id = p_user_id)
        )
    ), '[]'::jsonb),
    'outgoingRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', request.id,
        'username', recipient.username,
        'countryCode', recipient.country_code,
        'avatarData', recipient.avatar_data,
        'createdAt', request.created_at
      ) order by request.created_at desc)
      from public.friend_requests as request
      join public.profiles as recipient on recipient.id = request.recipient_id
      where request.sender_id = p_user_id and request.status = 'pending'
        and not exists (
          select 1 from public.user_blocks as block
          where (block.blocker_id = p_user_id and block.blocked_id = recipient.id)
            or (block.blocker_id = recipient.id and block.blocked_id = p_user_id)
        )
    ), '[]'::jsonb),
    'blockedUsers', coalesce((
      select jsonb_agg(jsonb_build_object('id', blocked.id, 'username', blocked.username))
      from public.user_blocks as block
      join public.profiles as blocked on blocked.id = block.blocked_id
      where block.blocker_id = p_user_id
    ), '[]'::jsonb),
    'blockedBy', coalesce((
      select jsonb_agg(block.blocker_id)
      from public.user_blocks as block
      where block.blocked_id = p_user_id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.openboard_send_friend_request(p_sender_id uuid, p_username_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient public.profiles%rowtype;
  existing_request public.friend_requests%rowtype;
  v_user_low uuid;
  v_user_high uuid;
begin
  select * into recipient from public.profiles where username_key = lower(p_username_key);
  if recipient.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if recipient.id = p_sender_id then
    raise exception 'You cannot send a friend request to yourself.';
  end if;
  if exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = p_sender_id and block.blocked_id = recipient.id)
      or (block.blocker_id = recipient.id and block.blocked_id = p_sender_id)
  ) then
    raise exception 'This player cannot receive a friend request.';
  end if;
  v_user_low := least(p_sender_id, recipient.id);
  v_user_high := greatest(p_sender_id, recipient.id);
  perform pg_advisory_xact_lock(hashtextextended(v_user_low::text || ':' || v_user_high::text, 0));

  if exists (
    select 1
    from public.friendships as friendship
    where friendship.user_low = v_user_low
      and friendship.user_high = v_user_high
  ) then
    return jsonb_build_object('status', 'already_friends');
  end if;
  select * into existing_request
  from public.friend_requests
  where status = 'pending'
    and ((sender_id = p_sender_id and recipient_id = recipient.id)
      or (sender_id = recipient.id and recipient_id = p_sender_id))
  order by created_at desc
  limit 1;
  if existing_request.id is not null then
    return jsonb_build_object(
      'status', case when existing_request.sender_id = p_sender_id then 'pending' else 'incoming' end,
      'id', existing_request.id
    );
  end if;

  insert into public.friend_requests (sender_id, recipient_id)
  values (p_sender_id, recipient.id)
  returning * into existing_request;
  return jsonb_build_object('status', 'pending', 'id', existing_request.id);
end;
$$;

create or replace function public.openboard_respond_friend_request(
  p_user_id uuid,
  p_request_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.friend_requests%rowtype;
begin
  select * into request
  from public.friend_requests
  where id = p_request_id and recipient_id = p_user_id and status = 'pending'
  for update;
  if request.id is null then
    raise exception 'That friend request is no longer available.';
  end if;
  if exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = p_user_id and block.blocked_id = request.sender_id)
      or (block.blocker_id = request.sender_id and block.blocked_id = p_user_id)
  ) then
    raise exception 'That friend request is no longer available.';
  end if;

  if p_accept then
    insert into public.friendships (user_low, user_high)
    values (least(request.sender_id, request.recipient_id), greatest(request.sender_id, request.recipient_id))
    on conflict do nothing;
    update public.friend_requests
    set status = 'accepted', updated_at = now()
    where id = request.id;
  else
    update public.friend_requests
    set status = 'declined', updated_at = now()
    where id = request.id;
  end if;
  return jsonb_build_object('accepted', p_accept);
end;
$$;

create or replace function public.openboard_send_direct_message(
  p_sender_id uuid,
  p_recipient_username_key text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient public.profiles%rowtype;
  inserted_message public.direct_messages%rowtype;
begin
  select * into recipient
  from public.profiles
  where username_key = lower(p_recipient_username_key);
  if recipient.id is null then
    raise exception 'No player was found with that username.';
  end if;
  if recipient.id = p_sender_id then
    raise exception 'You cannot message yourself.';
  end if;
  if exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = p_sender_id and block.blocked_id = recipient.id)
      or (block.blocker_id = recipient.id and block.blocked_id = p_sender_id)
  ) then
    raise exception 'You cannot message this player.';
  end if;
  if not exists (
    select 1 from public.friendships as friendship
    where friendship.user_low = least(p_sender_id, recipient.id)
      and friendship.user_high = greatest(p_sender_id, recipient.id)
  ) then
    raise exception 'You can message players after you are friends.';
  end if;
  insert into public.direct_messages (sender_id, recipient_id, body)
  values (p_sender_id, recipient.id, p_body)
  returning * into inserted_message;
  return jsonb_build_object(
    'id', inserted_message.id,
    'senderId', inserted_message.sender_id,
    'recipientId', inserted_message.recipient_id,
    'body', inserted_message.body,
    'createdAt', inserted_message.created_at,
    'readAt', inserted_message.read_at
  );
end;
$$;

create or replace function public.openboard_load_direct_messages(p_user_id uuid, p_peer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  messages jsonb;
begin
  if p_user_id = p_peer_id or not exists (
    select 1 from public.friendships as friendship
    where friendship.user_low = least(p_user_id, p_peer_id)
      and friendship.user_high = greatest(p_user_id, p_peer_id)
  ) or exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = p_user_id and block.blocked_id = p_peer_id)
      or (block.blocker_id = p_peer_id and block.blocked_id = p_user_id)
  ) then
    raise exception 'You can message players after you are friends.';
  end if;
  if exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = p_user_id and block.blocked_id = p_peer_id)
      or (block.blocker_id = p_peer_id and block.blocked_id = p_user_id)
  ) then
    raise exception 'You cannot message this player.';
  end if;

  update public.direct_messages
  set read_at = now()
  where sender_id = p_peer_id and recipient_id = p_user_id and read_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', message.id,
    'senderId', message.sender_id,
    'recipientId', message.recipient_id,
    'body', message.body,
    'createdAt', message.created_at,
    'readAt', message.read_at
  ) order by message.created_at), '[]'::jsonb)
  into messages
  from (
    select *
    from public.direct_messages
    where (sender_id = p_user_id and recipient_id = p_peer_id)
      or (sender_id = p_peer_id and recipient_id = p_user_id)
    order by created_at desc
    limit 100
  ) as message;
  return messages;
end;
$$;

revoke all on function public.openboard_social_overview(uuid) from public, anon, authenticated;
revoke all on function public.openboard_send_friend_request(uuid, text) from public, anon, authenticated;
revoke all on function public.openboard_respond_friend_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.openboard_send_direct_message(uuid, text, text) from public, anon, authenticated;
revoke all on function public.openboard_load_direct_messages(uuid, uuid) from public, anon, authenticated;
grant execute on function public.openboard_social_overview(uuid) to service_role;
grant execute on function public.openboard_send_friend_request(uuid, text) to service_role;
grant execute on function public.openboard_respond_friend_request(uuid, uuid, boolean) to service_role;
grant execute on function public.openboard_send_direct_message(uuid, text, text) to service_role;
grant execute on function public.openboard_load_direct_messages(uuid, uuid) to service_role;

create or replace function public.openboard_set_profile_country(p_user_id uuid, p_country_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_country_code text;
begin
  if p_country_code is null or p_country_code !~ '^[A-Za-z]{2}$' then
    raise exception 'Choose a valid two-letter country code.';
  end if;

  update public.profiles
  set country_code = upper(p_country_code)
  where id = p_user_id
  returning country_code into updated_country_code;

  if updated_country_code is null then
    raise exception 'Your player profile could not be found.';
  end if;

  return jsonb_build_object('countryCode', updated_country_code);
end;
$$;

revoke all on function public.openboard_set_profile_country(uuid, text) from public, anon, authenticated;
grant execute on function public.openboard_set_profile_country(uuid, text) to service_role;

create or replace function public.openboard_update_profile(
  p_user_id uuid,
  p_country_code text,
  p_bio text,
  p_avatar_data text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if p_country_code is not null and p_country_code !~ '^[A-Za-z]{2}$' then
    raise exception 'Choose a valid two-letter country code.';
  end if;
  if p_bio is not null and char_length(p_bio) > 160 then
    raise exception 'Your bio must be 160 characters or fewer.';
  end if;
  if p_avatar_data is not null and p_avatar_data <> ''
    and (p_avatar_data not like 'data:image/webp;base64,%' or char_length(p_avatar_data) > 180000) then
    raise exception 'Choose a valid profile image.';
  end if;

  update public.profiles
  set country_code = coalesce(upper(p_country_code), country_code),
      bio = coalesce(p_bio, bio),
      avatar_data = case
        when p_avatar_data = '' then null
        else coalesce(p_avatar_data, avatar_data)
      end
  where id = p_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Your player profile could not be found.';
  end if;

  return jsonb_build_object(
    'id', updated_profile.id,
    'username', updated_profile.username,
    'countryCode', updated_profile.country_code,
    'bio', updated_profile.bio,
    'avatarData', updated_profile.avatar_data
  );
end;
$$;

create or replace function public.openboard_block_user(
  p_user_id uuid,
  p_target_username_key text,
  p_block boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles%rowtype;
begin
  select * into target from public.profiles where username_key = lower(p_target_username_key);
  if target.id is null or target.id = p_user_id then
    raise exception 'No other player was found with that username.';
  end if;

  if p_block then
    insert into public.user_blocks (blocker_id, blocked_id)
    values (p_user_id, target.id)
    on conflict do nothing;
    delete from public.friendships
    where user_low = least(p_user_id, target.id) and user_high = greatest(p_user_id, target.id);
    delete from public.friend_requests
    where (sender_id = p_user_id and recipient_id = target.id)
      or (sender_id = target.id and recipient_id = p_user_id);
  else
    delete from public.user_blocks where blocker_id = p_user_id and blocked_id = target.id;
  end if;

  return jsonb_build_object('blocked', p_block);
end;
$$;

revoke all on function public.openboard_update_profile(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.openboard_block_user(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.openboard_update_profile(uuid, text, text, text) to service_role;
grant execute on function public.openboard_block_user(uuid, text, boolean) to service_role;

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
  requested_country_code text := new.raw_user_meta_data ->> 'country_code';
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  if requested_username is null
    or requested_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'username_invalid';
  end if;

  insert into public.profiles (id, username, username_key, country_code)
  values (
    new.id,
    requested_username,
    lower(requested_username),
    case when requested_country_code ~ '^[A-Za-z]{2}$' then upper(requested_country_code) else null end
  );

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

insert into public.profiles (id, username, username_key, country_code)
select
  users.id,
  users.raw_user_meta_data ->> 'username',
  lower(users.raw_user_meta_data ->> 'username'),
  case
    when users.raw_user_meta_data ->> 'country_code' ~ '^[A-Za-z]{2}$'
      then upper(users.raw_user_meta_data ->> 'country_code')
    else null
  end
from auth.users as users
where users.raw_user_meta_data ->> 'username' ~ '^[A-Za-z0-9_]{3,20}$'
  and not exists (
    select 1 from public.profiles where profiles.id = users.id
  )
order by users.created_at, users.id
on conflict do nothing;

update public.profiles as profile
set country_code = upper(users.raw_user_meta_data ->> 'country_code')
from auth.users as users
where profile.id = users.id
  and profile.country_code is null
  and users.raw_user_meta_data ->> 'country_code' ~ '^[A-Za-z]{2}$';
