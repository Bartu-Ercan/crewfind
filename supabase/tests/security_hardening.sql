begin;

create or replace function pg_temp.assert_fixed_window_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns void
language plpgsql
as $$
declare
  subject bytea := extensions.digest(convert_to(p_action || clock_timestamp()::text, 'UTF8'), 'sha256');
  call_number integer;
  rejected boolean := false;
begin
  for call_number in 1..p_limit loop
    perform private.enforce_rate_limit(subject, p_action, p_limit, p_window_seconds);
  end loop;

  begin
    perform private.enforce_rate_limit(subject, p_action, p_limit, p_window_seconds);
  exception when sqlstate 'PGRST' then
    rejected := true;
    if position('RATE_LIMITED' in sqlerrm) = 0 then
      raise exception '% güvenli hata kodu döndürmedi', p_action;
    end if;
  end;

  if not rejected then
    raise exception '% ilk limit üstü çağrıyı reddetmedi', p_action;
  end if;
end;
$$;

select pg_temp.assert_fixed_window_limit('test:enqueue:minute', 6, 60);
select pg_temp.assert_fixed_window_limit('test:enqueue:hour', 30, 3600);
select pg_temp.assert_fixed_window_limit('test:status:minute', 60, 60);
select pg_temp.assert_fixed_window_limit('test:proposal:minute', 10, 60);
select pg_temp.assert_fixed_window_limit('test:leave:minute', 10, 60);
select pg_temp.assert_fixed_window_limit('test:message:10seconds', 12, 10);
select pg_temp.assert_fixed_window_limit('test:message:minute', 60, 60);
select pg_temp.assert_fixed_window_limit('test:active-player-count:minute', 20, 60);

do $$
declare
  first_subject bytea := extensions.digest('first-subject', 'sha256');
  second_subject bytea := extensions.digest('second-subject', 'sha256');
begin
  perform private.enforce_rate_limit(first_subject, 'test:isolation', 1, 60);
  perform private.enforce_rate_limit(second_subject, 'test:isolation', 1, 60);

  insert into private.rate_limit_buckets(subject_hash, action, window_seconds, window_start, request_count)
  values (first_subject, 'test:renewal', 10, to_timestamp(0), 10);
  perform private.enforce_rate_limit(first_subject, 'test:renewal', 10, 10);
end;
$$;

do $$
declare
  signature regprocedure;
begin
  foreach signature in array array[
    'public.enqueue_and_attempt_match(text,integer,smallint,integer,integer,text[],text[],smallint,jsonb)'::regprocedure,
    'public.get_my_status()'::regprocedure,
    'public.respond_to_proposal(uuid,boolean)'::regprocedure,
    'public.leave_current()'::regprocedure,
    'public.send_lobby_message(uuid,text)'::regprocedure,
    'public.get_active_player_count()'::regprocedure,
    'public.reserve_lol_profile_lookup()'::regprocedure
  ] loop
    if (select prosecdef from pg_proc where oid = signature) then
      raise exception '% SECURITY INVOKER değil', signature;
    end if;
  end loop;

  if has_table_privilege('anon', 'private.rate_limit_buckets', 'select')
    or has_table_privilege('authenticated', 'private.rate_limit_buckets', 'select')
    or has_table_privilege('anon', 'private.rate_limit_secret', 'select')
    or has_table_privilege('authenticated', 'private.rate_limit_secret', 'select') then
    raise exception 'Rate limit private tabloları API rollerine açık';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'rate_limit_buckets'
      and data_type in ('text', 'character varying', 'inet')
      and column_name like '%subject%'
  ) then
    raise exception 'Rate limit tablosunda düz metin subject alanı var';
  end if;
end;
$$;

rollback;
