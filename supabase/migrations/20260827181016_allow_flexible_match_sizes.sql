alter table public.queue_entries
  drop constraint queue_entries_target_size_check;

alter table public.queue_entries
  add constraint queue_entries_target_size_check
    check (target_size between 2 and 5);

create or replace function public.enqueue_and_attempt_match(
  p_riot_id text,
  p_rank smallint,
  p_party_size smallint,
  p_min_rank smallint,
  p_max_rank smallint,
  p_server text,
  p_queue_type text,
  p_target_size smallint
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
    or p_target_size not between 2 and 5
    or p_party_size > p_target_size
    or p_server not in ('frankfurt', 'paris', 'london', 'istanbul', 'stockholm', 'warsaw')
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
    player_id, riot_id, rank_value, party_size, min_rank, max_rank, server, queue_type, target_size
  )
  values (
    current_user_id, trim(p_riot_id), p_rank, p_party_size, p_min_rank, p_max_rank, p_server, p_queue_type, p_target_size
  );

  perform attempt_match();
  return get_my_status();
end;
$$;

revoke all on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint, text, text, smallint)
  from public, anon;
grant execute on function public.enqueue_and_attempt_match(text, smallint, smallint, smallint, smallint, text, text, smallint)
  to authenticated;

notify pgrst, 'reload schema';
