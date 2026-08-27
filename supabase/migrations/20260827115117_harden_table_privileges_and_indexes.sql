-- Keep the Data API private by default. Client reads are limited to lobby messages;
-- all writes and matchmaking state changes continue through authenticated RPCs.
revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.messages to authenticated;

-- Avoid evaluating auth.uid() once per profile row.
drop policy if exists "profile owner can read" on public.profiles;
create policy "profile owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- Cover foreign keys used by cleanup and membership/proposal lookups.
create index if not exists lobby_members_player_id_idx
  on public.lobby_members(player_id);
create index if not exists lobby_members_queue_entry_id_idx
  on public.lobby_members(queue_entry_id);
create index if not exists messages_player_id_idx
  on public.messages(player_id);
create index if not exists proposal_entries_player_id_idx
  on public.proposal_entries(player_id);
create index if not exists proposal_entries_queue_entry_id_idx
  on public.proposal_entries(queue_entry_id);

notify pgrst, 'reload schema';
