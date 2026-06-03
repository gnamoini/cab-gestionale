-- Realtime: gap fase 9 audit (timesheet dipendenti, permessi, profili).
-- Il client sottoscrive tramite GESTIONALE_REALTIME_TABLES in GestionaleRealtimeBridge.

do $$
begin
  alter publication supabase_realtime add table public.dipendenti_timesheet_employees;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dipendenti_timesheet_entries;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_permissions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;
