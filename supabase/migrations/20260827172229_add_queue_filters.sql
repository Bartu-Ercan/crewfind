alter table public.queue_entries
  add column region text not null default 'eu'
    check (region in ('eu', 'tr', 'na')),
  add column queue_type text not null default 'competitive'
    check (queue_type in ('competitive', 'unrated'));

create index queue_match_filters
  on public.queue_entries(status, region, queue_type, party_size desc, created_at);

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
        and q.region = seed.region
        and q.queue_type = seed.queue_type
      order by (q.party_size > 1) desc, q.party_size desc, q.created_at
    loop
      continue when selected_total + candidate.party_size > 5;
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
      update queue_entries set status = 'proposed' where id = any(selected_ids);
      return new_proposal_id;
    end if;
  end loop;

  return null;
end;
$$;

drop function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint);

create function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank smallint,
  p_party_size smallint,
  p_min_rank smallint,
  p_max_rank smallint,
  p_region text,
  p_queue_type text
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
    or p_region not in ('eu', 'tr', 'na')
    or p_queue_type not in ('competitive', 'unrated') then
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

  insert into queue_entries(
    player_id, riot_id, rank_value, party_size, min_rank, max_rank, region, queue_type
  )
  values (
    current_user_id, trim(p_riot_id), p_rank, p_party_size, p_min_rank, p_max_rank, p_region, p_queue_type
  );

  perform attempt_match();
  return get_my_status();
end;
$$;

revoke all on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint, text, text)
  from public, anon;
grant execute on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint, text, text)
  to authenticated;

notify pgrst, 'reload schema';
