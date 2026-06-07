-- Prune deprecated supporto tables from supabase_realtime publication (audit RT-01).
-- Tabelle restano read-only admin; nessun client sottoscrive postgres_changes su queste tabelle.
-- Note: ALTER PUBLICATION DROP TABLE non supporta IF EXISTS (Postgres 17).

do $$
begin
  alter publication supabase_realtime drop table public.segnalazioni;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table public.support_notes;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;
