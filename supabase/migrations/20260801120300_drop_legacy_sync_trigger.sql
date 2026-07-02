-- R2: rimuove trigger sync legacy mezzi.marca/modello (UI legge nuovo modello)

drop trigger if exists trg_sync_mezzi_legacy_from_attrezzatura on public.attrezzature;
drop function if exists public.sync_mezzi_legacy_from_attrezzatura();
