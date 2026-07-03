-- Presenze dipendenti 17:00: visibilità globale (tutto lo staff operativo), come digest lavorazioni.

begin;

update public.notification_type_registry
set
  allowed_scope_type = 'global',
  allowed_scope_value = '__NULL__',
  allowed_scope_module = null
where type = 'dipendenti_presenze_reminder';

commit;
