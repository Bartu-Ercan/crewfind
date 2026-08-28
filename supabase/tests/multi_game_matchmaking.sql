begin;

-- psql sayı sabitlerini, Data API'nin yaptığı gibi RPC imzasına dönüştüren test sarmalayıcısı.
create function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank integer,
  p_party_size integer,
  p_min_rank integer,
  p_max_rank integer,
  p_servers text[],
  p_queue_types text[],
  p_target_size integer,
  p_context jsonb
)
returns jsonb
language sql
as $$
  select public.enqueue_and_attempt_match(
    p_riot_id, p_rank, p_party_size::smallint, p_min_rank, p_max_rank,
    p_servers, p_queue_types, p_target_size::smallint, p_context
  );
$$;

insert into auth.users(id, aud, role, is_anonymous)
select id, 'authenticated', 'authenticated', true
from unnest(array[
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000102'::uuid,
  '00000000-0000-0000-0000-000000000103'::uuid,
  '00000000-0000-0000-0000-000000000104'::uuid,
  '00000000-0000-0000-0000-000000000105'::uuid
]) id;

create or replace function pg_temp.as_user(test_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.clear_test_searches()
returns void language plpgsql as $$
begin
  delete from public.match_proposals mp
  where exists (
    select 1 from public.proposal_entries pe
    where pe.proposal_id = mp.id
      and pe.player_id::text like '00000000-0000-0000-0000-00000000010%'
  );
  delete from public.queue_entries
  where player_id::text like '00000000-0000-0000-0000-00000000010%';
end;
$$;

-- Farklı oyunlar aynı hedef ve rank aralığında bile eşleşmez.
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match(
  'ValoOne#TR1', 10, 1, 6, 24, array['istanbul'], array['competitive'], 2,
  '{"game":"valorant","rankSystem":"valorant","contactValue":"ValoOne#TR1","roles":[],"maps":[]}'::jsonb
);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match(
  'LolTwo#TR1', 12, 1, 8, 30, array['tr1'], array['solo-duo'], 2,
  '{"game":"league-of-legends","rankSystem":"lol-solo","contactValue":"LolTwo#TR1","roles":["mid"],"maps":[]}'::jsonb
);
do $$ begin
  if exists (
    select 1 from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
    where pe.player_id in ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102')
      and mp.status = 'pending'
  ) then raise exception 'Farklı oyunlar eşleşti'; end if;
end $$;
select pg_temp.clear_test_searches();

-- LoL aynı rolü reddeder, benzersiz beş rolü eşleştirir.
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('LolOne#TR1', 12, 1, 8, 30, array['tr1'], array['solo-duo'], 2,
  '{"game":"league-of-legends","rankSystem":"lol-solo","contactValue":"LolOne#TR1","roles":["top"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('LolTwo#TR1', 12, 1, 8, 30, array['tr1'], array['solo-duo'], 2,
  '{"game":"league-of-legends","rankSystem":"lol-solo","contactValue":"LolTwo#TR1","roles":["top"],"maps":[]}'::jsonb);
do $$ begin
  if public.attempt_match() is not null then raise exception 'Çakışan LoL rolleri eşleşti'; end if;
end $$;
select pg_temp.clear_test_searches();

select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('LolOne#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolOne#TR1","roles":["top"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('LolTwo#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolTwo#TR1","roles":["jungle"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000103');
select public.enqueue_and_attempt_match('LolTri#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolTri#TR1","roles":["mid"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000104');
select public.enqueue_and_attempt_match('LolFour#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolFour#TR1","roles":["bottom"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000105');
select public.enqueue_and_attempt_match('LolFive#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolFive#TR1","roles":["support"],"maps":[]}'::jsonb);
do $$ begin
  if not exists (
    select 1 from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
    where mp.status = 'pending' group by mp.id having count(*) = 5
  ) then raise exception 'Beş benzersiz LoL rolü eşleşmedi'; end if;
end $$;
select pg_temp.clear_test_searches();

-- CS2 Competitive ortak harita ister.
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('Steam One', 7, 1, 4, 17, array['vienna'], array['competitive'], 2,
  '{"game":"cs2","rankSystem":"cs2-competitive","contactValue":"1234501","roles":[],"maps":["mirage"]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('Steam Two', 7, 1, 4, 17, array['vienna'], array['competitive'], 2,
  '{"game":"cs2","rankSystem":"cs2-competitive","contactValue":"1234502","roles":[],"maps":["nuke"]}'::jsonb);
do $$ begin
  if public.attempt_match() is not null then raise exception 'Ortak haritasız CS2 oyuncuları eşleşti'; end if;
  update public.queue_entries set maps = array['mirage', 'nuke'] where player_id = '00000000-0000-0000-0000-000000000102';
  if public.attempt_match() is null then raise exception 'Ortak haritalı CS2 oyuncuları eşleşmedi'; end if;
end $$;
select pg_temp.clear_test_searches();

-- Premier rank aralığı iki yönlüdür.
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('Premier One', 9500, 1, 5000, 50000, array['vienna'], array['premier'], 2,
  '{"game":"cs2","rankSystem":"cs2-premier","roles":[],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('Premier Two', 13000, 1, 13000, 50000, array['vienna'], array['premier'], 2,
  '{"game":"cs2","rankSystem":"cs2-premier","contactValue":"2234502","roles":[],"maps":[]}'::jsonb);
do $$ begin
  if public.attempt_match() is not null then raise exception 'Uyumsuz Premier aralıkları eşleşti'; end if;
  update public.queue_entries set min_rank = 9500 where player_id = '00000000-0000-0000-0000-000000000102';
  if public.attempt_match() is null then raise exception 'İki yönlü Premier aralığı eşleşmedi'; end if;
end $$;
select pg_temp.clear_test_searches();

-- 3+1+1 takım kompozisyonu üç oyunda da korunur.
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('ValoOne#TR1', 10, 3, 6, 24, array['istanbul'], array['competitive'], 5,
  '{"game":"valorant","rankSystem":"valorant","contactValue":"ValoOne#TR1","roles":[],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('ValoTwo#TR1', 10, 1, 6, 24, array['istanbul'], array['competitive'], 5,
  '{"game":"valorant","rankSystem":"valorant","contactValue":"ValoTwo#TR1","roles":[],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000103');
select public.enqueue_and_attempt_match('ValoTri#TR1', 10, 1, 6, 24, array['istanbul'], array['competitive'], 5,
  '{"game":"valorant","rankSystem":"valorant","contactValue":"ValoTri#TR1","roles":[],"maps":[]}'::jsonb);
do $$ begin
  if not exists (
    select 1 from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
    join public.queue_entries q on q.id = pe.queue_entry_id
    where mp.status = 'pending' and q.game = 'valorant'
    group by mp.id having count(*) = 3 and sum(q.party_size) = 5
  ) then raise exception 'VALORANT 3+1+1 eşleşmedi'; end if;
end $$;
select pg_temp.clear_test_searches();

select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('LolOne#TR1', 12, 3, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolOne#TR1","roles":["top","jungle","mid"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('LolTwo#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolTwo#TR1","roles":["bottom"],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000103');
select public.enqueue_and_attempt_match('LolTri#TR1', 12, 1, 8, 30, array['tr1'], array['flex'], 5,
  '{"game":"league-of-legends","rankSystem":"lol-flex","contactValue":"LolTri#TR1","roles":["support"],"maps":[]}'::jsonb);
do $$ begin
  if not exists (
    select 1 from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
    join public.queue_entries q on q.id = pe.queue_entry_id
    where mp.status = 'pending' and q.game = 'league-of-legends'
    group by mp.id having count(*) = 3 and sum(q.party_size) = 5
  ) then raise exception 'LoL 3+1+1 eşleşmedi'; end if;
end $$;
select pg_temp.clear_test_searches();

select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select public.enqueue_and_attempt_match('Cs Group', 9500, 3, 5000, 50000, array['vienna'], array['premier'], 5,
  '{"game":"cs2","rankSystem":"cs2-premier","contactValue":"3234501","roles":[],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select public.enqueue_and_attempt_match('Cs Solo A', 9500, 1, 5000, 50000, array['vienna'], array['premier'], 5,
  '{"game":"cs2","rankSystem":"cs2-premier","contactValue":"3234502","roles":[],"maps":[]}'::jsonb);
select pg_temp.as_user('00000000-0000-0000-0000-000000000103');
select public.enqueue_and_attempt_match('Cs Solo B', 9500, 1, 5000, 50000, array['vienna'], array['premier'], 5,
  '{"game":"cs2","rankSystem":"cs2-premier","contactValue":"3234503","roles":[],"maps":[]}'::jsonb);
do $$ begin
  if not exists (
    select 1 from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
    join public.queue_entries q on q.id = pe.queue_entry_id
    where mp.status = 'pending' and q.game = 'cs2'
    group by mp.id having count(*) = 3 and sum(q.party_size) = 5
  ) then raise exception 'CS2 3+1+1 eşleşmedi'; end if;
end $$;

rollback;
