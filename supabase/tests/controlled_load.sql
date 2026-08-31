begin;

set local statement_timeout = '30s';
set local lock_timeout = '2s';
set local idle_in_transaction_session_timeout = '45s';

create temporary table controlled_load_metrics (
  metric text primary key,
  value numeric not null,
  unit text not null
) on commit drop;

create or replace function pg_temp.controlled_load_user(sequence_number integer)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select ('00000000-0000-0000-9000-' || lpad(sequence_number::text, 12, '0'))::uuid;
$$;

insert into auth.users(id, aud, role, is_anonymous)
select pg_temp.controlled_load_user(sequence_number), 'authenticated', 'authenticated', true
from generate_series(1, 250) sequence_number;

insert into public.profiles(id, riot_id, rank_value, game, rank_system, contact_value)
select
  pg_temp.controlled_load_user(sequence_number),
  'Load' || sequence_number || '#TR1',
  case when sequence_number <= 100 then 10 when sequence_number <= 175 then 12 else 9500 end,
  case when sequence_number <= 100 then 'valorant' when sequence_number <= 175 then 'league-of-legends' else 'cs2' end,
  case when sequence_number <= 100 then 'valorant' when sequence_number <= 175 then 'lol-flex' else 'cs2-premier' end,
  case when sequence_number > 175 then (90000 + sequence_number)::text else null end
from generate_series(1, 250) sequence_number;

insert into public.queue_entries(
  player_id,
  riot_id,
  rank_value,
  party_size,
  min_rank,
  max_rank,
  server,
  queue_type,
  target_size,
  servers,
  queue_types,
  game,
  rank_system,
  contact_value,
  roles,
  maps,
  created_at
)
select
  pg_temp.controlled_load_user(sequence_number),
  'Load' || sequence_number || '#TR1',
  case when sequence_number <= 100 then 10 when sequence_number <= 175 then 12 else 9500 end,
  1,
  case when sequence_number <= 100 then 6 when sequence_number <= 175 then 8 else 5000 end,
  case when sequence_number <= 100 then 24 when sequence_number <= 175 then 30 else 50000 end,
  case when sequence_number <= 100 then 'istanbul' when sequence_number <= 175 then 'tr1' else 'vienna' end,
  case when sequence_number <= 100 then 'competitive' when sequence_number <= 175 then 'flex' else 'premier' end,
  5,
  case
    when sequence_number <= 100 then array['istanbul', 'frankfurt']::text[]
    when sequence_number <= 175 then array['tr1']::text[]
    else array['vienna', 'frankfurt']::text[]
  end,
  case
    when sequence_number <= 100 then array['competitive']::text[]
    when sequence_number <= 175 then array['flex']::text[]
    else array['premier']::text[]
  end,
  case when sequence_number <= 100 then 'valorant' when sequence_number <= 175 then 'league-of-legends' else 'cs2' end,
  case when sequence_number <= 100 then 'valorant' when sequence_number <= 175 then 'lol-flex' else 'cs2-premier' end,
  case when sequence_number > 175 then (90000 + sequence_number)::text else null end,
  case
    when sequence_number between 101 and 175 then
      array[(array['top', 'jungle', 'mid', 'bottom', 'support'])[((sequence_number - 101) % 5) + 1]]::text[]
    else '{}'::text[]
  end,
  '{}'::text[],
  clock_timestamp() - interval '10 minutes' + sequence_number * interval '1 millisecond'
from generate_series(1, 250) sequence_number;

do $$
declare
  started_at timestamptz := clock_timestamp();
  proposal_number integer;
  proposal_id uuid;
  duration_ms numeric;
begin
  for proposal_number in 1..50 loop
    proposal_id := private.attempt_match();
    if proposal_id is null then
      raise exception 'Yük testi % numaralı eşleşmede takım kuramadı', proposal_number;
    end if;
  end loop;

  duration_ms := extract(epoch from clock_timestamp() - started_at) * 1000;
  insert into controlled_load_metrics(metric, value, unit)
  values ('match_250_players', round(duration_ms, 2), 'ms');

  if duration_ms >= 15000 then
    raise exception '250 oyuncu eşleştirme süresi sınırı aştı: % ms', round(duration_ms, 2);
  end if;
end;
$$;

do $$
declare
  load_queue_count integer;
  searching_count integer;
  proposal_count integer;
  proposal_entry_count integer;
  invalid_proposal_count integer;
begin
  select count(*), count(*) filter (where status = 'searching')
  into load_queue_count, searching_count
  from public.queue_entries
  where player_id::text like '00000000-0000-0000-9000-%';

  select count(distinct pe.proposal_id), count(*)
  into proposal_count, proposal_entry_count
  from public.proposal_entries pe
  where pe.player_id::text like '00000000-0000-0000-9000-%';

  select count(*) into invalid_proposal_count
  from (
    select
      pe.proposal_id
    from public.proposal_entries pe
    join public.queue_entries queue_entry on queue_entry.id = pe.queue_entry_id
    where pe.player_id::text like '00000000-0000-0000-9000-%'
    group by pe.proposal_id
    having count(*) <> 5
      or sum(queue_entry.party_size) <> 5
      or count(distinct queue_entry.game) <> 1
      or count(distinct queue_entry.rank_system) <> 1
  ) invalid_proposals;

  if load_queue_count <> 250 or searching_count <> 0 then
    raise exception 'Yük kuyruğu eksik veya eşleşmemiş kayıt bıraktı: toplam %, arayan %', load_queue_count, searching_count;
  end if;
  if proposal_count <> 50 or proposal_entry_count <> 250 then
    raise exception 'Yük testi yanlış teklif üretti: teklif %, kayıt %', proposal_count, proposal_entry_count;
  end if;
  if invalid_proposal_count <> 0 then
    raise exception 'Yük testi oyun veya takım sınırlarını ihlal etti: % teklif', invalid_proposal_count;
  end if;

  insert into controlled_load_metrics(metric, value, unit) values
    ('players', load_queue_count, 'count'),
    ('proposals', proposal_count, 'count'),
    ('proposal_entries', proposal_entry_count, 'count');
end;
$$;

select jsonb_object_agg(metric, jsonb_build_object('value', value, 'unit', unit)) as controlled_load_result
from controlled_load_metrics;

rollback;
