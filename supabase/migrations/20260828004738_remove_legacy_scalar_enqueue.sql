drop function public.enqueue_and_attempt_match(
  text, smallint, smallint, smallint, smallint, text, text, smallint
);

notify pgrst, 'reload schema';
