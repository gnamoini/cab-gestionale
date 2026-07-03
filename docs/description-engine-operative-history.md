# Description Engine — Memoria storica operativa (OHR)

Layer **separato dalla TKB** usato solo in generazione descrizioni.

## Pipeline

1. `rankOperativeHistoryFromContext` — candidati da preventivi storici (`ctx.existingPreventiviRecords`)
2. TKB match + linee
3. `fuseWithOperativeHistory` — priorità storico se score > TKB e similarità ≥ 0.45
4. Revisione operatore
5. `recordOperativeHistoryFeedback` (server) — boost `operative_history_signals` su `zero_edit`

## Tier

1. Stesso mezzo
2. Stesso cliente (boost se ≥ 3 casi)
3. Marca/modello simile
4. Categoria
5. TKB generale

## Persistenza

- `operative_history_cases` — casi indicizzati
- `operative_history_signals` — pesi appresi (non modifica TKB)

## Source types

`history_same_mezzo`, `history_same_client`, `history_similar_mezzo`, `history_similar_intervento`
