-- V2 mezzo shell: insert senza legacy attrezzatura su mezzi (sanitize strip).
-- ponytail: bridge fino a R4 drop manual — nullable + check ammessi.

alter table public.mezzi alter column marca drop not null;
alter table public.mezzi alter column modello drop not null;

alter table public.mezzi drop constraint if exists mezzi_marca_len;
alter table public.mezzi add constraint mezzi_marca_len check (
  marca is null or char_length(trim(marca)) > 0
);

alter table public.mezzi drop constraint if exists mezzi_modello_len;
alter table public.mezzi add constraint mezzi_modello_len check (
  modello is null or char_length(trim(modello)) > 0
);
