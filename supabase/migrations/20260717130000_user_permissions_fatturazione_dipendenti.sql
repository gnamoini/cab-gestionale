-- Estende permessi granulari per moduli dipendenti e fatturazione.

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
    'fatturazione'
  )
);

comment on constraint user_permissions_module_chk on public.user_permissions is
  'Moduli ERP con override per utente; fallback da profiles.ruolo se assente riga.';
