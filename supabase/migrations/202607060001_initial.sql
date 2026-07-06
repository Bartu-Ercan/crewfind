-- CrewFind ilk veri modeli ve eşleştirme fonksiyonları.
-- Supabase SQL Editor veya `supabase db push` ile uygulanabilir.

create extension if not exists pgcrypto;

create type public.queue_status as enum ('searching', 'proposed', 'matched', 'cancelled');
create type public.proposal_status as enum ('pending', 'accepted', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  riot_id text not null,
  rank_value smallint not null check (rank_value between 0 and 24),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  riot_id text not null,
  rank_value smallint not null check (rank_value between 0 and 24),
  party_size smallint not null check (party_size between 1 and 4),
  min_rank smallint not null check (min_rank between 0 and 24),
  max_rank smallint not null check (max_rank between 0 and 24),
  status public.queue_status not null default 'searching',
  created_at timestamptz not null default now(),
  check (min_rank <= rank_value and rank_value <= max_rank)
);

create unique index one_active_queue_per_player
  on public.queue_entries(player_id)
  where status in ('searching', 'proposed', 'matched');
create index queue_search_order
  on public.queue_entries(status, party_size desc, created_at);

create table public.match_proposals (
  id uuid primary key default gen_random_uuid(),
  status public.proposal_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '30 seconds',
  created_at timestamptz not null default now()
);

create table public.proposal_entries (
  proposal_id uuid not null references public.match_proposals(id) on delete cascade,
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  accepted boolean,
  responded_at timestamptz,
  primary key (proposal_id, queue_entry_id)
);

create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid unique not null references public.match_proposals(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.lobby_members (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  queue_entry_id uuid not null references public.queue_entries(id),
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  primary key (lobby_id, player_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  riot_id text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index messages_by_lobby on public.messages(lobby_id, created_at);

alter table public.profiles enable row level security;
alter table public.queue_entries enable row level security;
alter table public.match_proposals enable row level security;
alter table public.proposal_entries enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_active_lobby_member(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lobby_members
    where lobby_id = p_lobby_id
      and player_id = auth.uid()
      and left_at is null
  );
$$;

create policy "profile owner can read"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "members can read their lobby"
  on public.lobbies for select to authenticated
  using (public.is_active_lobby_member(id));

create policy "members can read lobby members"
  on public.lobby_members for select to authenticated
  using (public.is_active_lobby_member(lobby_id));

create policy "members can read lobby messages"
  on public.messages for select to authenticated
  using (public.is_active_lobby_member(lobby_id));

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
  new_proposal_id uuid;
begin
  -- Bütün eşleştirme denemelerini seri hale getirir; çift eşleşmeyi önler.
  perform pg_advisory_xact_lock(81467291);

  for seed in
    select q.*
    from queue_entries q
    where q.status = 'searching'
    order by (q.party_size > 1) desc, q.party_size desc, q.created_at
  loop
    selected_ids := array[seed.id];
    selected_total := seed.party_size;

    for candidate in
      select q.*
      from queue_entries q
      where q.status = 'searching'
        and q.id <> seed.id
      order by (q.party_size > 1) desc, q.party_size desc, q.created_at
    loop
      continue when selected_total + candidate.party_size > 5;

      -- Rank uygunluğu seçilen bütün temsilciler için iki yönlü olmalı.
      continue when exists (
        select 1
        from queue_entries chosen
        where chosen.id = any(selected_ids)
          and not (
            candidate.rank_value between chosen.min_rank and chosen.max_rank
            and chosen.rank_value between candidate.min_rank and candidate.max_rank
          )
      );

      selected_ids := array_append(selected_ids, candidate.id);
      selected_total := selected_total + candidate.party_size;
      exit when selected_total = 5;
    end loop;

    if selected_total = 5 then
      insert into match_proposals default values returning id into new_proposal_id;

      insert into proposal_entries(proposal_id, queue_entry_id, player_id)
      select new_proposal_id, q.id, q.player_id
      from queue_entries q
      where q.id = any(selected_ids);

      update queue_entries
      set status = 'proposed'
      where id = any(selected_ids);

      return new_proposal_id;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.expire_proposals()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expired record;
begin
  for expired in
    select id from match_proposals
    where status = 'pending' and expires_at <= now()
    for update
  loop
    update queue_entries q
    set status = case when pe.accepted is true then 'searching'::queue_status else 'cancelled'::queue_status end
    from proposal_entries pe
    where pe.proposal_id = expired.id and pe.queue_entry_id = q.id;

    update match_proposals set status = 'expired' where id = expired.id;
  end loop;
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
  members jsonb;
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  perform expire_proposals();
  update profiles set last_seen_at = now() where id = current_user_id;
  update lobby_members set last_seen_at = now()
    where player_id = current_user_id and left_at is null;

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
      'members', coalesce(members, '[]'::jsonb)
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
      'members', coalesce(members, '[]'::jsonb)
    );
  end if;

  if exists (
    select 1 from queue_entries
    where player_id = current_user_id and status = 'searching'
  ) then
    perform attempt_match();
    -- Yeni eşleşme oluşmuşsa aynı çağrıda teklif verisini döndür.
    if exists (
      select 1 from proposal_entries pe
      join match_proposals mp on mp.id = pe.proposal_id
      where pe.player_id = current_user_id and mp.status = 'pending'
    ) then
      return get_my_status();
    end if;
    return jsonb_build_object('status', 'searching');
  end if;

  return jsonb_build_object('status', 'idle');
end;
$$;

create or replace function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank smallint,
  p_party_size smallint,
  p_min_rank smallint,
  p_max_rank smallint
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
    or p_party_size not between 1 and 4 then
    raise exception 'Geçersiz arama bilgileri';
  end if;
  if exists (
    select 1 from lobby_members lm
    join lobbies l on l.id = lm.lobby_id
    where lm.player_id = current_user_id and lm.left_at is null and l.closed_at is null
  ) then
    raise exception 'Zaten aktif bir lobidesin';
  end if;

  update queue_entries set status = 'cancelled'
    where player_id = current_user_id and status in ('searching', 'proposed');

  insert into profiles(id, riot_id, rank_value, last_seen_at)
  values (current_user_id, trim(p_riot_id), p_rank, now())
  on conflict (id) do update
    set riot_id = excluded.riot_id,
        rank_value = excluded.rank_value,
        last_seen_at = now();

  insert into queue_entries(player_id, riot_id, rank_value, party_size, min_rank, max_rank)
  values (current_user_id, trim(p_riot_id), p_rank, p_party_size, p_min_rank, p_max_rank);

  perform attempt_match();
  return get_my_status();
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
  new_lobby_id uuid;
begin
  perform pg_advisory_xact_lock(81467291);
  perform expire_proposals();

  select * into proposal from match_proposals
  where id = p_proposal_id and status = 'pending'
  for update;
  if not found then return get_my_status(); end if;

  if not exists (
    select 1 from proposal_entries
    where proposal_id = p_proposal_id and player_id = current_user_id
  ) then
    raise exception 'Bu eşleşmenin katılımcısı değilsin';
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
    update queue_entries q set status = 'matched'
      from proposal_entries pe
      where pe.proposal_id = p_proposal_id and pe.queue_entry_id = q.id;
  end if;

  return get_my_status();
end;
$$;

create or replace function public.send_lobby_message(
  p_lobby_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_message_id uuid;
  current_riot_id text;
begin
  if char_length(trim(p_body)) not between 1 and 500 then
    raise exception 'Mesaj 1–500 karakter olmalı';
  end if;
  if not exists (
    select 1 from lobby_members lm
    join lobbies l on l.id = lm.lobby_id
    where lm.lobby_id = p_lobby_id
      and lm.player_id = current_user_id
      and lm.left_at is null
      and l.closed_at is null
  ) then raise exception 'Lobi erişimi yok'; end if;
  if exists (
    select 1 from messages
    where player_id = current_user_id and created_at > now() - interval '1 second'
  ) then raise exception 'Çok hızlı mesaj gönderiyorsun'; end if;

  select riot_id into current_riot_id from profiles where id = current_user_id;
  insert into messages(lobby_id, player_id, riot_id, body)
  values (p_lobby_id, current_user_id, current_riot_id, trim(p_body))
  returning id into new_message_id;
  return new_message_id;
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
begin
  update queue_entries set status = 'cancelled'
    where player_id = current_user_id and status in ('searching', 'proposed');

  update lobby_members set left_at = now()
    where player_id = current_user_id and left_at is null
    returning lobby_id into current_lobby_id;

  if current_lobby_id is not null and not exists (
    select 1 from lobby_members
    where lobby_id = current_lobby_id and left_at is null
  ) then
    update lobbies set closed_at = now() where id = current_lobby_id;
    delete from messages where lobby_id = current_lobby_id;
  end if;
end;
$$;

create or replace function public.cleanup_stale_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform expire_proposals();
  update queue_entries q set status = 'cancelled'
  from profiles p
  where q.player_id = p.id
    and q.status = 'searching'
    and p.last_seen_at < now() - interval '60 seconds';

  update lobby_members set left_at = now()
  where left_at is null and last_seen_at < now() - interval '60 seconds';

  update lobbies l set closed_at = now()
  where closed_at is null
    and not exists (
      select 1 from lobby_members lm
      where lm.lobby_id = l.id and lm.left_at is null
    );

  delete from messages m
  using lobbies l
  where m.lobby_id = l.id and l.closed_at is not null;
end;
$$;

revoke all on function public.attempt_match() from public, anon, authenticated;
revoke all on function public.expire_proposals() from public, anon, authenticated;
revoke all on function public.cleanup_stale_state() from public, anon, authenticated;
revoke all on function public.is_active_lobby_member(uuid) from public, anon;
grant execute on function public.is_active_lobby_member(uuid) to authenticated;
grant execute on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint) to authenticated;
grant execute on function public.get_my_status() to authenticated;
grant execute on function public.respond_to_proposal(uuid, boolean) to authenticated;
grant execute on function public.send_lobby_message(uuid, text) to authenticated;
grant execute on function public.leave_current() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Yeni RPC fonksiyonlarını Data API şema önbelleğine hemen yükle.
notify pgrst, 'reload schema';
