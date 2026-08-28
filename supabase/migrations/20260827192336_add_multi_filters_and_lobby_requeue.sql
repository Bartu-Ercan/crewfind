alter table public.queue_entries
  add column servers text[],
  add column queue_types text[],
  add column restart_notice text;

update public.queue_entries
set servers = array[server],
    queue_types = array[queue_type];

create or replace function public.normalize_queue_filter_arrays()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.servers is null then
    new.servers := array[new.server];
  else
    new.server := new.servers[1];
  end if;

  if new.queue_types is null then
    new.queue_types := array[new.queue_type];
  else
    new.queue_type := new.queue_types[1];
  end if;

  return new;
end;
$$;

create trigger normalize_queue_filter_arrays_before_write
before insert or update of server, queue_type, servers, queue_types
on public.queue_entries
for each row execute function public.normalize_queue_filter_arrays();

alter table public.queue_entries
  alter column servers set not null,
  alter column queue_types set not null,
  add constraint queue_entries_servers_check
    check (
      cardinality(servers) between 1 and 6
      and servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[]
    ),
  add constraint queue_entries_queue_types_check
    check (
      cardinality(queue_types) between 1 and 2
      and queue_types <@ array['competitive', 'unrated']::text[]
    );

drop index public.queue_match_filters;
create index queue_match_filters
  on public.queue_entries(target_size, party_size desc, created_at)
  where status = 'searching';
create index queue_servers_searching_idx
  on public.queue_entries using gin(servers)
  where status = 'searching';
create index queue_types_searching_idx
  on public.queue_entries using gin(queue_types)
  where status = 'searching';

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
  common_servers text[];
  common_queue_types text[];
  next_servers text[];
  next_queue_types text[];
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
    common_servers := seed.servers;
    common_queue_types := seed.queue_types;

    for candidate in
      select q.* from queue_entries q
      where q.status = 'searching'
        and q.id <> seed.id
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

      select array_agg(value order by value)
      into next_servers
      from (
        select unnest(common_servers) as value
        intersect
        select unnest(candidate.servers) as value
      ) shared_servers;

      select array_agg(value order by value)
      into next_queue_types
      from (
        select unnest(common_queue_types) as value
        intersect
        select unnest(candidate.queue_types) as value
      ) shared_queue_types;

      continue when coalesce(cardinality(next_servers), 0) = 0
        or coalesce(cardinality(next_queue_types), 0) = 0;

      selected_ids := array_append(selected_ids, candidate.id);
      selected_total := selected_total + candidate.party_size;
      common_servers := next_servers;
      common_queue_types := next_queue_types;
      exit when selected_total = seed.target_size;
    end loop;

    if selected_total = seed.target_size then
      insert into match_proposals default values returning id into new_proposal_id;
      insert into proposal_entries(proposal_id, queue_entry_id, player_id)
      select new_proposal_id, q.id, q.player_id from queue_entries q
      where q.id = any(selected_ids);
      update queue_entries set status = 'proposed' where id = any(selected_ids);
      return new_proposal_id;
    end if;
  end loop;

  return null;
end;
$$;

create function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank smallint,
  p_party_size smallint,
  p_min_rank smallint,
  p_max_rank smallint,
  p_servers text[],
  p_queue_types text[],
  p_target_size smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_riot_id)) < 7 or char_length(trim(p_riot_id)) > 24 or position('#' in p_riot_id) = 0 then
    raise exception 'Geçersiz Riot ID';
  end if;
  if p_rank not between 0 and 24
    or p_min_rank not between 0 and p_rank
    or p_max_rank not between p_rank and 24
    or p_party_size not between 1 and 4
    or p_target_size not between 2 and 5
    or p_party_size > p_target_size
    or coalesce(cardinality(p_servers), 0) not between 1 and 6
    or not (p_servers <@ array['frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw']::text[])
    or coalesce(cardinality(p_queue_types), 0) not between 1 and 2
    or not (p_queue_types <@ array['competitive', 'unrated']::text[]) then
    raise exception 'Geçersiz arama bilgileri';
  end if;
  if exists (
    select 1 from lobby_members lm
    join lobbies l on l.id = lm.lobby_id
    where lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null
  ) then
    raise exception 'Zaten aktif bir lobidesin';
  end if;

  update queue_entries set status = 'cancelled', restart_notice = null
    where player_id = current_user_id and status in ('searching', 'proposed');

  insert into profiles(id, riot_id, rank_value, last_seen_at)
  values (current_user_id, trim(p_riot_id), p_rank, now())
  on conflict (id) do update
    set riot_id = excluded.riot_id,
        rank_value = excluded.rank_value,
        last_seen_at = now();

  insert into queue_entries(
    player_id, riot_id, rank_value, party_size, min_rank, max_rank,
    server, queue_type, servers, queue_types, target_size
  )
  values (
    current_user_id, trim(p_riot_id), p_rank, p_party_size, p_min_rank, p_max_rank,
    p_servers[1], p_queue_types[1], p_servers, p_queue_types, p_target_size
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
  current_notice text;
  members jsonb;
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  perform expire_proposals();
  update profiles set last_seen_at = now() where id = current_user_id;
  update lobby_members set last_seen_at = now()
    where player_id = current_user_id and left_at is null;

  select q.restart_notice
  into current_notice
  from queue_entries q
  where q.player_id = current_user_id and q.restart_notice is not null
  order by q.created_at desc
  limit 1;

  select l.id
  into current_lobby
  from lobbies l
  join lobby_members lm on lm.lobby_id = l.id
  where lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null
  limit 1;

  if found then
    select jsonb_agg(
      jsonb_build_object(
        'playerId', q.player_id,
        'riotId', q.riot_id,
        'rank', q.rank_value,
        'partySize', q.party_size,
        'isMe', q.player_id = current_user_id
      ) order by q.created_at
    )
    into members
    from lobby_members lm
    join queue_entries q on q.id = lm.queue_entry_id
    where lm.lobby_id = current_lobby.id and lm.left_at is null;

    return jsonb_build_object(
      'status', 'lobby',
      'lobbyId', current_lobby.id,
      'members', coalesce(members, '[]'::jsonb),
      'notice', current_notice
    );
  end if;

  select mp.id, mp.expires_at
  into current_proposal
  from match_proposals mp
  join proposal_entries pe on pe.proposal_id = mp.id
  where pe.player_id = current_user_id and mp.status = 'pending'
  limit 1;

  if found then
    select jsonb_agg(
      jsonb_build_object(
        'playerId', q.player_id,
        'riotId', q.riot_id,
        'rank', q.rank_value,
        'partySize', q.party_size,
        'accepted', pe.accepted,
        'isMe', q.player_id = current_user_id
      ) order by q.created_at
    )
    into members
    from proposal_entries pe
    join queue_entries q on q.id = pe.queue_entry_id
    where pe.proposal_id = current_proposal.id;

    return jsonb_build_object(
      'status', 'proposed',
      'proposalId', current_proposal.id,
      'expiresAt', current_proposal.expires_at,
      'members', coalesce(members, '[]'::jsonb),
      'notice', current_notice
    );
  end if;

  if exists (
    select 1 from queue_entries
    where player_id = current_user_id and status = 'searching'
  ) then
    perform attempt_match();
    if exists (
      select 1 from proposal_entries pe
      join match_proposals mp on mp.id = pe.proposal_id
      where pe.player_id = current_user_id and mp.status = 'pending'
    ) then
      return get_my_status();
    end if;
    return jsonb_build_object('status', 'searching', 'notice', current_notice);
  end if;

  return jsonb_build_object('status', 'idle');
end;
$$;

create or replace function public.respond_to_proposal(
  p_proposal_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  proposal match_proposals%rowtype;
  current_response boolean;
  new_lobby_id uuid;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  perform pg_advisory_xact_lock(81467291);
  perform expire_proposals();

  select * into proposal from match_proposals
  where id = p_proposal_id and status = 'pending'
  for update;
  if not found then return get_my_status(); end if;

  select accepted
  into current_response
  from proposal_entries
  where proposal_id = p_proposal_id and player_id = current_user_id
  for update;
  if not found then
    raise exception 'Bu eşleşmenin katılımcısı değilsin';
  end if;
  if current_response is not null then
    return get_my_status();
  end if;

  update proposal_entries
  set accepted = p_accept, responded_at = now()
  where proposal_id = p_proposal_id and player_id = current_user_id;

  if not p_accept then
    update queue_entries q
    set status = case when pe.player_id = current_user_id then 'cancelled'::queue_status else 'searching'::queue_status end
    from proposal_entries pe
    where pe.proposal_id = p_proposal_id and pe.queue_entry_id = q.id;
    update match_proposals set status = 'rejected' where id = p_proposal_id;
    perform attempt_match();
    return get_my_status();
  end if;

  if not exists (
    select 1 from proposal_entries
    where proposal_id = p_proposal_id and accepted is distinct from true
  ) then
    update match_proposals set status = 'accepted' where id = p_proposal_id;
    insert into lobbies(proposal_id) values (p_proposal_id) returning id into new_lobby_id;
    insert into lobby_members(lobby_id, player_id, queue_entry_id)
      select new_lobby_id, player_id, queue_entry_id
      from proposal_entries where proposal_id = p_proposal_id;
    update queue_entries q
      set status = 'matched', restart_notice = null
      from proposal_entries pe
      where pe.proposal_id = p_proposal_id and pe.queue_entry_id = q.id;
  end if;

  return get_my_status();
end;
$$;

create or replace function public.break_lobby_and_requeue(
  p_lobby_id uuid,
  p_leaver_id uuid,
  p_leaver_riot_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(81467291);

  update lobbies
  set closed_at = now()
  where id = p_lobby_id and closed_at is null;
  if not found then return; end if;

  update lobby_members
  set left_at = now()
  where lobby_id = p_lobby_id and left_at is null;

  update queue_entries q
  set status = case
        when lm.player_id = p_leaver_id then 'cancelled'::queue_status
        else 'searching'::queue_status
      end,
      created_at = case when lm.player_id = p_leaver_id then q.created_at else now() end,
      restart_notice = case
        when lm.player_id = p_leaver_id then null
        else p_leaver_riot_id || ' lobiden ayrıldı. Eksik oyuncu için arama yeniden başlatıldı.'
      end
  from lobby_members lm
  where lm.lobby_id = p_lobby_id and lm.queue_entry_id = q.id;

  perform attempt_match();
end;
$$;

create or replace function public.leave_current()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_lobby_id uuid;
  current_riot_id text;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;

  select l.id, q.riot_id
  into current_lobby_id, current_riot_id
  from lobbies l
  join lobby_members lm on lm.lobby_id = l.id
  join queue_entries q on q.id = lm.queue_entry_id
  where lm.player_id = current_user_id
    and lm.left_at is null
    and l.closed_at is null
  order by l.created_at desc
  limit 1;

  if found then
    perform break_lobby_and_requeue(current_lobby_id, current_user_id, current_riot_id);
    return;
  end if;

  update queue_entries
  set status = 'cancelled', restart_notice = null
  where player_id = current_user_id and status in ('searching', 'proposed');
end;
$$;

create or replace function public.cleanup_stale_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stale_member record;
begin
  perform expire_proposals();

  for stale_member in
    select l.id as lobby_id, lm.player_id, q.riot_id
    from lobbies l
    join lobby_members lm on lm.lobby_id = l.id
    join queue_entries q on q.id = lm.queue_entry_id
    where l.closed_at is null
      and lm.left_at is null
      and lm.last_seen_at < now() - interval '60 seconds'
    order by l.created_at
  loop
    perform break_lobby_and_requeue(
      stale_member.lobby_id,
      stale_member.player_id,
      stale_member.riot_id
    );
  end loop;

  update queue_entries q set status = 'cancelled'
  from profiles p
  where q.player_id = p.id
    and q.status = 'searching'
    and p.last_seen_at < now() - interval '60 seconds';

  delete from messages m
  using lobbies l
  where m.lobby_id = l.id and l.closed_at is not null;
end;
$$;

revoke all on function public.normalize_queue_filter_arrays() from public, anon, authenticated;
revoke all on function public.attempt_match() from public, anon, authenticated;
revoke all on function public.break_lobby_and_requeue(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_stale_state() from public, anon, authenticated;
revoke all on function public.enqueue_and_attempt_match(
  text, smallint, smallint, smallint, smallint, text[], text[], smallint
) from public, anon;
grant execute on function public.enqueue_and_attempt_match(
  text, smallint, smallint, smallint, smallint, text[], text[], smallint
) to authenticated;
revoke all on function public.get_my_status() from public, anon;
grant execute on function public.get_my_status() to authenticated;
revoke all on function public.respond_to_proposal(uuid, boolean) from public, anon;
grant execute on function public.respond_to_proposal(uuid, boolean) to authenticated;
revoke all on function public.leave_current() from public, anon;
grant execute on function public.leave_current() to authenticated;

notify pgrst, 'reload schema';
