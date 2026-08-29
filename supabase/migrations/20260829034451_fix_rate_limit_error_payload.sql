create or replace function private.enforce_rate_limit(
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

revoke all on function private.enforce_rate_limit(bytea, text, integer, integer)
from public, anon, authenticated;
