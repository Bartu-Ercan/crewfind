create function private.enforce_lol_profile_lookup_rate_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enforce_user_rate_limit('lol-profile:minute', 6, 60);
  perform private.enforce_user_rate_limit('lol-profile:hour', 20, 3600);
end;
$$;

create function public.reserve_lol_profile_lookup()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.enforce_lol_profile_lookup_rate_limit();
end;
$$;

revoke all on function private.enforce_lol_profile_lookup_rate_limit() from public, anon, authenticated;
grant execute on function private.enforce_lol_profile_lookup_rate_limit() to authenticated;

revoke all on function public.reserve_lol_profile_lookup() from public, anon;
grant execute on function public.reserve_lol_profile_lookup() to authenticated;

notify pgrst, 'reload schema';
