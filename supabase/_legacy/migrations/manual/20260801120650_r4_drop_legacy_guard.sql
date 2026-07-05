-- Post R4: cleanup trigger/funzioni legacy write guard (colonne mezzi attrezzatura già droppate).
-- Eseguire SOLO dopo 20260801120500_drop_mezzi_legacy_attrezzatura.sql

drop trigger if exists guard_mezzi_legacy_attrezzatura_write on public.mezzi;
drop function if exists public.guard_mezzi_legacy_attrezzatura_write();
drop function if exists public.mezzi_legacy_attrezzatura_valued(text, text, text, text);
