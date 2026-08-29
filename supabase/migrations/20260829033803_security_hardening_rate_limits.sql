create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table private.rate_limit_secret (
  singleton boolean primary key default true check (singleton),
  salt bytea not null
);

insert into private.rate_limit_secret(singleton, salt)
values (true, extensions.gen_random_bytes(32));

create table private.rate_limit_buckets (
  subject_hash bytea not null,
  action text not null,
  window_seconds integer not null check (window_seconds > 0),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (subject_hash, action, window_seconds, window_start)
);

alter table private.rate_limit_secret enable row level security;
alter table private.rate_limit_buckets enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

create function private.rate_limit_subject(p_kind text, p_value text)
returns bytea
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.digest(
    convert_to(p_kind || ':' || p_value, 'UTF8') || secret.salt,
    'sha256'
  )
  from private.rate_limit_secret secret
  where secret.singleton;
$$;

create function private.request_ip()
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  headers jsonb;
  forwarded text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    headers := '{}'::jsonb;
  end;

  forwarded := coalesce(
    nullif(headers->>'cf-connecting-ip', ''),
    nullif(split_part(headers->>'x-forwarded-for', ',', 1), ''),
    nullif(headers->>'x-real-ip', ''),
    'unknown'
  );
  return trim(forwarded);
end;
$$;

create function private.enforce_rate_limit(
  p_subject_hash bytea,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  retry_after integer;
  updated_count integer;
begin
  if p_subject_hash is null or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Geçersiz rate limit yapılandırması';
  end if;

  insert into private.rate_limit_buckets(
    subject_hash, action, window_seconds, window_start, request_count
  ) values (
    p_subject_hash, p_action, p_window_seconds, bucket_start, 1
  )
  on conflict (subject_hash, action, window_seconds, window_start)
  do update set request_count = private.rate_limit_buckets.request_count + 1
  where private.rate_limit_buckets.request_count < p_limit
  returning request_count into updated_count;

  if updated_count is null then
    retry_after := greatest(
      1,
      ceil(extract(epoch from bucket_start + make_interval(secs => p_window_seconds) - clock_timestamp()))::integer
    );
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'RATE_LIMITED',
        'message', 'Çok fazla istek gönderildi. Kısa süre sonra tekrar dene.',
        'details', 'retryAfter=' || retry_after
      )::text,
      detail = jsonb_build_object(
        'status', 429,
        'headers', jsonb_build_object('Retry-After', retry_after::text)
      )::text;
  end if;
end;
$$;

create function private.enforce_user_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli';
  end if;
  perform private.enforce_rate_limit(
    private.rate_limit_subject('user', current_user_id::text),
    p_action,
    p_limit,
    p_window_seconds
  );
end;
$$;

create function private.enforce_ip_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.enforce_rate_limit(
    private.rate_limit_subject('ip', private.request_ip()),
    p_action,
    p_limit,
    p_window_seconds
  );
$$;

create function private.cleanup_rate_limit_buckets()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.rate_limit_buckets
  where window_start < clock_timestamp() - interval '2 hours';
$$;

alter function public.attempt_match() set schema private;
alter function public.break_lobby_and_requeue(uuid, uuid, text) set schema private;
alter function public.cleanup_stale_state() set schema private;
alter function public.expire_proposals() set schema private;
alter function public.enqueue_and_attempt_match(text, integer, smallint, integer, integer, text[], text[], smallint, jsonb) set schema private;
alter function public.get_active_player_count() set schema private;
alter function public.get_my_status() set schema private;
alter function public.is_active_lobby_member(uuid) set schema private;
alter function public.leave_current() set schema private;
alter function public.respond_to_proposal(uuid, boolean) set schema private;
alter function public.send_lobby_message(uuid, text) set schema private;

alter function private.attempt_match() set search_path = private, public;
alter function private.break_lobby_and_requeue(uuid, uuid, text) set search_path = private, public;
alter function private.cleanup_stale_state() set search_path = private, public;
alter function private.expire_proposals() set search_path = private, public;
alter function private.enqueue_and_attempt_match(text, integer, smallint, integer, integer, text[], text[], smallint, jsonb) set search_path = private, public;
alter function private.get_my_status() set search_path = private, public;
alter function private.leave_current() set search_path = private, public;
alter function private.respond_to_proposal(uuid, boolean) set search_path = private, public;
alter function private.send_lobby_message(uuid, text) set search_path = private, public;
alter function private.is_active_lobby_member(uuid) set search_path = private, public;

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
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('enqueue:minute', 6, 60);
  perform private.enforce_user_rate_limit('enqueue:hour', 30, 3600);
  return private.enqueue_and_attempt_match(
    p_riot_id, p_rank, p_party_size, p_min_rank, p_max_rank,
    p_servers, p_queue_types, p_target_size, p_context
  );
end;
$$;

create function public.get_my_status()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('status:minute', 60, 60);
  return private.get_my_status();
end;
$$;

create function public.respond_to_proposal(p_proposal_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('proposal:minute', 10, 60);
  return private.respond_to_proposal(p_proposal_id, p_accept);
end;
$$;

create function public.leave_current()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('leave:minute', 10, 60);
  perform private.leave_current();
end;
$$;

create function public.send_lobby_message(p_lobby_id uuid, p_body text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('message:10seconds', 12, 10);
  perform private.enforce_user_rate_limit('message:minute', 60, 60);
  return private.send_lobby_message(p_lobby_id, p_body);
end;
$$;

create function public.get_active_player_count()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_ip_rate_limit('active-player-count:minute', 20, 60);
  return private.get_active_player_count();
end;
$$;

drop policy if exists "members can read their lobby" on public.lobbies;
create policy "members can read their lobby"
on public.lobbies for select to authenticated
using (private.is_active_lobby_member(id));

drop policy if exists "members can read lobby members" on public.lobby_members;
create policy "members can read lobby members"
on public.lobby_members for select to authenticated
using (private.is_active_lobby_member(lobby_id));

drop policy if exists "members can read lobby messages" on public.messages;
create policy "members can read lobby messages"
on public.messages for select to authenticated
using (private.is_active_lobby_member(lobby_id));

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.enqueue_and_attempt_match(text, integer, smallint, integer, integer, text[], text[], smallint, jsonb) to authenticated;
grant execute on function private.get_my_status() to authenticated;
grant execute on function private.respond_to_proposal(uuid, boolean) to authenticated;
grant execute on function private.leave_current() to authenticated;
grant execute on function private.send_lobby_message(uuid, text) to authenticated;
grant execute on function private.get_active_player_count() to anon, authenticated;
grant execute on function private.enforce_user_rate_limit(text, integer, integer) to authenticated;
grant execute on function private.enforce_ip_rate_limit(text, integer, integer) to anon, authenticated;
grant execute on function private.is_active_lobby_member(uuid) to authenticated;

revoke all on function public.enqueue_and_attempt_match(text, integer, smallint, integer, integer, text[], text[], smallint, jsonb) from public, anon;
revoke all on function public.get_my_status() from public, anon;
revoke all on function public.respond_to_proposal(uuid, boolean) from public, anon;
revoke all on function public.leave_current() from public, anon;
revoke all on function public.send_lobby_message(uuid, text) from public, anon;
revoke all on function public.get_active_player_count() from public;
grant execute on function public.enqueue_and_attempt_match(text, integer, smallint, integer, integer, text[], text[], smallint, jsonb) to authenticated;
grant execute on function public.get_my_status() to authenticated;
grant execute on function public.respond_to_proposal(uuid, boolean) to authenticated;
grant execute on function public.leave_current() to authenticated;
grant execute on function public.send_lobby_message(uuid, text) to authenticated;
grant execute on function public.get_active_player_count() to anon, authenticated;

revoke execute on function public.text_array_is_unique(text[]) from public, anon, authenticated;

do $$
declare
  stale_job_id bigint;
begin
  select jobid into stale_job_id from cron.job where jobname = 'crewfind-cleanup-stale-state';
  if stale_job_id is not null then perform cron.unschedule(stale_job_id); end if;
end;
$$;

select cron.schedule(
  'crewfind-cleanup-stale-state',
  '* * * * *',
  'select private.cleanup_stale_state();'
);

select cron.schedule(
  'crewfind-cleanup-rate-limits',
  '17 * * * *',
  'select private.cleanup_rate_limit_buckets();'
);

notify pgrst, 'reload schema';
