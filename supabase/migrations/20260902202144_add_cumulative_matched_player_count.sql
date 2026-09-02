create table private.matchmaking_totals (
  singleton boolean primary key default true check (singleton),
  matched_player_count bigint not null default 0 check (matched_player_count >= 0),
  updated_at timestamptz not null default clock_timestamp()
);

alter table private.matchmaking_totals enable row level security;
revoke all on table private.matchmaking_totals from public, anon, authenticated;

insert into private.matchmaking_totals(singleton, matched_player_count)
values (true, 0);

create function private.record_matched_players()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  represented_players integer;
begin
  select coalesce(sum(q.party_size), 0)::integer
  into represented_players
  from public.proposal_entries pe
  join public.queue_entries q on q.id = pe.queue_entry_id
  where pe.proposal_id = new.proposal_id;

  if represented_players < 1 then
    raise exception 'Eşleşme oyuncu sayısı bulunamadı';
  end if;

  update private.matchmaking_totals
  set matched_player_count = matched_player_count + represented_players,
      updated_at = clock_timestamp()
  where singleton;

  return new;
end;
$$;

lock table public.lobbies in share row exclusive mode;

create trigger record_matched_players_after_lobby_created
after insert on public.lobbies
for each row execute function private.record_matched_players();

update private.matchmaking_totals
set matched_player_count = (
      select coalesce(sum(q.party_size), 0)::bigint
      from public.lobbies l
      join public.proposal_entries pe on pe.proposal_id = l.proposal_id
      join public.queue_entries q on q.id = pe.queue_entry_id
    ),
    updated_at = clock_timestamp()
where singleton;

create function private.get_matched_player_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select matched_player_count
  from private.matchmaking_totals
  where singleton;
$$;

create function public.get_matched_player_count()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_ip_rate_limit('matched-player-count:minute', 20, 60);
  return private.get_matched_player_count();
end;
$$;

revoke all on function private.record_matched_players() from public, anon, authenticated;
revoke all on function private.get_matched_player_count() from public, anon, authenticated;
revoke all on function public.get_matched_player_count() from public;

grant execute on function private.get_matched_player_count() to anon, authenticated;
grant execute on function public.get_matched_player_count() to anon, authenticated;

notify pgrst, 'reload schema';
