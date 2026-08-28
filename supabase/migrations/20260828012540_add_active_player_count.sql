create or replace function public.get_active_player_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(q.party_size), 0)::integer
  from public.queue_entries q
  where q.status = 'searching'
    or (
      q.status = 'proposed'
      and exists (
        select 1
        from public.proposal_entries pe
        join public.match_proposals mp on mp.id = pe.proposal_id
        where pe.queue_entry_id = q.id
          and mp.status = 'pending'
          and mp.expires_at > now()
      )
    );
$$;

revoke all on function public.get_active_player_count() from public, anon, authenticated;
grant execute on function public.get_active_player_count() to anon, authenticated;

notify pgrst, 'reload schema';
