-- Abilita Supabase Realtime per le tabelle operative del gestionale
-- (il client le sottoscrive già in GestionaleRealtimeBridge).

do $$
begin
  alter publication supabase_realtime add table public.lavorazioni;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mezzi;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.magazzino_ricambi;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.movimenti_ricambi;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.preventivi;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.documenti;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.scheda_lavorazione;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.log_modifiche;
exception
  when duplicate_object then null;
end $$;
