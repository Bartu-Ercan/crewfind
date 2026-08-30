begin;

insert into auth.users(id, aud, role, is_anonymous, email)
values
  ('00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', false, 'account-one@example.test'),
  ('00000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', false, 'account-two@example.test');

create or replace function pg_temp.as_account_user(test_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', test_user, 'role', 'authenticated')::text, true);
end;
$$;

select pg_temp.as_account_user('00000000-0000-0000-0000-000000000201');
select public.ensure_account_profile('Alpha User', null, '2026-08-29');

do $$
declare
  account_id uuid;
  same_account_id uuid;
  edited_account_id uuid;
  duplicate_account_id uuid;
  overview jsonb;
begin
  if (select username from public.profiles where id = auth.uid()) <> 'Alpha_User' then
    raise exception 'Provider adı güvenli kullanıcı adına dönüştürülmedi';
  end if;

  account_id := public.save_riot_account(
    null,
    'AlphaOne#TR1',
    'valorant',
    '{"rankSystem":"valorant","rank":10,"minRank":6,"maxRank":24,"partySize":1,"targetSize":5,"servers":["istanbul"],"queueTypes":["competitive"],"roles":[],"maps":[]}'::jsonb
  );

  perform public.save_riot_account(
    null,
    'alphaone#tr1',
    'league-of-legends',
    '{"rankSystem":"lol-solo","rank":12,"minRank":8,"maxRank":30,"partySize":1,"targetSize":2,"servers":["tr1"],"queueTypes":["solo-duo"],"roles":["mid"],"maps":[]}'::jsonb
  );

  if (select count(*) from private.riot_accounts where owner_id = auth.uid()) <> 1 then
    raise exception 'Normalleştirilmiş Riot ID yinelendi';
  end if;

  if (select count(*) from private.game_account_preferences where riot_account_id = account_id) <> 2 then
    raise exception 'Oyun tercihleri aynı Riot hesabında saklanmadı';
  end if;

  same_account_id := public.save_riot_account(
    account_id,
    'ALPHAONE#tr1',
    'valorant',
    '{"rankSystem":"valorant","rank":11,"minRank":7,"maxRank":24,"partySize":1,"targetSize":5,"servers":["istanbul"],"queueTypes":["competitive"],"roles":[],"maps":[]}'::jsonb
  );

  if same_account_id <> account_id then
    raise exception 'Aynı normalize Riot ID mevcut hesabı güncellemedi';
  end if;

  if (select rank_value from private.game_account_preferences where riot_account_id = account_id and game = 'valorant') <> 11 then
    raise exception 'Aynı Riot hesabının oyun tercihi güncellenmedi';
  end if;

  edited_account_id := public.save_riot_account(
    account_id,
    'BravoTwo#TR1',
    'valorant',
    '{"rankSystem":"valorant","rank":14,"minRank":9,"maxRank":24,"partySize":2,"targetSize":5,"servers":["istanbul","frankfurt"],"queueTypes":["competitive"],"roles":[],"maps":[]}'::jsonb
  );

  if edited_account_id = account_id then
    raise exception 'Düzenlenen Riot ID eski hesabı sessizce yeniden adlandırdı';
  end if;

  if not exists (
    select 1 from private.riot_accounts
    where id = account_id and owner_id = auth.uid() and normalized_riot_id = 'alphaone#tr1'
  ) then
    raise exception 'Eski Riot hesabı farklı ID kaydında korunmadı';
  end if;

  duplicate_account_id := public.save_riot_account(
    account_id,
    'bravotwo#tr1',
    'league-of-legends',
    '{"rankSystem":"lol-solo","rank":13,"minRank":9,"maxRank":30,"partySize":1,"targetSize":2,"servers":["tr1"],"queueTypes":["solo-duo"],"roles":["support"],"maps":[]}'::jsonb
  );

  if duplicate_account_id <> edited_account_id then
    raise exception 'Mevcut normalize Riot ID yinelenmek yerine upsert edilmedi';
  end if;

  if (select count(*) from private.riot_accounts where owner_id = auth.uid()) <> 2 then
    raise exception 'Riot ID düzenleme veya yinelenen kayıt yanlış hesap sayısı oluşturdu';
  end if;

  if (select rank_value from private.game_account_preferences where riot_account_id = account_id and game = 'valorant') <> 11 then
    raise exception 'Yeni Riot ID kaydı eski hesabın tercihini değiştirdi';
  end if;

  overview := public.get_account_overview();
  if jsonb_array_length(overview->'riotAccounts') <> 2 then
    raise exception 'Hesap özeti yanlış Riot hesabı sayısı döndürdü';
  end if;
end;
$$;

select pg_temp.as_account_user('00000000-0000-0000-0000-000000000202');
select public.ensure_account_profile('Alpha User', null, '2026-08-29');

do $$
declare
  first_account_id uuid;
  ownership_blocked boolean := false;
  save_ownership_blocked boolean := false;
begin
  if lower((select username from public.profiles where id = auth.uid())) = 'alpha_user' then
    raise exception 'Büyük/küçük harf duyarsız kullanıcı adı çakışması çözülmedi';
  end if;

  select id into first_account_id
  from private.riot_accounts
  where owner_id = '00000000-0000-0000-0000-000000000201';

  begin
    perform public.delete_riot_account(first_account_id);
  exception when others then
    ownership_blocked := true;
  end;

  if not ownership_blocked then
    raise exception 'Başka kullanıcının Riot hesabı silinebildi';
  end if;

  if not exists (select 1 from private.riot_accounts where id = first_account_id) then
    raise exception 'Sahiplik kontrolü veriyi sildi';
  end if;

  begin
    perform public.save_riot_account(
      first_account_id,
      'alphaone#tr1',
      'valorant',
      '{"rankSystem":"valorant","rank":10,"minRank":6,"maxRank":24,"partySize":1,"targetSize":5,"servers":["istanbul"],"queueTypes":["competitive"],"roles":[],"maps":[]}'::jsonb
    );
  exception when others then
    save_ownership_blocked := true;
  end;

  if not save_ownership_blocked then
    raise exception 'Başka kullanıcının Riot hesap IDsi kayıt işleminde kullanılabildi';
  end if;

  if exists (select 1 from private.riot_accounts where owner_id = auth.uid()) then
    raise exception 'Başkasına ait hesap IDsi ikinci kullanıcı için kayıt oluşturdu';
  end if;

  if has_table_privilege('anon', 'private.riot_accounts', 'select')
    or has_table_privilege('authenticated', 'private.riot_accounts', 'select')
    or has_table_privilege('anon', 'private.game_account_preferences', 'select')
    or has_table_privilege('authenticated', 'private.game_account_preferences', 'select') then
    raise exception 'Özel hesap tabloları Data API rollerine açık';
  end if;

  if has_function_privilege('anon', 'private.save_riot_account(uuid,text,text,jsonb)', 'execute')
    or not has_function_privilege('authenticated', 'private.save_riot_account(uuid,text,text,jsonb)', 'execute') then
    raise exception 'Özel Riot hesap fonksiyonu yetkileri dar değil';
  end if;

  if to_regprocedure('public.save_riot_account(uuid,text,text,jsonb)') is null
    or (select prosecdef from pg_proc where oid = 'public.save_riot_account(uuid,text,text,jsonb)'::regprocedure)
    or not (select prosecdef from pg_proc where oid = 'private.save_riot_account(uuid,text,text,jsonb)'::regprocedure)
    or not (select proconfig @> array['search_path=""'] from pg_proc where oid = 'private.save_riot_account(uuid,text,text,jsonb)'::regprocedure) then
    raise exception 'Riot hesap RPC imzası veya güvenlik sınırı değişti';
  end if;
end;
$$;

rollback;
