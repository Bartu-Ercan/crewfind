create index if not exists feedback_messages_user_id_idx
on private.feedback_messages (user_id)
where user_id is not null;
