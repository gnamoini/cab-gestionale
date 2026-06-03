-- Orario opzionale sui promemoria dashboard: notifica 30 min prima se impostato, altrimenti alle 09:00.

alter table public.dashboard_promemoria
  add column if not exists event_time time;

comment on column public.dashboard_promemoria.event_time is
  'Orario opzionale dell''evento; se null la notifica è alle 09:00 del giorno evento.';

comment on table public.dashboard_promemoria is
  'Promemoria operativi condivisi (Dashboard); notifica client alle 09:00 o 30 min prima se event_time è impostato.';
