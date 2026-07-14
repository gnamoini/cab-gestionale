-- Notifica tagliando da eseguire alla creazione lavorazione (scope: accesso Lavorazioni).

begin;

insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
) values
  ('tagliando_da_eseguire', 'role', 'operatore', 'lavorazioni', 'high', 'staff')
on conflict (type) do nothing;

commit;
