-- Estensione timesheet: ore assenza numeriche, note, tipo assenza snapshot.

alter table public.dipendenti_timesheet_entries
  add column if not exists ore_assenza numeric(5, 2) not null default 0,
  add column if not exists note text,
  add column if not exists tipo_assenza_id text,
  add column if not exists tipo_assenza_label text;

alter table public.dipendenti_timesheet_entries
  drop constraint if exists dipendenti_timesheet_entries_ore_assenza_check;

alter table public.dipendenti_timesheet_entries
  add constraint dipendenti_timesheet_entries_ore_assenza_check
  check (ore_assenza >= 0);

-- Migrazione legacy: assenza boolean → 8 ore assenza (giornata intera)
update public.dipendenti_timesheet_entries
set
  ore_assenza = 8,
  tipo_assenza_label = coalesce(nullif(trim(motivo_assenza), ''), 'Assenza'),
  ore_ordinarie = 0,
  ore_straordinarie = 0
where assenza = true and ore_assenza = 0;

-- Constraint giornaliero: max 24 ore totali
alter table public.dipendenti_timesheet_entries
  drop constraint if exists dipendenti_timesheet_entries_daily_hours_cap;

alter table public.dipendenti_timesheet_entries
  add constraint dipendenti_timesheet_entries_daily_hours_cap
  check (ore_ordinarie + ore_straordinarie + ore_assenza <= 24);

comment on column public.dipendenti_timesheet_entries.ore_assenza is
  'Ore di assenza nel giorno (ferie, malattia, permesso, …).';
comment on column public.dipendenti_timesheet_entries.tipo_assenza_id is
  'Id stabile tipo assenza da app_settings dipendenti/prefs.';
comment on column public.dipendenti_timesheet_entries.tipo_assenza_label is
  'Snapshot label tipo assenza al momento del salvataggio.';
