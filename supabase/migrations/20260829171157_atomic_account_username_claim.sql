create or replace function private.ensure_account_profile(
  p_seed text,
  p_avatar_url text,
  p_terms_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_is_anonymous boolean;
  selected_username text;
begin
  if current_user_id is null then raise exception 'Oturum gerekli'; end if;
  select is_anonymous into current_is_anonymous from auth.users where id = current_user_id;
  if coalesce(current_is_anonymous, true) then raise exception 'Kalıcı hesap gerekli'; end if;
  if coalesce(p_terms_version, '') <> '2026-08-29' then raise exception 'Sözleşme kabulü gerekli'; end if;

  select username into selected_username from public.profiles where id = current_user_id;
  if selected_username is null then selected_username := private.username_seed(p_seed); end if;

  loop
    begin
      insert into public.profiles(
        id, riot_id, rank_value, game, rank_system, username, avatar_url,
        terms_version, terms_accepted_at, account_created_at, last_seen_at
      ) values (
        current_user_id, 'Oyuncu#TR1', 0, 'valorant', 'valorant', selected_username,
        nullif(left(trim(p_avatar_url), 500), ''), p_terms_version, now(), now(), now()
      )
      on conflict (id) do update set
        username = coalesce(public.profiles.username, excluded.username),
        avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
        terms_version = excluded.terms_version,
        terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
        account_created_at = coalesce(public.profiles.account_created_at, excluded.account_created_at);
      exit;
    exception when unique_violation then
      selected_username := private.username_seed(p_seed);
    end;
  end loop;

  return private.get_account_overview();
end;
$$;
