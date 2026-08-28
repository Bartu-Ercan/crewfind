alter table public.profiles
  alter column rank_value type integer using rank_value::integer,
  add column game text not null default 'valorant',
  add column rank_system text not null default 'valorant',
  add column contact_value text;

alter table public.queue_entries
  alter column rank_value type integer using rank_value::integer,
  alter column min_rank type integer using min_rank::integer,
  alter column max_rank type integer using max_rank::integer,
  add column game text not null default 'valorant',
  add column rank_system text not null default 'valorant',
  add column contact_value text,
  add column roles text[] not null default '{}'::text[],
  add column maps text[] not null default '{}'::text[];

create or replace function public.text_array_is_unique(values_to_check text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(values_to_check) = count(distinct item)
  from unnest(values_to_check) item;
$$;

alter table public.profiles
  drop constraint if exists profiles_rank_value_check;

alter table public.queue_entries
  drop constraint if exists queue_entries_rank_value_check,
  drop constraint if exists queue_entries_min_rank_check,
  drop constraint if exists queue_entries_max_rank_check,
  drop constraint if exists queue_entries_check,
  drop constraint if exists queue_entries_server_check,
  drop constraint if exists queue_entries_queue_type_check,
  drop constraint if exists queue_entries_servers_check,
  drop constraint if exists queue_entries_queue_types_check;

alter table public.profiles
  add constraint profiles_game_context_check check (
    (game = 'valorant' and rank_system = 'valorant' and rank_value between 0 and 24)
    or (game = 'league-of-legends' and rank_system in ('lol-solo', 'lol-flex') and rank_value between 0 and 30)
    or (game = 'cs2' and rank_system = 'cs2-premier' and rank_value between 1000 and 50000)
    or (game = 'cs2' and rank_system = 'cs2-competitive' and rank_value between 0 and 17)
  );

alter table public.queue_entries
  add constraint queue_entries_rank_order_check check (min_rank <= rank_value and rank_value <= max_rank),
  add constraint queue_entries_game_context_check check (
    (
      game = 'valorant'
      and rank_system = 'valorant'
      and rank_value between 0 and 24 and min_rank between 0 and 24 and max_rank between 0 and 24
      and cardinality(servers) between 1 and 6
      and servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[]
      and cardinality(queue_types) between 1 and 2
      and queue_types <@ array['competitive', 'unrated']::text[]
      and cardinality(roles) = 0 and cardinality(maps) = 0
    ) or (
      game = 'league-of-legends'
      and rank_system in ('lol-solo', 'lol-flex')
      and rank_value between 0 and 30 and min_rank between 0 and 30 and max_rank between 0 and 30
      and cardinality(servers) = 1 and servers <@ array['tr1', 'euw1']::text[]
      and cardinality(queue_types) = 1
      and ((rank_system = 'lol-solo' and queue_types = array['solo-duo']::text[])
        or (rank_system = 'lol-flex' and queue_types = array['flex']::text[]))
      and cardinality(roles) = party_size
      and roles <@ array['top', 'jungle', 'mid', 'bottom', 'support']::text[]
      and public.text_array_is_unique(roles)
      and cardinality(maps) = 0
    ) or (
      game = 'cs2'
      and rank_system = 'cs2-premier'
      and rank_value between 1000 and 50000 and min_rank between 1000 and 50000 and max_rank between 1000 and 50000
      and cardinality(servers) between 1 and 6
      and servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[]
      and queue_types = array['premier']::text[]
      and cardinality(roles) = 0 and cardinality(maps) = 0
      and contact_value ~ '^[0-9]{5,12}$'
    ) or (
      game = 'cs2'
      and rank_system = 'cs2-competitive'
      and rank_value between 0 and 17 and min_rank between 0 and 17 and max_rank between 0 and 17
      and cardinality(servers) between 1 and 6
      and servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[]
      and queue_types = array['competitive']::text[]
      and cardinality(roles) = 0
      and cardinality(maps) between 1 and 14
      and maps <@ array['ancient', 'anubis', 'cache', 'dust-ii', 'inferno', 'mirage', 'nuke', 'overpass', 'train', 'vertigo', 'office', 'boulder', 'fachwerk', 'shelter']::text[]
      and contact_value ~ '^[0-9]{5,12}$'
    )
  );

drop index if exists public.queue_match_filters;
create index queue_match_filters
  on public.queue_entries(game, rank_system, target_size, party_size desc, created_at)
  where status = 'searching';
create index if not exists queue_roles_searching_idx
  on public.queue_entries using gin(roles) where status = 'searching';
create index if not exists queue_maps_searching_idx
  on public.queue_entries using gin(maps) where status = 'searching';

create or replace function public.attempt_match()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  seed record;
  candidate record;
  selected_ids uuid[];
  selected_total integer;
  selected_roles text[];
  common_servers text[];
  common_queue_types text[];
  common_maps text[];
  next_servers text[];
  next_queue_types text[];
  next_maps text[];
  new_proposal_id uuid;
begin
  perform pg_advisory_xact_lock(81467291);

  for seed in
    select q.* from queue_entries q
    where q.status = 'searching'
    order by (q.party_size > 1) desc, q.party_size desc, q.created_at
  loop
    selected_ids := array[seed.id];
    selected_total := seed.party_size;
    selected_roles := seed.roles;
    common_servers := seed.servers;
    common_queue_types := seed.queue_types;
    common_maps := seed.maps;

    for candidate in
      select q.* from queue_entries q
      where q.status = 'searching'
        and q.id <> seed.id
        and q.game = seed.game
        and q.rank_system = seed.rank_system
        and q.target_size = seed.target_size
        and q.servers && common_servers
        and q.queue_types && common_queue_types
      order by (q.party_size > 1) desc, q.party_size desc, q.created_at
    loop
      continue when selected_total + candidate.party_size > seed.target_size;
      continue when exists (
        select 1 from queue_entries chosen
        where chosen.id = any(selected_ids)
          and not (
            candidate.rank_value between chosen.min_rank and chosen.max_rank
            and chosen.rank_value between candidate.min_rank and candidate.max_rank
          )
      );
      continue when seed.game = 'league-of-legends' and selected_roles && candidate.roles;

      select array_agg(value order by value) into next_servers from (
        select unnest(common_servers) value intersect select unnest(candidate.servers) value
      ) shared_servers;
      select array_agg(value order by value) into next_queue_types from (
        select unnest(common_queue_types) value intersect select unnest(candidate.queue_types) value
      ) shared_queues;
      if seed.rank_system = 'cs2-competitive' then
        select array_agg(value order by value) into next_maps from (
          select unnest(common_maps) value intersect select unnest(candidate.maps) value
        ) shared_maps;
      else
        next_maps := common_maps;
      end if;

      continue when coalesce(cardinality(next_servers), 0) = 0
        or coalesce(cardinality(next_queue_types), 0) = 0
        or (seed.rank_system = 'cs2-competitive' and coalesce(cardinality(next_maps), 0) = 0);

      selected_ids := array_append(selected_ids, candidate.id);
      selected_total := selected_total + candidate.party_size;
      selected_roles := selected_roles || candidate.roles;
      common_servers := next_servers;
      common_queue_types := next_queue_types;
      common_maps := next_maps;
      exit when selected_total = seed.target_size;
    end loop;

    if selected_total = seed.target_size then
      insert into match_proposals default values returning id into new_proposal_id;
      insert into proposal_entries(proposal_id, queue_entry_id, player_id)
      select new_proposal_id, q.id, q.player_id from queue_entries q where q.id = any(selected_ids);
      update queue_entries set status = 'proposed' where id = any(selected_ids);
      return new_proposal_id;
    end if;
  end loop;
  return null;
end;
$$;

drop function if exists public.enqueue_and_attempt_match(
  text, smallint, smallint, smallint, smallint, text[], text[], smallint
);

create function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank integer,
  p_party_size smallint,
  p_min_rank integer,
  p_max_rank integer,
  p_servers text[],
  p_queue_types text[],
  p_target_size smallint,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_game text := coalesce(nullif(p_context->>'game', ''), 'valorant');
  selected_rank_system text := coalesce(nullif(p_context->>'rankSystem', ''), 'valorant');
  selected_contact text := nullif(trim(p_context->>'contactValue'), '');
  selected_roles text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_context->'roles', '[]'::jsonb))), '{}'::text[]);
  selected_maps text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_context->'maps', '[]'::jsonb))), '{}'::text[]);
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if p_party_size not between 1 and 4 or p_target_size not between 2 and 5 or p_party_size > p_target_size then
    raise exception 'Geçersiz grup bilgileri';
  end if;
  if coalesce(cardinality(p_servers), 0) = 0 or coalesce(cardinality(p_queue_types), 0) = 0 then
    raise exception 'Sunucu ve kuyruk gerekli';
  end if;
  if char_length(trim(p_riot_id)) not between 1 and 32 then raise exception 'Geçersiz oyuncu adı'; end if;

  if selected_game = 'valorant' then
    if selected_rank_system <> 'valorant'
      or trim(p_riot_id) !~ '^[^#]{3,16}#[[:alnum:]]{3,5}$'
      or p_rank not between 0 and 24 or p_min_rank not between 0 and p_rank or p_max_rank not between p_rank and 24
      or cardinality(p_servers) not between 1 and 6
      or not (p_servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[])
      or cardinality(p_queue_types) not between 1 and 2
      or not (p_queue_types <@ array['competitive', 'unrated']::text[])
      or cardinality(selected_roles) <> 0 or cardinality(selected_maps) <> 0 then
      raise exception 'Geçersiz VALORANT arama bilgileri';
    end if;
  elsif selected_game = 'league-of-legends' then
    if selected_rank_system not in ('lol-solo', 'lol-flex')
      or trim(p_riot_id) !~ '^[^#]{3,16}#[[:alnum:]]{3,5}$'
      or p_rank not between 0 and 30 or p_min_rank not between 0 and p_rank or p_max_rank not between p_rank and 30
      or cardinality(p_servers) <> 1 or not (p_servers <@ array['tr1', 'euw1']::text[])
      or cardinality(p_queue_types) <> 1
      or not ((selected_rank_system = 'lol-solo' and p_queue_types = array['solo-duo']::text[])
        or (selected_rank_system = 'lol-flex' and p_queue_types = array['flex']::text[]))
      or cardinality(selected_roles) <> p_party_size
      or not public.text_array_is_unique(selected_roles)
      or not (selected_roles <@ array['top', 'jungle', 'mid', 'bottom', 'support']::text[])
      or cardinality(selected_maps) <> 0 then
      raise exception 'Geçersiz LoL arama bilgileri';
    end if;
  elsif selected_game = 'cs2' then
    if selected_contact is null or selected_contact !~ '^[0-9]{5,12}$'
      or cardinality(p_servers) not between 1 and 6
      or not (p_servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[])
      or cardinality(p_queue_types) <> 1 or cardinality(selected_roles) <> 0 then
      raise exception 'Geçersiz CS2 arama bilgileri';
    end if;
    if selected_rank_system = 'cs2-premier' then
      if p_queue_types <> array['premier']::text[]
        or p_rank not between 1000 and 50000 or p_min_rank not between 1000 and p_rank or p_max_rank not between p_rank and 50000
        or cardinality(selected_maps) <> 0 then
        raise exception 'Geçersiz Premier arama bilgileri';
      end if;
    elsif selected_rank_system = 'cs2-competitive' then
      if p_queue_types <> array['competitive']::text[]
        or p_rank not between 0 and 17 or p_min_rank not between 0 and p_rank or p_max_rank not between p_rank and 17
        or cardinality(selected_maps) not between 1 and 14
        or not (selected_maps <@ array['ancient', 'anubis', 'cache', 'dust-ii', 'inferno', 'mirage', 'nuke', 'overpass', 'train', 'vertigo', 'office', 'boulder', 'fachwerk', 'shelter']::text[]) then
        raise exception 'Geçersiz Competitive arama bilgileri';
      end if;
    else
      raise exception 'Geçersiz CS2 rank sistemi';
    end if;
  else
    raise exception 'Geçersiz oyun';
  end if;

  if exists (
    select 1 from lobby_members lm join lobbies l on l.id = lm.lobby_id
    where lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null
  ) then raise exception 'Zaten aktif bir lobidesin'; end if;

  update queue_entries set status = 'cancelled', restart_notice = null
  where player_id = current_user_id and status in ('searching', 'proposed');

  insert into profiles(id, riot_id, rank_value, game, rank_system, contact_value, last_seen_at)
  values (current_user_id, trim(p_riot_id), p_rank, selected_game, selected_rank_system, selected_contact, now())
  on conflict (id) do update set
    riot_id = excluded.riot_id, rank_value = excluded.rank_value, game = excluded.game,
    rank_system = excluded.rank_system, contact_value = excluded.contact_value, last_seen_at = now();

  insert into queue_entries(
    player_id, riot_id, rank_value, party_size, min_rank, max_rank,
    server, queue_type, servers, queue_types, target_size,
    game, rank_system, contact_value, roles, maps
  ) values (
    current_user_id, trim(p_riot_id), p_rank, p_party_size, p_min_rank, p_max_rank,
    p_servers[1], p_queue_types[1], p_servers, p_queue_types, p_target_size,
    selected_game, selected_rank_system, selected_contact, selected_roles, selected_maps
  );

  perform attempt_match();
  return get_my_status();
end;
$$;

create or replace function public.get_my_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_proposal record;
  current_lobby record;
  current_queue record;
  current_notice text;
  members jsonb;
  search_context jsonb;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  perform expire_proposals();
  update profiles set last_seen_at = now() where id = current_user_id;
  update lobby_members set last_seen_at = now() where player_id = current_user_id and left_at is null;

  select q.* into current_queue from queue_entries q
  where q.player_id = current_user_id and q.status in ('searching', 'proposed', 'matched')
  order by q.created_at desc limit 1;

  if found then
    current_notice := current_queue.restart_notice;
    search_context := jsonb_build_object(
      'rankSystem', current_queue.rank_system, 'rank', current_queue.rank_value,
      'minRank', current_queue.min_rank, 'maxRank', current_queue.max_rank,
      'partySize', current_queue.party_size, 'targetSize', current_queue.target_size,
      'servers', current_queue.servers, 'queueTypes', current_queue.queue_types,
      'roles', current_queue.roles, 'maps', current_queue.maps
    );
  end if;

  select l.id into current_lobby from lobbies l join lobby_members lm on lm.lobby_id = l.id
  where lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null limit 1;
  if found then
    select jsonb_agg(jsonb_build_object(
      'playerId', q.player_id, 'displayName', q.riot_id, 'riotId', q.riot_id,
      'contactValue', q.contact_value, 'game', q.game, 'rankSystem', q.rank_system,
      'rank', q.rank_value, 'partySize', q.party_size, 'roles', q.roles,
      'isMe', q.player_id = current_user_id
    ) order by q.created_at) into members
    from lobby_members lm join queue_entries q on q.id = lm.queue_entry_id
    where lm.lobby_id = current_lobby.id and lm.left_at is null;
    return jsonb_build_object('status', 'lobby', 'game', current_queue.game, 'search', search_context,
      'lobbyId', current_lobby.id, 'members', coalesce(members, '[]'::jsonb), 'notice', current_notice);
  end if;

  select mp.id, mp.expires_at into current_proposal
  from match_proposals mp join proposal_entries pe on pe.proposal_id = mp.id
  where pe.player_id = current_user_id and mp.status = 'pending' limit 1;
  if found then
    select jsonb_agg(jsonb_build_object(
      'playerId', q.player_id, 'displayName', q.riot_id, 'riotId', q.riot_id,
      'contactValue', q.contact_value, 'game', q.game, 'rankSystem', q.rank_system,
      'rank', q.rank_value, 'partySize', q.party_size, 'roles', q.roles,
      'accepted', pe.accepted, 'isMe', q.player_id = current_user_id
    ) order by q.created_at) into members
    from proposal_entries pe join queue_entries q on q.id = pe.queue_entry_id
    where pe.proposal_id = current_proposal.id;
    return jsonb_build_object('status', 'proposed', 'game', current_queue.game, 'search', search_context,
      'proposalId', current_proposal.id, 'expiresAt', current_proposal.expires_at,
      'members', coalesce(members, '[]'::jsonb), 'notice', current_notice);
  end if;

  if current_queue.status = 'searching' then
    perform attempt_match();
    if exists (select 1 from proposal_entries pe join match_proposals mp on mp.id = pe.proposal_id
      where pe.player_id = current_user_id and mp.status = 'pending') then
      return get_my_status();
    end if;
    return jsonb_build_object('status', 'searching', 'game', current_queue.game,
      'search', search_context, 'notice', current_notice);
  end if;
  return jsonb_build_object('status', 'idle');
end;
$$;

create or replace function public.send_lobby_message(p_lobby_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  sender_name text;
  new_message_id uuid;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_body)) not between 1 and 500 then raise exception 'Geçersiz mesaj'; end if;
  select q.riot_id into sender_name
  from lobby_members lm join queue_entries q on q.id = lm.queue_entry_id join lobbies l on l.id = lm.lobby_id
  where lm.lobby_id = p_lobby_id and lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null;
  if sender_name is null then raise exception 'Bu lobinin üyesi değilsin'; end if;
  insert into messages(lobby_id, player_id, riot_id, body)
  values (p_lobby_id, current_user_id, sender_name, trim(p_body)) returning id into new_message_id;
  return new_message_id;
end;
$$;

revoke all on function public.attempt_match() from public, anon, authenticated;
revoke all on function public.enqueue_and_attempt_match(
  text, integer, smallint, integer, integer, text[], text[], smallint, jsonb
) from public, anon;
grant execute on function public.enqueue_and_attempt_match(
  text, integer, smallint, integer, integer, text[], text[], smallint, jsonb
) to authenticated;
revoke all on function public.get_my_status() from public, anon;
grant execute on function public.get_my_status() to authenticated;
revoke all on function public.send_lobby_message(uuid, text) from public, anon;
grant execute on function public.send_lobby_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
