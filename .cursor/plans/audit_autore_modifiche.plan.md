---
name: Audit autore modifiche
overview: "Audit globale e correzione root-cause dell'autore delle modifiche: Fase 1 congela l'identità server-side al momento della write (priorità RC1 batcher), unifica rendering senza sostituzione viewer; gate E2E obbligatorio; Fase 2 aggiunge colonne DB con policy esplicita per writer."
todos:
  - id: fix-batcher-autore
    content: "RC1 priorità 1: congelare autore_id al enqueue in log-modifiche-batcher + test session switch"
    status: pending
  - id: ssot-write-actor
    content: "resolveWriteActorId server-only; client usa auth.getUser() sul proprio client, mai actorId trusted dal browser verso server"
    status: pending
  - id: meta-user-id-fields
    content: "Aggiungere *UserId a meta JSON solo come fallback legacy (mai sopra log_modifiche in display)"
    status: pending
  - id: unify-display-resolver
    content: "resolveAuthorLabel + priorità log_modifiche > colonne riga > meta; viewer non sostituisce mai autore storico"
    status: pending
  - id: write-path-hardening
    content: Rimuovere created_by override lavorazioni + RPC guard inventory_receiving_apply
    status: pending
  - id: phase1-e2e-gate
    content: "Gate obbligatorio pre-Phase 2: E2E A→logout→B e B→A su entità chiave, senza dipendenza da viewer/cache/display name"
    status: pending
  - id: phase2-db-migration
    content: "PR separato: colonne created_by/updated_by con policy writer esplicita (no default auth.uid() indiscriminato)"
    status: pending
isProject: false
---

# Audit e correzione autore ultima modifica

Vedi piano completo in Cursor plans (`audit_autore_modifiche_59739e15.plan.md`) — questa copia è nel repo per tracciabilità.

## Regola architetturale (vincolante)

> **Identity of actor = sessione autenticata al momento della write → congelata nel record/evento → il rendering non deve mai poterla sostituire con l'utente che sta visualizzando.**

## Modifiche al piano (feedback utente)

1. **`resolveWriteActorId` server-authoritative** — modulo `server-only`; client services usano `authUserId(sb)` sul proprio Supabase client; mai `actorId` trusted dal browser verso API/server.
2. **Priorità display:** `log_modifiche` > colonne riga > meta `*UserId` > stringhe legacy; meta non sovrascrive log.
3. **Fase 2:** policy writer esplicita per colonna (servizio / RPC / trigger); no `default auth.uid()` indiscriminato.
4. **Gate E2E obbligatorio** prima del PR Phase 2 (A→logout→B, B→A, senza dipendenza da viewer/cache/display name).
5. **RC1 batcher** resta il primo fix da implementare.
