# Slow Query Audit Report

Generated: 2026-06-11T22:37:10.166Z
Linked DB available: yes

## 1. Top query lente (pg_stat_statements)

_Filtrate query applicative PostgREST (escluse metadata Supabase)._

| Rank | Query prefix | Calls | Mean ms | Total ms |
|------|--------------|-------|---------|----------|
| 1 | WITH pgrst_source AS (INSERT INTO "public"."mezzi"("anno", "cliente", "marca", " | 10 | 83.11 | 831.11 |
| 2 | WITH pgrst_source AS (INSERT INTO "public"."mezzi"("anno", "cliente", "entity_ke | 234 | 66.50 | 15561.95 |
| 3 | WITH pgrst_source AS (INSERT INTO "public"."magazzino_ricambi"("codice", "consum | 34 | 65.21 | 2217.22 |
| 4 | WITH pgrst_source AS ( SELECT "public"."lavorazioni".*, row_to_json("lavorazioni | 174 | 40.01 | 6961.07 |
| 5 | WITH pgrst_source AS ( SELECT "public"."log_modifiche".*, row_to_json("log_modif | 13340 | 37.48 | 499964.31 |
| 6 | WITH pgrst_source AS ( SELECT "public"."lavorazioni".*, row_to_json("lavorazioni | 1035 | 36.08 | 37345.95 |
| 7 | WITH pgrst_source AS (INSERT INTO "public"."lavorazioni"("data_ingresso", "data_ | 50 | 32.80 | 1639.92 |

## 2. Query più frequenti (pg_stat_statements by calls)

| Rank | Query prefix | Calls | Total ms |
|------|--------------|-------|----------|
| 1 | WITH pgrst_source AS ( SELECT "public"."profiles"."ruolo" FROM "public"."profile | 79752 | 58029.26 |
| 2 | WITH pgrst_source AS ( SELECT "public"."scheda_lavorazione".* FROM "public"."sch | 66858 | 77488.58 |
| 3 | WITH pgrst_source AS ( SELECT "public"."app_settings".* FROM "public"."app_setti | 37754 | 72988.34 |
| 4 | WITH pgrst_source AS (UPDATE "public"."app_settings" SET "updated_by" = "pgrst_b | 31967 | 48627.53 |
| 5 | WITH pgrst_source AS ( SELECT "public"."lavorazioni".*, row_to_json("lavorazioni | 24674 | 382439.89 |
| 6 | WITH pgrst_source AS ( SELECT "public"."scheda_lavorazione".* FROM "public"."sch | 14614 | 206838.92 |
| 7 | WITH pgrst_source AS ( SELECT "public"."log_modifiche".*, row_to_json("log_modif | 13340 | 499964.31 |
| 8 | WITH pgrst_source AS ( SELECT "public"."magazzino_ricambi".* FROM "public"."maga | 8636 | 50176.97 |
| 9 | WITH pgrst_source AS ( SELECT "public"."lavorazioni".*, row_to_json("lavorazioni | 3824 | 82826.65 |
| 10 | WITH pgrst_source AS ( SELECT "public"."mezzi".* FROM "public"."mezzi"  ORDER BY | 3369 | 64570.78 |

## 3. Seq scan rilevati (EXPLAIN)

| Query | Table rows | Seq scan | Execution ms (RLS on) | Note |
|-------|------------|----------|----------------------|------|
| Q1 lista_attive | 37 | yes | 0.131 | Seq scan OK — 37 rows < threshold 500 |
| Q2 lista_archivio | 37 | yes | 0.158 | Seq scan OK — 37 rows < threshold 500 |
| Q3 search_codice_trgm | 37 | yes | 0.145 | Seq scan OK — 37 rows < threshold 500 |
| Q4 search_note_trgm | 37 | yes | 0.156 | Seq scan OK — 37 rows < threshold 500 |
| Q5 filter_priorita | 37 | yes | 0.107 | Seq scan OK — 37 rows < threshold 500 |
| Q7 lista | 38 | yes | 0.134 | Seq scan OK — 38 rows < threshold 500 |
| Q9 lista_codice | 14 | yes | 0.153 | Seq scan OK — 14 rows < threshold 500 |
| Q10 search_nome_trgm | 14 | yes | 0.129 | Seq scan OK — 14 rows < threshold 500 |
| Q12 movimenti_per_ricambio | 0 | yes | 0.733 | Seq scan OK — 0 rows < threshold 500 |
| Q13 batch_by_lavorazione_ids | 37 | yes | 0.157 | Seq scan OK — 37 rows < threshold 500 |
| Q15 movimenti_join_mezzo | 0 | yes | 0.147 | Seq scan OK — 0 rows < threshold 500 |
| Q19 app_settings_select | 10 | yes | 0.152 | Seq scan OK — 10 rows < threshold 500 |
| Q20 single_lavorazione | 37 | yes | 0.087 | Seq scan OK — 37 rows < threshold 500 |

## 4. Indici mancanti proposti

_Nessun nuovo indice proposto senza evidenza EXPLAIN._

## 5. Overhead RLS

| Query | No RLS ms | RLS on ms | Overhead % |
|-------|----------|-----------|------------|
| Q1 lista_attive | 0.181 | 0.131 | -27.6% |
| Q6 stato_archived_sort | 0.173 | 0.098 | -43.4% |
| Q8 cliente_eq | 0.153 | 0.097 | -36.6% |
| Q14 lista_with_mezzo_fk | 0.105 | 0.063 | -40% |
| Q15 movimenti_join_mezzo | 0.159 | 0.147 | -7.5% |
| Q16 log_modifiche_entita | 1.66 | 0.38 | -77.1% |

## 6. Ottimizzazioni già applicate
- ROI waterfall: preventivi embed mezzi (−1 query), report DTO server, movimenti mezzo join
- Migration `20260711120000_db_performance_indexes` (trgm, stato/archived, movimenti ricambio)
- `idx_log_modifiche_entita_entita_id_created_at` su hub log
- **P0 in questa run**: nessuna migration/indice aggiunto (seq scan sotto soglia righe 500 su dev; indici log_modifiche già presenti)

## 7. Benchmark before/after (vs baseline)

_Prima baseline o nessuna regressione >10%._

## 8. Query frequency audit

| Area | Query | Necessaria | Duplicata | Evitabile |
|------|-------|------------|-----------|-----------|
| Dashboard | lavorazioni_attive_light_embed | sì | no | no |
| Dashboard | magazzino_report_light | sì | no | no |
| Dashboard | schede_bundles_batch | sì | no | no |
| Dashboard | app_settings_payload | sì | sì | no |
| Lavorazioni | lista_attive_light_embed | sì | no | no |
| Lavorazioni | lista_archivio | sì | no | no |
| Mezzi | mezzi_list_light | sì | no | no |
| Magazzino | magazzino_ricambi_full | sì | no | no |
| Documenti | documenti_list | sì | no | no |
| Report | lavorazioni_report_light | sì | no | no |
| Report | movimenti_full_list | sì | no | no |
| Preventivi | preventivi_mezzi_embed | sì | no | no |
| Hub dettaglio | lavorazione_hub_6_atoms | sì | sì | sì |
| Hub dettaglio | movimenti_by_mezzo_join | sì | no | no |
| Hub dettaglio | log_modifiche_profiles_embed | sì | no | no |
| Portale cliente | lavorazioni_mezzi_inner_cliente | sì | no | no |

## 9. Payload audit (REST subset)

| Query | Rows | KB | Wall ms |
|-------|------|-----|---------|
| rest-lav-light-attive | 14 | 8.21 | 825.78 |
| rest-lav-report | 34 | 16.08 | 103.16 |
| rest-movimenti | 0 | 0 | 84.53 |
| rest-preventivi | 0 | 0 | 133.45 |
| rest-documenti | 0 | 0 | 103.08 |

## 10. Hotspot ranking

### P1
- pg_stat: SELECT name FROM pg_timezone_names — mean 604.74ms (189 calls)
- REST latency rest-lav-light-attive: 825.78ms

### P2
- Hub dettaglio/lavorazione_hub_6_atoms: fetch evitabile (BFF hub exists but not wired — cache-hit from list when warm)
- RLS rbac_can_read_row O(n) su liste — refactor solo con evidenza produzione
- Hub modali BFF server — ROI insufficiente (documentato)

## 11. Problemi residui
- Nessun seq scan azionabile sopra soglia righe in questa run
- Monitorare: SELECT name FROM pg_timezone_names (mean 604.74ms)

## 12. Raccomandazioni future (ROI)
1. pg_stat: SELECT name FROM pg_timezone_names — mean 604.74ms (189 calls)
1. REST latency rest-lav-light-attive: 825.78ms
1. Eseguire npm run ops:slow-query-audit post-deploy e confrontare con baseline
1. Non aggiungere indici senza EXPLAIN before/after su dataset rappresentativo
