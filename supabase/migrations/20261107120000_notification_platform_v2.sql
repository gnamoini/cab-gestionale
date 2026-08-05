-- Notification platform v2: templates, channel prefs, extended registry types.

begin;

create table if not exists public.notification_templates (
  notification_type text primary key,
  title_template text not null,
  body_template text not null,
  icon text,
  color text,
  actions jsonb not null default '[]'::jsonb,
  deep_link_pattern text not null,
  push_payload jsonb,
  locale text not null default 'it',
  updated_at timestamptz not null default now()
);

alter table public.notification_event_preferences
  add column if not exists channels_enabled jsonb not null default '{"inbox":true,"push":true,"email":false}'::jsonb;

-- Extended notification types in registry (idempotent inserts)
insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
)
values
  ('lavorazione_aggiornata', 'role', 'operatore', 'lavorazioni', 'medium', 'staff'),
  ('lavorazione_eliminata', 'role', 'operatore', 'lavorazioni', 'medium', 'staff'),
  ('lavorazione_archiviata', 'role', 'operatore', 'lavorazioni', 'low', 'staff'),
  ('lavorazioni_ritardo_digest', 'global', '__NULL__', 'lavorazioni', 'high', 'staff'),
  ('preventivo_creato', 'role', 'addetto_amministrativo', 'preventivi', 'medium', 'staff'),
  ('preventivo_inviato', 'role', 'addetto_amministrativo', 'preventivi', 'medium', 'staff'),
  ('preventivo_rifiutato', 'role', 'addetto_amministrativo', 'preventivi', 'high', 'staff'),
  ('preventivo_convertito', 'role', 'addetto_amministrativo', 'preventivi', 'medium', 'staff'),
  ('magazzino_movimento', 'role', 'operatore', 'magazzino', 'low', 'staff'),
  ('magazzino_ricambio_creato', 'role', 'operatore', 'magazzino', 'low', 'staff'),
  ('magazzino_ricambio_eliminato', 'role', 'operatore', 'magazzino', 'medium', 'staff'),
  ('fattura_emessa', 'role', 'addetto_amministrativo', 'fatturazione', 'medium', 'staff'),
  ('fattura_pagata', 'role', 'addetto_amministrativo', 'fatturazione', 'medium', 'staff'),
  ('fattura_scaduta', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff'),
  ('mezzo_creato', 'role', 'admin', 'mezzi', 'low', 'staff'),
  ('mezzo_aggiornato', 'role', 'admin', 'mezzi', 'low', 'staff'),
  ('cliente_creato', 'role', 'addetto_amministrativo', 'fatturazione', 'low', 'staff'),
  ('cliente_aggiornato', 'role', 'addetto_amministrativo', 'fatturazione', 'low', 'staff'),
  ('attrezzatura_creata', 'role', 'admin', 'mezzi', 'low', 'staff'),
  ('attrezzatura_aggiornata', 'role', 'admin', 'mezzi', 'low', 'staff'),
  ('documento_creato', 'role', 'admin', 'documenti', 'low', 'staff'),
  ('documento_aggiornato', 'role', 'admin', 'documenti', 'low', 'staff'),
  ('compliance_in_scadenza', 'role', 'admin', 'report', 'high', 'staff'),
  ('compliance_scaduta', 'role', 'admin', 'report', 'urgent', 'staff'),
  ('ordine_creato', 'role', 'operatore', 'magazzino', 'medium', 'staff'),
  ('ordine_aggiornato', 'role', 'operatore', 'magazzino', 'low', 'staff'),
  ('system_error', 'role', 'admin', null, 'urgent', 'staff'),
  ('dashboard_promemoria_reminder', 'user', '__CALLER_UID__', null, 'medium', 'staff')
on conflict (type) do nothing;

-- Seed templates from catalog types (minimal — TS registry is SSOT for copy)
insert into public.notification_templates (notification_type, title_template, body_template, deep_link_pattern)
select
  t.type,
  t.type,
  t.type,
  '/dashboard'
from public.notification_type_registry t
on conflict (notification_type) do nothing;

commit;
