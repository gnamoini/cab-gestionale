-- Permesso modulo ordini_fornitori su user_permissions.

alter table public.user_permissions drop constraint if exists user_permissions_module_chk;

alter table public.user_permissions add constraint user_permissions_module_chk check (
  module in (
    'magazzino',
    'preventivi',
    'lavorazioni',
    'mezzi',
    'report',
    'documenti',
    'dipendenti',
    'fatturazione',
    'ddt',
    'ordini_fornitori'
  )
);
