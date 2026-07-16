-- Rettifiche inventario vs movimenti operativi (magazzino ± / report KPI).
alter table public.movimenti_ricambi
  add column if not exists conta_statistiche boolean not null default true;

comment on column public.movimenti_ricambi.conta_statistiche is
  'Se false: rettifica inventario — esclusa da KPI/report/consumo.';
