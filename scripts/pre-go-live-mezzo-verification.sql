-- Pre go-live verification — Mezzo / Scheda Ingresso
-- Eseguire su staging/prod DOPO apply migration:
--   20260723120000_mezzi_ultimo_metering.sql
--   20260723130000_mezzo_anagrafica_history.sql
--
-- NON eseguire scripts/mezzo-scheda-link-audit.ts prima della stabilizzazione.

-- Step 2a: legacy km senza cache ultimo_*
SELECT count(*) AS mezzi_senza_metering
FROM mezzi
WHERE ultimo_km_rilevato IS NULL
  AND km IS NOT NULL;

-- Step 2b: ore legacy senza cache
SELECT count(*) AS mezzi_con_ore_legacy_senza_cache
FROM mezzi
WHERE ultimo_ore_rilevate IS NULL
  AND NULLIF((meta->>'oreKm')::numeric, 0) IS NOT NULL;

-- Step 2c: baseline origine metering (atteso alto su legacy)
SELECT
  count(*) FILTER (WHERE ultimo_aggiornamento_da_lavorazione_id IS NULL) AS senza_origine,
  count(*) AS totale
FROM mezzi;

-- Post-deploy (dopo giorni): distribuzione history
SELECT origine, count(*)
FROM mezzo_anagrafica_history
GROUP BY origine
ORDER BY origine;

-- Post-test caso C: verifica separazione domini
-- SELECT origine, lavorazione_id, scheda_id, changed_fields, old_values, new_values
-- FROM mezzo_anagrafica_history
-- WHERE mezzo_id = '<uuid>'
-- ORDER BY created_at DESC
-- LIMIT 5;
