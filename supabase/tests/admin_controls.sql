-- Run after the migration, inside BEGIN / ROLLBACK. Never persists test users.
do $$
declare owner_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid(); session_id uuid := gen_random_uuid(); member_session uuid := gen_random_uuid(); snapshot jsonb;
begin
  insert into auth.users(id, email, email_confirmed_at, is_anonymous) values
    (owner_id, owner_id::text || '@example.test', now(), false), (member_id, member_id::text || '@example.test', now(), false);
  insert into auth.sessions(id, user_id, created_at, updated_at) values(session_id,owner_id,now(),now()),(member_session,member_id,now(),now());
  insert into public.profiles(id, riot_id, rank_value) values(member_id,'AdminTest#TR1',10);
  insert into private.admin_members(user_id,role) values(owner_id,'owner');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session,'user_metadata',jsonb_build_object('role','owner'))::text,true);
  execute 'set local role authenticated';
  begin perform 1 from private.admin_members; raise exception 'TEST: private table readable'; exception when insufficient_privilege then null; end;
  begin perform public.admin_dashboard(); raise exception 'TEST: ordinary user gained access'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  snapshot := public.admin_dashboard();
  if snapshot->'metrics' is null or snapshot ? 'messages' then raise exception 'TEST: invalid dashboard'; end if;
  perform public.admin_action('set_control','{"key":"matchmaking","enabled":false}');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session)::text,true);
  begin
    perform public.enqueue_and_attempt_match('AdminTest#TR1',10,1::smallint,0,24,array['istanbul'],array['competitive'],5::smallint,'{}');
    raise exception 'TEST: maintenance bypass';
  exception when sqlstate 'PT503' then null; end;
  perform public.get_my_status();
  perform public.leave_current();
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  perform public.admin_action('set_control','{"key":"matchmaking","enabled":true}');
  perform public.admin_action('restrict_user',jsonb_build_object('userId',member_id,'reason','Rollback verification','hours',1));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session)::text,true);
  begin
    perform public.enqueue_and_attempt_match('AdminTest#TR1',10,1::smallint,0,24,array['istanbul'],array['competitive'],5::smallint,'{}');
    raise exception 'TEST: restriction bypass';
  exception when sqlstate 'PT403' then null; end;
  begin perform public.send_lobby_message(gen_random_uuid(),'Test message'); raise exception 'TEST: chat restriction bypass'; exception when sqlstate 'PT403' then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  perform public.admin_action('unrestrict_user',jsonb_build_object('userId',member_id,'reason','Rollback verification'));
  execute 'reset role';
  if (select count(*) from private.admin_audit where actor_id=owner_id) <> 4 then raise exception 'TEST: audit missing'; end if;
  -- Exercise a real two-person lobby, then restrict one participant.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session)::text,true);
  perform public.enqueue_and_attempt_match('AdminTest#TR1',24,1::smallint,24,24,array['istanbul'],array['competitive'],2::smallint,'{}');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  snapshot := public.enqueue_and_attempt_match('AdminOwner#TR1',24,1::smallint,24,24,array['istanbul'],array['competitive'],2::smallint,'{}');
  if snapshot->>'status' <> 'proposed' then raise exception 'TEST: proposal not created'; end if;
  perform public.respond_to_proposal((snapshot->>'proposalId')::uuid,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session)::text,true);
  snapshot := public.respond_to_proposal((snapshot->>'proposalId')::uuid,true);
  if snapshot->>'status' <> 'lobby' then raise exception 'TEST: lobby not created'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  perform public.admin_action('restrict_user',jsonb_build_object('userId',member_id,'reason','Lobby rollback verification','hours',1));
  snapshot := public.get_my_status();
  if snapshot->>'status' <> 'searching' then raise exception 'TEST: remaining member not requeued'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','session_id',member_session)::text,true);
  snapshot := public.get_my_status();
  if snapshot->>'status' <> 'idle' then raise exception 'TEST: restricted member remains active'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',session_id)::text,true);
  update auth.sessions set created_at=now()-interval '16 minutes' where id=session_id;
  begin perform public.admin_action('set_control','{"key":"ads","enabled":false}'); raise exception 'TEST: stale login accepted'; exception when insufficient_privilege then null; end;
  update auth.sessions set created_at=now() where id=session_id;
  update private.admin_members set role='viewer' where user_id=owner_id;
  perform public.admin_dashboard();
  begin perform public.admin_action('set_control','{"key":"ads","enabled":false}'); raise exception 'TEST: viewer mutation accepted'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  begin perform public.admin_dashboard(); raise exception 'TEST: missing session accepted'; exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','private.admin_members','SELECT') or has_table_privilege('anon','private.site_controls','SELECT')
    or has_table_privilege('authenticated','private.admin_audit','INSERT') or has_function_privilege('anon','public.admin_action(text,jsonb)','EXECUTE') then
    raise exception 'TEST: unexpected client grant';
  end if;
end;
$$;
select 'admin controls regression passed' as result;
