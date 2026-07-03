# TKB — Source precedence policy

Maggiore valore = vince in conflitto su stesso `entityKey`.

| Precedence | sourceId |
|------------|----------|
| 100 | description_generation |
| 90 | suggestions_approved |
| 80 | preventivi_consolidated |
| 70 | schede_lavorazione |
| 60 | lavorazioni_structured |
| 50 | ricambi_componenti_map |
| 40 | cataloghi_tecnici, ricambi, app_settings_liste |
| 30 | mezzi_attrezzature |
| 20 | text_enrichment |
| 10 | seed |

Implementazione: [`merge/source-precedence.ts`](../lib/domain/technical-knowledge-base/merge/source-precedence.ts)
