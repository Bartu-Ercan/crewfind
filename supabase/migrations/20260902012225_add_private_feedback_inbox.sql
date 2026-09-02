create table private.feedback_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  kind text not null check (kind in ('suggestion', 'bug', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  reply_email text check (reply_email is null or char_length(reply_email) <= 254),
  source_path text not null check (source_path ~ '^/[A-Za-z0-9/_-]*$'),
  user_id uuid references auth.users(id) on delete set null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'not_configured')),
  created_at timestamptz not null default clock_timestamp(),
  emailed_at timestamptz
);

alter table private.feedback_messages enable row level security;

create index feedback_messages_created_at_idx
on private.feedback_messages (created_at desc);

revoke all on table private.feedback_messages from public, anon, authenticated;

create function private.submit_feedback(
  p_kind text,
  p_message text,
  p_reply_email text,
  p_source_path text,
  p_ip text,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  feedback_id uuid;
  normalized_email text := nullif(lower(btrim(p_reply_email)), '');
  normalized_ip text := left(coalesce(nullif(btrim(p_ip), ''), 'unknown'), 128);
begin
  perform private.enforce_rate_limit(
    private.rate_limit_subject('feedback-ip', normalized_ip),
    'feedback:10minutes',
    4,
    600
  );
  perform private.enforce_rate_limit(
    private.rate_limit_subject('feedback-ip', normalized_ip),
    'feedback:hour',
    12,
    3600
  );

  insert into private.feedback_messages (
    kind,
    message,
    reply_email,
    source_path,
    user_id
  ) values (
    p_kind,
    btrim(p_message),
    normalized_email,
    p_source_path,
    p_user_id
  )
  returning id into feedback_id;

  return feedback_id;
end;
$$;

create function private.set_feedback_delivery_status(
  p_feedback_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'failed', 'not_configured') then
    raise exception 'Geçersiz teslim durumu';
  end if;

  update private.feedback_messages
  set delivery_status = p_status,
      emailed_at = case when p_status = 'sent' then clock_timestamp() else null end
  where id = p_feedback_id;
end;
$$;

create function public.submit_feedback(
  p_kind text,
  p_message text,
  p_reply_email text,
  p_source_path text,
  p_ip text,
  p_user_id uuid default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_feedback(
    p_kind,
    p_message,
    p_reply_email,
    p_source_path,
    p_ip,
    p_user_id
  );
$$;

create function public.set_feedback_delivery_status(
  p_feedback_id uuid,
  p_status text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_feedback_delivery_status(p_feedback_id, p_status);
$$;

revoke all on function private.submit_feedback(text, text, text, text, text, uuid)
from public, anon, authenticated;
revoke all on function private.set_feedback_delivery_status(uuid, text)
from public, anon, authenticated;
revoke all on function public.submit_feedback(text, text, text, text, text, uuid)
from public, anon, authenticated;
revoke all on function public.set_feedback_delivery_status(uuid, text)
from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.submit_feedback(text, text, text, text, text, uuid)
to service_role;
grant execute on function private.set_feedback_delivery_status(uuid, text)
to service_role;
grant execute on function public.submit_feedback(text, text, text, text, text, uuid)
to service_role;
grant execute on function public.set_feedback_delivery_status(uuid, text)
to service_role;

notify pgrst, 'reload schema';
