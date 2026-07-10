-- Tamamlanmış eşleşmeler geçmiş kayıtlarıdır; yeni kuyruğu engellememelidir.
drop index if exists public.one_active_queue_per_player;

create unique index one_active_queue_per_player
  on public.queue_entries(player_id)
  where status in ('searching', 'proposed');

notify pgrst, 'reload schema';
