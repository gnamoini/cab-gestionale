-- Realtime su auth_logs (dashboard sicurezza admin, invalidazione cache client).
do $$
begin
  alter publication supabase_realtime add table public.auth_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
