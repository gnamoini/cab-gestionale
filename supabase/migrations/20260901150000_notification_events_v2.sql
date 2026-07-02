-- Notifiche v2: scope lavorazione_created + nuovi tipi event-driven.

begin;

update public.notification_type_registry
set
  allowed_scope_type = 'global',
  allowed_scope_value = '__NULL__',
  allowed_scope_module = null
where type = 'lavorazione_created';

insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
) values
  ('lavorazione_completata', 'role', 'addetto_amministrativo', 'lavorazioni', 'medium', 'staff'),
  ('preventivo_approvato', 'role', 'addetto_amministrativo', 'preventivi', 'high', 'staff'),
  ('lavorazioni_ritardo_digest', 'global', '__NULL__', null, 'high', 'staff'),
  ('fatture_scadute_digest', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff')
on conflict (type) do nothing;

commit;
