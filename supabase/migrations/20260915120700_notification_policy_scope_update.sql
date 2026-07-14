-- Policy notifiche: scope per ruolo (admin/manager vedono via override role-scoped).

begin;

update public.notification_type_registry
set
  allowed_scope_type = 'role',
  allowed_scope_value = 'operatore',
  allowed_scope_module = 'lavorazioni'
where type = 'lavorazione_created';

update public.notification_type_registry
set
  allowed_scope_value = 'operatore',
  allowed_scope_module = 'lavorazioni'
where type = 'lavorazione_completata';

update public.notification_type_registry
set
  allowed_scope_type = 'role',
  allowed_scope_value = 'admin',
  allowed_scope_module = 'dipendenti'
where type = 'dipendenti_presenze_reminder';

commit;
