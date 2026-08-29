alter table public.profiles
  add column username text,
  add column avatar_url text,
  add column terms_version text,
  add column terms_accepted_at timestamptz,
  add column account_created_at timestamptz;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[[:alnum:]_]{3,20}$'),
  add constraint profiles_account_terms_check
  check (
    (account_created_at is null and terms_version is null and terms_accepted_at is null)
    or (account_created_at is not null and terms_version is not null and terms_accepted_at is not null)
  );

create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table private.riot_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  riot_id text not null,
  normalized_riot_id text not null,
  puuid text,
  verification_status text not null default 'manual'
    check (verification_status in ('manual', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (owner_id, normalized_riot_id),
  unique (puuid),
  check (riot_id ~ '^[^#]{3,16}#[[:alnum:]]{3,5}$'),
  check (puuid is null or verification_status = 'verified')
);

create table private.game_account_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  riot_account_id uuid not null references private.riot_accounts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  game text not null check (game in ('valorant', 'league-of-legends')),
  rank_system text not null,
  rank_value integer not null,
  min_rank integer not null,
  max_rank integer not null,
  party_size smallint not null check (party_size between 1 and 4),
  target_size smallint not null check (target_size between 2 and 5),
  servers text[] not null,
  queue_types text[] not null,
  roles text[] not null default '{}'::text[],
  maps text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (riot_account_id, game),
  check (min_rank <= rank_value and rank_value <= max_rank),
  check (
    (
      game = 'valorant'
      and rank_system = 'valorant'
      and rank_value between 0 and 24
      and min_rank between 0 and 24
      and max_rank between 0 and 24
      and cardinality(servers) between 1 and 6
      and servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[]
      and cardinality(queue_types) between 1 and 2
      and queue_types <@ array['competitive', 'unrated']::text[]
      and cardinality(roles) = 0
      and cardinality(maps) = 0
      and party_size <= target_size
      and target_size = 5
    ) or (
      game = 'league-of-legends'
      and rank_system in ('lol-solo', 'lol-flex')
      and rank_value between 0 and 30
      and min_rank between 0 and 30
      and max_rank between 0 and 30
      and cardinality(servers) = 1
      and servers <@ array['tr1', 'euw1']::text[]
      and cardinality(queue_types) = 1
      and cardinality(roles) = party_size
      and roles <@ array['top', 'jungle', 'mid', 'bottom', 'support']::text[]
      and public.text_array_is_unique(roles)
      and cardinality(maps) = 0
      and (
        (rank_system = 'lol-solo' and queue_types = array['solo-duo']::text[] and party_size = 1 and target_size = 2)
        or (rank_system = 'lol-flex' and queue_types = array['flex']::text[] and party_size <= target_size and target_size = 5)
      )
    )
  )
);

create index riot_accounts_owner_last_used_idx
  on private.riot_accounts(owner_id, last_used_at desc nulls last);
create index game_account_preferences_owner_game_idx
  on private.game_account_preferences(owner_id, game, updated_at desc);

alter table private.riot_accounts enable row level security;
alter table private.game_account_preferences enable row level security;
revoke all on private.riot_accounts, private.game_account_preferences from public, anon, authenticated;

create function private.normalize_riot_id(p_riot_id text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select lower(trim(p_riot_id));
$$;

create function private.username_seed(p_seed text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text := trim(both '_' from regexp_replace(coalesce(trim(p_seed), ''), '[^[:alnum:]_]+', '_', 'g'));
  suffix text;
begin
  candidate := left(candidate, 20);
  if char_length(candidate) < 3 then candidate := 'oyuncu'; end if;
  if not exists (select 1 from public.profiles where lower(username) = lower(candidate)) then
    return candidate;
  end if;
  loop
    suffix := '_' || left(encode(extensions.gen_random_bytes(4), 'hex'), 6);
    candidate := left(regexp_replace(candidate, '_[0-9a-f]{6}$', ''), 20 - char_length(suffix)) || suffix;
    exit when not exists (select 1 from public.profiles where lower(username) = lower(candidate));
  end loop;
  return candidate;
end;
$$;

create function private.ensure_account_profile(
  p_seed text,
  p_avatar_url text,
  p_terms_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_is_anonymous boolean;
  selected_username text;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  select is_anonymous into current_is_anonymous from auth.users where id = current_user_id;
  if coalesce(current_is_anonymous, true) then raise exception 'Kalıcı hesap gerekli'; end if;
  if coalesce(p_terms_version, '') <> '2026-08-29' then raise exception 'Sözleşme kabulü gerekli'; end if;

  select username into selected_username from public.profiles where id = current_user_id;
  if selected_username is null then selected_username := private.username_seed(p_seed); end if;

  insert into public.profiles(
    id, riot_id, rank_value, game, rank_system, username, avatar_url,
    terms_version, terms_accepted_at, account_created_at, last_seen_at
  ) values (
    current_user_id, 'Oyuncu#TR1', 0, 'valorant', 'valorant', selected_username,
    nullif(left(trim(p_avatar_url), 500), ''), p_terms_version, now(), now(), now()
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    terms_version = excluded.terms_version,
    terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
    account_created_at = coalesce(public.profiles.account_created_at, excluded.account_created_at);

  return private.get_account_overview();
end;
$$;

create function private.get_account_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  result jsonb;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  select jsonb_build_object(
    'userId', u.id,
    'isAnonymous', u.is_anonymous,
    'email', u.email,
    'username', p.username,
    'avatarUrl', p.avatar_url,
    'termsVersion', p.terms_version,
    'providers', coalesce((
      select jsonb_agg(distinct i.provider order by i.provider)
      from auth.identities i where i.user_id = u.id
    ), '[]'::jsonb),
    'riotAccounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'riotId', r.riot_id,
        'verificationStatus', r.verification_status,
        'lastUsedAt', r.last_used_at,
        'preferences', coalesce((
          select jsonb_agg(jsonb_build_object(
            'game', g.game,
            'rankSystem', g.rank_system,
            'rank', g.rank_value,
            'minRank', g.min_rank,
            'maxRank', g.max_rank,
            'partySize', g.party_size,
            'targetSize', g.target_size,
            'servers', g.servers,
            'queueTypes', g.queue_types,
            'roles', g.roles,
            'maps', g.maps
          ) order by g.game)
          from private.game_account_preferences g where g.riot_account_id = r.id
        ), '[]'::jsonb)
      ) order by r.last_used_at desc nulls last, r.created_at)
      from private.riot_accounts r where r.owner_id = u.id
    ), '[]'::jsonb)
  ) into result
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = current_user_id;
  return coalesce(result, '{}'::jsonb);
end;
$$;

create function private.update_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  cleaned text := trim(p_username);
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if cleaned !~ '^[[:alnum:]_]{3,20}$' then raise exception 'Kullanıcı adı 3-20 karakter olmalı'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(cleaned) and id <> current_user_id) then
    raise exception 'Bu kullanıcı adı kullanılıyor';
  end if;
  update public.profiles set username = cleaned where id = current_user_id and account_created_at is not null;
  if not found then raise exception 'Kalıcı hesap gerekli'; end if;
  return cleaned;
end;
$$;

create function private.save_riot_account(
  p_account_id uuid,
  p_riot_id text,
  p_game text,
  p_preferences jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  account_id uuid := p_account_id;
  cleaned_riot_id text := trim(p_riot_id);
  normalized text := private.normalize_riot_id(p_riot_id);
  account_count integer;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id and account_created_at is not null) then
    raise exception 'Kalıcı hesap gerekli';
  end if;
  if cleaned_riot_id !~ '^[^#]{3,16}#[[:alnum:]]{3,5}$' then raise exception 'Geçersiz Riot ID'; end if;
  if p_game not in ('valorant', 'league-of-legends') then raise exception 'Geçersiz oyun'; end if;

  if account_id is null then
    select id into account_id
    from private.riot_accounts
    where owner_id = current_user_id and normalized_riot_id = normalized;

    if account_id is null then
      select count(*) into account_count from private.riot_accounts where owner_id = current_user_id;
      if account_count >= 10 then raise exception 'En fazla 10 Riot hesabı kaydedebilirsin'; end if;
      insert into private.riot_accounts(owner_id, riot_id, normalized_riot_id)
      values (current_user_id, cleaned_riot_id, normalized)
      returning id into account_id;
    else
      update private.riot_accounts set riot_id = cleaned_riot_id, updated_at = now()
      where id = account_id;
    end if;
  else
    update private.riot_accounts set riot_id = cleaned_riot_id, normalized_riot_id = normalized, updated_at = now()
    where id = account_id and owner_id = current_user_id;
    if not found then raise exception 'Riot hesabı bulunamadı'; end if;
  end if;

  insert into private.game_account_preferences(
    riot_account_id, owner_id, game, rank_system, rank_value, min_rank, max_rank,
    party_size, target_size, servers, queue_types, roles, maps
  ) values (
    account_id, current_user_id, p_game,
    p_preferences->>'rankSystem',
    (p_preferences->>'rank')::integer,
    (p_preferences->>'minRank')::integer,
    (p_preferences->>'maxRank')::integer,
    (p_preferences->>'partySize')::smallint,
    (p_preferences->>'targetSize')::smallint,
    array(select jsonb_array_elements_text(coalesce(p_preferences->'servers', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'queueTypes', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'roles', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'maps', '[]'::jsonb)))
  )
  on conflict (riot_account_id, game) do update set
    rank_system = excluded.rank_system,
    rank_value = excluded.rank_value,
    min_rank = excluded.min_rank,
    max_rank = excluded.max_rank,
    party_size = excluded.party_size,
    target_size = excluded.target_size,
    servers = excluded.servers,
    queue_types = excluded.queue_types,
    roles = excluded.roles,
    maps = excluded.maps,
    updated_at = now();

  return account_id;
exception when unique_violation then
  raise exception 'Bu Riot ID zaten kayıtlı';
end;
$$;

create function private.delete_riot_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  delete from private.riot_accounts where id = p_account_id and owner_id = auth.uid();
  if not found then raise exception 'Riot hesabı bulunamadı'; end if;
end;
$$;

create function private.touch_riot_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  update private.riot_accounts set last_used_at = now() where id = p_account_id and owner_id = auth.uid();
  if not found then raise exception 'Riot hesabı bulunamadı'; end if;
end;
$$;

alter function private.get_my_status() rename to get_my_status_core;
revoke all on function private.get_my_status_core() from public, anon, authenticated;

create function private.get_my_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb := private.get_my_status_core();
  enriched_members jsonb;
begin
  if jsonb_typeof(payload->'members') = 'array' then
    select coalesce(jsonb_agg(member.value || jsonb_build_object('crewfindUsername', p.username)), '[]'::jsonb)
    into enriched_members
    from jsonb_array_elements(payload->'members') member(value)
    left join public.profiles p on p.id = (member.value->>'playerId')::uuid;
    payload := jsonb_set(payload, '{members}', enriched_members, true);
  end if;
  return payload;
end;
$$;

create function public.ensure_account_profile(p_seed text, p_avatar_url text, p_terms_version text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-profile:minute', 10, 60);
  return private.ensure_account_profile(p_seed, p_avatar_url, p_terms_version);
end;
$$;

create function public.get_account_overview()
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-read:minute', 30, 60);
  return private.get_account_overview();
end;
$$;

create function public.update_my_username(p_username text)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-username:hour', 10, 3600);
  return private.update_my_username(p_username);
end;
$$;

create function public.save_riot_account(p_account_id uuid, p_riot_id text, p_game text, p_preferences jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-save:minute', 20, 60);
  return private.save_riot_account(p_account_id, p_riot_id, p_game, p_preferences);
end;
$$;

create function public.delete_riot_account(p_account_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-delete:minute', 10, 60);
  perform private.delete_riot_account(p_account_id);
end;
$$;

create function public.touch_riot_account(p_account_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.enforce_user_rate_limit('account-touch:minute', 20, 60);
  perform private.touch_riot_account(p_account_id);
end;
$$;

revoke all on function private.normalize_riot_id(text) from public, anon, authenticated;
revoke all on function private.username_seed(text) from public, anon, authenticated;
revoke all on function private.ensure_account_profile(text, text, text) from public, anon;
revoke all on function private.get_account_overview() from public, anon;
revoke all on function private.update_my_username(text) from public, anon;
revoke all on function private.save_riot_account(uuid, text, text, jsonb) from public, anon;
revoke all on function private.delete_riot_account(uuid) from public, anon;
revoke all on function private.touch_riot_account(uuid) from public, anon;
revoke all on function private.get_my_status() from public, anon;

grant execute on function private.ensure_account_profile(text, text, text) to authenticated;
grant execute on function private.get_account_overview() to authenticated;
grant execute on function private.update_my_username(text) to authenticated;
grant execute on function private.save_riot_account(uuid, text, text, jsonb) to authenticated;
grant execute on function private.delete_riot_account(uuid) to authenticated;
grant execute on function private.touch_riot_account(uuid) to authenticated;
grant execute on function private.get_my_status() to authenticated;

revoke all on function public.ensure_account_profile(text, text, text) from public, anon;
revoke all on function public.get_account_overview() from public, anon;
revoke all on function public.update_my_username(text) from public, anon;
revoke all on function public.save_riot_account(uuid, text, text, jsonb) from public, anon;
revoke all on function public.delete_riot_account(uuid) from public, anon;
revoke all on function public.touch_riot_account(uuid) from public, anon;
grant execute on function public.ensure_account_profile(text, text, text) to authenticated;
grant execute on function public.get_account_overview() to authenticated;
grant execute on function public.update_my_username(text) to authenticated;
grant execute on function public.save_riot_account(uuid, text, text, jsonb) to authenticated;
grant execute on function public.delete_riot_account(uuid) to authenticated;
grant execute on function public.touch_riot_account(uuid) to authenticated;

comment on table private.riot_accounts is 'User-owned Riot identities; inaccessible through the Data API.';
comment on table private.game_account_preferences is 'Saved matchmaking preferences; accessible only through narrow RPCs.';
