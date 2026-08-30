create or replace function private.save_riot_account(
  p_account_id uuid,
  p_riot_id text,
  p_game text,
  p_preferences jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  account_id uuid;
  requested_owner_id uuid;
  requested_normalized_riot_id text;
  cleaned_riot_id text := trim(p_riot_id);
  normalized text := private.normalize_riot_id(p_riot_id);
  account_count integer;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;

  perform 1
  from public.profiles
  where id = current_user_id and account_created_at is not null
  for update;
  if not found then raise exception 'Kalıcı hesap gerekli'; end if;

  if cleaned_riot_id !~ '^[^#]{3,16}#[[:alnum:]]{3,5}$' then raise exception 'Geçersiz Riot ID'; end if;
  if p_game not in ('valorant', 'league-of-legends') then raise exception 'Geçersiz oyun'; end if;

  if p_account_id is not null then
    select owner_id, normalized_riot_id
    into requested_owner_id, requested_normalized_riot_id
    from private.riot_accounts
    where id = p_account_id;

    if not found or requested_owner_id <> current_user_id then
      raise exception 'Riot hesabı bulunamadı';
    end if;

    if requested_normalized_riot_id = normalized then
      account_id := p_account_id;
    end if;
  end if;

  if account_id is null then
    select id into account_id
    from private.riot_accounts
    where owner_id = current_user_id and normalized_riot_id = normalized;
  end if;

  if account_id is null then
    select count(*) into account_count
    from private.riot_accounts
    where owner_id = current_user_id;

    if account_count >= 10 then raise exception 'En fazla 10 Riot hesabı kaydedebilirsin'; end if;

    insert into private.riot_accounts(owner_id, riot_id, normalized_riot_id)
    values (current_user_id, cleaned_riot_id, normalized)
    on conflict (owner_id, normalized_riot_id) do update set
      riot_id = excluded.riot_id,
      updated_at = now()
    returning id into account_id;
  else
    update private.riot_accounts
    set riot_id = cleaned_riot_id,
        updated_at = now()
    where id = account_id
      and owner_id = current_user_id
      and normalized_riot_id = normalized;

    if not found then raise exception 'Riot hesabı bulunamadı'; end if;
  end if;

  insert into private.game_account_preferences(
    riot_account_id, owner_id, game, rank_system, rank_value, min_rank, max_rank,
    party_size, target_size, servers, queue_types, roles, maps
  ) values (
    account_id, current_user_id, p_game,
    p_preferences->>'rankSystem',
    (p_preferences->>'rank')::integer,
    (p_preferences->>'minRank')::integer,
    (p_preferences->>'maxRank')::integer,
    (p_preferences->>'partySize')::smallint,
    (p_preferences->>'targetSize')::smallint,
    array(select jsonb_array_elements_text(coalesce(p_preferences->'servers', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'queueTypes', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'roles', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_preferences->'maps', '[]'::jsonb)))
  )
  on conflict (riot_account_id, game) do update set
    rank_system = excluded.rank_system,
    rank_value = excluded.rank_value,
    min_rank = excluded.min_rank,
    max_rank = excluded.max_rank,
    party_size = excluded.party_size,
    target_size = excluded.target_size,
    servers = excluded.servers,
    queue_types = excluded.queue_types,
    roles = excluded.roles,
    maps = excluded.maps,
    updated_at = now();

  return account_id;
end;
$$;

revoke all on function private.save_riot_account(uuid, text, text, jsonb) from public, anon;
grant execute on function private.save_riot_account(uuid, text, text, jsonb) to authenticated;
