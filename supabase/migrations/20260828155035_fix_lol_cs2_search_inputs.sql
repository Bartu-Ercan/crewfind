update public.profiles
set rank_value = case
  when rank_value < 5000 then 1000
  when rank_value < 9500 then 5000
  when rank_value < 13000 then 9500
  when rank_value < 17000 then 13000
  when rank_value < 19500 then 17000
  else 19500
end
where game = 'cs2' and rank_system = 'cs2-premier';

update public.queue_entries
set rank_value = case
      when rank_value < 5000 then 1000 when rank_value < 9500 then 5000
      when rank_value < 13000 then 9500 when rank_value < 17000 then 13000
      when rank_value < 19500 then 17000 else 19500 end,
    min_rank = case
      when min_rank < 5000 then 1000 when min_rank < 9500 then 5000
      when min_rank < 13000 then 9500 when min_rank < 17000 then 13000
      when min_rank < 19500 then 17000 else 19500 end,
    max_rank = 50000
where game = 'cs2' and rank_system = 'cs2-premier';

update public.queue_entries
set party_size = 1, target_size = 2, roles = array[roles[1]]::text[]
where game = 'league-of-legends' and rank_system = 'lol-solo';

alter table public.profiles drop constraint if exists profiles_game_context_check;
alter table public.profiles add constraint profiles_game_context_check check (
  (game = 'valorant' and rank_system = 'valorant' and rank_value between 0 and 24)
  or (game = 'league-of-legends' and rank_system in ('lol-solo', 'lol-flex') and rank_value between 0 and 30)
  or (game = 'cs2' and rank_system = 'cs2-premier' and rank_value = any(array[1000, 5000, 9500, 13000, 17000, 19500]))
  or (game = 'cs2' and rank_system = 'cs2-competitive' and rank_value between 0 and 17)
);

alter table public.queue_entries drop constraint if exists queue_entries_game_context_check;
alter table public.queue_entries add constraint queue_entries_game_context_check check (
  (
    game = 'valorant' and rank_system = 'valorant'
    and rank_value between 0 and 24 and min_rank between 0 and 24 and max_rank between 0 and 24
    and cardinality(servers) between 1 and 6
    and servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[]
    and cardinality(queue_types) between 1 and 2
    and queue_types <@ array['competitive', 'unrated']::text[]
    and cardinality(roles) = 0 and cardinality(maps) = 0
  ) or (
    game = 'league-of-legends' and rank_system in ('lol-solo', 'lol-flex')
    and rank_value between 0 and 30 and min_rank between 0 and 30 and max_rank between 0 and 30
    and cardinality(servers) = 1 and servers <@ array['tr1', 'euw1']::text[]
    and cardinality(queue_types) = 1
    and ((rank_system = 'lol-solo' and queue_types = array['solo-duo']::text[] and party_size = 1 and target_size = 2)
      or (rank_system = 'lol-flex' and queue_types = array['flex']::text[]))
    and cardinality(roles) = party_size
    and roles <@ array['top', 'jungle', 'mid', 'bottom', 'support']::text[]
    and public.text_array_is_unique(roles) and cardinality(maps) = 0
  ) or (
    game = 'cs2' and rank_system = 'cs2-premier'
    and rank_value = any(array[1000, 5000, 9500, 13000, 17000, 19500])
    and min_rank = any(array[1000, 5000, 9500, 13000, 17000, 19500]) and max_rank = 50000
    and cardinality(servers) between 1 and 6
    and servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[]
    and queue_types = array['premier']::text[] and cardinality(roles) = 0 and cardinality(maps) = 0
    and (contact_value is null or contact_value ~ '^[0-9]{5,12}$')
  ) or (
    game = 'cs2' and rank_system = 'cs2-competitive'
    and rank_value between 0 and 17 and min_rank between 0 and 17 and max_rank between 0 and 17
    and cardinality(servers) between 1 and 6
    and servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[]
    and queue_types = array['competitive']::text[] and cardinality(roles) = 0
    and cardinality(maps) between 1 and 14
    and maps <@ array['ancient', 'anubis', 'cache', 'dust-ii', 'inferno', 'mirage', 'nuke', 'overpass', 'train', 'vertigo', 'office', 'boulder', 'fachwerk', 'shelter']::text[]
    and (contact_value is null or contact_value ~ '^[0-9]{5,12}$')
  )
);

create or replace function public.enqueue_and_attempt_match(
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
      or not ((selected_rank_system = 'lol-solo' and p_queue_types = array['solo-duo']::text[] and p_party_size = 1 and p_target_size = 2)
        or (selected_rank_system = 'lol-flex' and p_queue_types = array['flex']::text[]))
      or cardinality(selected_roles) <> p_party_size
      or not public.text_array_is_unique(selected_roles)
      or not (selected_roles <@ array['top', 'jungle', 'mid', 'bottom', 'support']::text[])
      or cardinality(selected_maps) <> 0 then
      raise exception 'Geçersiz LoL arama bilgileri';
    end if;
  elsif selected_game = 'cs2' then
    if selected_contact is not null and selected_contact !~ '^[0-9]{5,12}$' then
      raise exception 'Geçersiz CS2 arkadaş kodu';
    end if;
    if cardinality(p_servers) not between 1 and 6
      or not (p_servers <@ array['vienna', 'frankfurt', 'warsaw', 'dubai', 'amsterdam', 'stockholm']::text[])
      or cardinality(p_queue_types) <> 1 or cardinality(selected_roles) <> 0 then
      raise exception 'Geçersiz CS2 arama bilgileri';
    end if;
    if selected_rank_system = 'cs2-premier' then
      if p_queue_types <> array['premier']::text[]
        or not (p_rank = any(array[1000, 5000, 9500, 13000, 17000, 19500]))
        or not (p_min_rank = any(array[1000, 5000, 9500, 13000, 17000, 19500]))
        or p_min_rank > p_rank or p_max_rank <> 50000
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

revoke all on function public.enqueue_and_attempt_match(
  text, integer, smallint, integer, integer, text[], text[], smallint, jsonb
) from public, anon;
grant execute on function public.enqueue_and_attempt_match(
  text, integer, smallint, integer, integer, text[], text[], smallint, jsonb
) to authenticated;

notify pgrst, 'reload schema';
