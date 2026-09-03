# Capability matrix — post discovery 2

| Capability | Status | Evidence | Confidence | Next step | Blocking? |
|------------|--------|----------|------------|-----------|-----------|
| Customer lookup API | BLOCKED | Base/clienti UNKNOWN_500 | low | vendor READ perm | yes |
| Customer ref on docs | PASS_CONDITIONED | anagrafica_id livesearch | medium | mapping seed | partial |
| Item lookup | PASS_CONDITIONED | Magazzino/articoli info | high | index con dati | no |
| Service | PASS_CONDITIONED | articoli.tipo | medium | verify S rows | no |
| IVA | PASS | Base/iva | high | id_iva in rows | no |
| UoM | PASS | unita_misura_id | high | row verify | no |
| Preventivo module | BLOCKED | preventivi UNKNOWN_500 | low | vendor | yes |
| Preventivo schema | NOT_VERIFIED | — | — | READ preventivi | yes |
| Consuntivo repr. | PASS_CONDITIONED | Produzione/task tabs | low | READ attivita | yes |
| Consuntivo billing | FAIL | no path | high | vendor | yes |
| DDT module | PASS_CONDITIONED | Magazzino/movimento | high | rows show | partial |
| DDT numbering | PARTIALLY_VERIFIED | sezionale+autoprot | low | SAFE_WRITE_TEST | partial |
| Correlation key | BLOCKED | no acceptable field | high | vendor field | yes |
| API write | NOT_TESTED | — | — | Gate B | — |

WRITE TESTS EXECUTED = 0
