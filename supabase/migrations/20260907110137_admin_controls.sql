-- Owner-only beta operations. No client table grants and no private chat access.
create table private.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now()
);
create table private.site_controls (
  key text primary key check (key in ('matchmaking', 'feedback', 'ads')),
  enabled boolean not null,
  updated_at timestamptz not null default now()
);
insert into private.site_controls(key, enabled) values ('matchmaking', true), ('feedback', true), ('ads', true);
create table private.user_restrictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  until_at timestamptz not null,
  reason text not null check (length(reason) between 5 and 300),
  updated_at timestamptz not null default now()
);
create table private.admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on private.admin_audit(created_at desc);
create index admin_audit_actor_idx on private.admin_audit(actor_id);
alter table private.admin_members enable row level security;
alter table private.site_controls enable row level security;
alter table private.user_restrictions enable row level security;
alter table private.admin_audit enable row level security;
revoke all on private.admin_members, private.site_controls, private.user_restrictions, private.admin_audit from public, anon, authenticated;
revoke all on sequence private.admin_audit_id_seq from public, anon, authenticated;

create function private.require_admin(p_write boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text; v_session_created timestamptz;
begin
  select a.role into v_role from private.admin_members a
  join auth.users u on u.id = a.user_id
  where a.user_id = auth.uid() and not u.is_anonymous and u.email_confirmed_at is not null;
  if v_role is null or (p_write and v_role <> 'owner') then raise sqlstate '42501' using message = 'ADMIN_FORBIDDEN'; end if;
  select s.created_at into v_session_created from auth.sessions s
  where s.id::text = auth.jwt()->>'session_id' and s.user_id = auth.uid();
  if v_session_created is null then raise sqlstate '42501' using message = 'ADMIN_FORBIDDEN'; end if;
  if p_write and v_session_created < now() - interval '15 minutes' then
    raise sqlstate '42501' using message = 'ADMIN_REAUTH_REQUIRED';
  end if;
end;
$$;

create function private.get_site_controls()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(key, enabled) from private.site_controls;
$$;
create function public.get_site_controls()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.get_site_controls();
$$;

-- Keep existing RPC signatures and quotas. Only new searches are paused;
-- current lobbies, polling and leaving continue normally during maintenance.
create or replace function private.enforce_user_rate_limit(p_action text, p_limit integer, p_window_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  if p_action like 'enqueue:%' or p_action like 'proposal:%' or p_action like 'message:%' then
    perform pg_advisory_xact_lock(81467291);
  end if;
  if p_action like 'enqueue:%' and exists (select 1 from private.site_controls where key = 'matchmaking' and not enabled) then
    raise sqlstate 'PT503' using message = 'MATCHMAKING_PAUSED';
  end if;
  if (p_action like 'enqueue:%' or p_action like 'proposal:%' or p_action like 'message:%')
    and exists (select 1 from private.user_restrictions where user_id = current_user_id and until_at > now()) then
    raise sqlstate 'PT403' using message = 'ACCOUNT_RESTRICTED';
  end if;
  perform private.enforce_rate_limit(private.rate_limit_subject('user', current_user_id::text), p_action, p_limit, p_window_seconds);
end;
$$;

create function private.admin_dashboard(p_search text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_admin();
  perform private.enforce_user_rate_limit('admin:read', 20, 60);
  if length(p_search) > 100 then raise exception 'ADMIN_INVALID_INPUT'; end if;
  select jsonb_build_object(
    'updatedAt', now(),
    'role', (select role from private.admin_members where user_id = auth.uid()),
    'controls', private.get_site_controls(),
    'metrics', jsonb_build_object(
      'activePlayers', private.get_active_player_count(),
      'matchedPlayers', private.get_matched_player_count(),
      'openLobbies', (select count(*) from public.lobbies where closed_at is null),
      'permanentAccounts', (select count(*) from auth.users where not is_anonymous),
      'feedbackPending', (select count(*) from private.feedback_messages where delivery_status <> 'sent')
    ),
    'games', (select coalesce(jsonb_agg(g), '[]') from (
      select q.game, sum(q.party_size) as players, count(*) as representatives
      from public.queue_entries q where q.status = 'searching'
        or (q.status = 'proposed' and exists (select 1 from public.proposal_entries pe join public.match_proposals mp on mp.id = pe.proposal_id where pe.queue_entry_id = q.id and mp.status = 'pending' and mp.expires_at > now()))
      group by q.game order by q.game
    ) g),
    'users', (select coalesce(jsonb_agg(u), '[]') from (
      select p.id, p.username, p.riot_id as "riotId", p.last_seen_at as "lastSeenAt", not au.is_anonymous as permanent,
        r.until_at as "restrictedUntil", r.reason,
        exists(select 1 from private.admin_members a where a.user_id = p.id) as admin
      from public.profiles p join auth.users au on au.id = p.id left join private.user_restrictions r on r.user_id = p.id and r.until_at > now()
      where p_search = '' or strpos(lower(coalesce(p.username, '') || ' ' || p.riot_id || ' ' || p.id::text), lower(p_search)) > 0
      order by p.last_seen_at desc, p.id limit 30
    ) u),
    'feedback', (select coalesce(jsonb_agg(f), '[]') from (
      select id, kind, message, source_path as "sourcePath", delivery_status as "deliveryStatus", created_at as "createdAt"
      from private.feedback_messages order by created_at desc limit 20
    ) f),
    'audit', (select coalesce(jsonb_agg(a), '[]') from (
      select id, action, target, details, created_at as "createdAt" from private.admin_audit order by created_at desc, id desc limit 30
    ) a),
    'jobs', (select coalesce(jsonb_agg(j), '[]') from (
      select c.jobname as name, c.active, d.status, d.end_time as "lastRunAt"
      from cron.job c left join lateral (select status, end_time from cron.job_run_details where jobid = c.jobid order by runid desc limit 1) d on true
      where c.jobname like 'crewfind-%' order by c.jobname
    ) j)
  ) into result;
  return result;
end;
$$;

create function private.admin_action(p_action text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare target_id uuid; target_key text; hours integer; reason text; item record; before_value jsonb;
begin
  perform private.require_admin(true);
  perform private.enforce_user_rate_limit('admin:write', 10, 60);
  perform pg_advisory_xact_lock(81467291);
  if p_action = 'set_control' then
    target_key := p_payload->>'key';
    if target_key is null or jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' then raise exception 'ADMIN_INVALID_INPUT'; end if;
    select to_jsonb(enabled) into before_value from private.site_controls where key = target_key for update;
    if not found then raise exception 'ADMIN_INVALID_INPUT'; end if;
    update private.site_controls set enabled = (p_payload->>'enabled')::boolean, updated_at = now() where key = target_key;
    insert into private.admin_audit(actor_id, action, target, details) values(auth.uid(), p_action, target_key, jsonb_build_object('before', before_value, 'after', p_payload->'enabled'));
  elsif p_action in ('restrict_user', 'unrestrict_user') then
    target_id := (p_payload->>'userId')::uuid;
    reason := btrim(p_payload->>'reason');
    if target_id is null or reason is null or length(reason) not between 5 and 300
      or not exists(select 1 from public.profiles where id = target_id)
      or exists(select 1 from private.admin_members where user_id = target_id) then raise exception 'ADMIN_INVALID_INPUT'; end if;
    if p_action = 'restrict_user' then
      hours := (p_payload->>'hours')::integer;
      if hours is null or hours not in (1,24,168) then raise exception 'ADMIN_INVALID_INPUT'; end if;
      insert into private.user_restrictions(user_id, until_at, reason) values(target_id, now() + make_interval(hours => hours), reason)
      on conflict(user_id) do update set until_at = excluded.until_at, reason = excluded.reason, updated_at = now();
      -- Dissolve pending offers atomically; retain everyone else's filters.
      for item in select mp.id from public.match_proposals mp join public.proposal_entries pe on pe.proposal_id = mp.id
        where pe.player_id = target_id and mp.status = 'pending' for update of mp
      loop
        update public.queue_entries q set status = case when q.player_id = target_id then 'cancelled'::public.queue_status else 'searching'::public.queue_status end
        from public.proposal_entries pe where pe.proposal_id = item.id and q.id = pe.queue_entry_id;
        update public.match_proposals set status = 'rejected' where id = item.id;
      end loop;
      for item in select l.id from public.lobbies l join public.lobby_members lm on lm.lobby_id = l.id
        where lm.player_id = target_id and lm.left_at is null and l.closed_at is null
      loop
        perform private.break_lobby_and_requeue(item.id, target_id, 'Bir oyuncu');
      end loop;
      update public.queue_entries set status = 'cancelled' where player_id = target_id and status in ('searching', 'proposed');
    else
      delete from private.user_restrictions where user_id = target_id;
    end if;
    insert into private.admin_audit(actor_id, action, target, details) values(auth.uid(), p_action, target_id::text, jsonb_build_object('reason', reason, 'hours', hours));
  else raise exception 'ADMIN_INVALID_INPUT';
  end if;
end;
$$;

create function public.admin_dashboard(p_search text default '') returns jsonb
language sql security invoker set search_path = '' as $$ select private.admin_dashboard(p_search); $$;
create function public.admin_action(p_action text, p_payload jsonb) returns void
language sql security invoker set search_path = '' as $$ select private.admin_action(p_action, p_payload); $$;

create or replace function public.submit_feedback(p_kind text, p_message text, p_reply_email text, p_source_path text, p_ip text, p_user_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if not (private.get_site_controls()->>'feedback')::boolean then raise sqlstate 'PT503' using message = 'FEEDBACK_PAUSED'; end if;
  return private.submit_feedback(p_kind, p_message, p_reply_email, p_source_path, p_ip, p_user_id);
end;
$$;

revoke all on function private.require_admin(boolean), private.get_site_controls(), public.get_site_controls(), private.admin_dashboard(text), public.admin_dashboard(text), private.admin_action(text,jsonb), public.admin_action(text,jsonb) from public, anon, authenticated;
grant execute on function private.get_site_controls(), public.get_site_controls() to anon, authenticated, service_role;
grant execute on function private.admin_dashboard(text), public.admin_dashboard(text), private.admin_action(text,jsonb), public.admin_action(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
