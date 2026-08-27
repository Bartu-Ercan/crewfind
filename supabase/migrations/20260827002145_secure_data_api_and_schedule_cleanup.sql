-- New Supabase projects do not expose SQL-created entities to client roles by default.
-- CrewFind only reads messages directly; all other client operations use authenticated RPCs.
grant usage on schema public to authenticated;
grant select on table public.messages to authenticated;

revoke all on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint)
  from public, anon;
revoke all on function public.get_my_status()
  from public, anon;
revoke all on function public.respond_to_proposal(uuid, boolean)
  from public, anon;
revoke all on function public.send_lobby_message(uuid, text)
  from public, anon;
revoke all on function public.leave_current()
  from public, anon;

grant execute on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint)
  to authenticated;
grant execute on function public.get_my_status()
  to authenticated;
grant execute on function public.respond_to_proposal(uuid, boolean)
  to authenticated;
grant execute on function public.send_lobby_message(uuid, text)
  to authenticated;
grant execute on function public.leave_current()
  to authenticated;

create extension if not exists pg_cron with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'crewfind-cleanup-stale-state'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'crewfind-cleanup-stale-state',
    '* * * * *',
    'select public.cleanup_stale_state();'
  );
end;
$$;

notify pgrst, 'reload schema';
