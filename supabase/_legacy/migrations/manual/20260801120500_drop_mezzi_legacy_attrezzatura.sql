-- MANUAL APPROVAL ONLY. Run only when:
--   npm run production:check passes attrezzature-v2 gate
--   MEZZO_ATTREZZATURA_R4_APPROVED=1
--   app_settings.mezzo_attrezzature_v2.enabled = true (verified N days in prod)

-- R4: drop colonne legacy attrezzatura su mezzi (post-migrazione attrezzature)

alter table public.mezzi drop column if exists marca;
alter table public.mezzi drop column if exists modello;
alter table public.mezzi drop column if exists matricola;
alter table public.mezzi drop column if exists tipo_attrezzatura;

comment on table public.mezzi is 'Mezzo = telaio/portatore; attrezzature in tabella attrezzature.';
