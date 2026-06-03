-- Input security: vincolo lunghezza descrizione promemoria (allineato UI/service 2000 char).

alter table public.dashboard_promemoria
  drop constraint if exists dashboard_promemoria_description_len;

alter table public.dashboard_promemoria
  add constraint dashboard_promemoria_description_len
  check (description is null or char_length(trim(description)) <= 2000);
