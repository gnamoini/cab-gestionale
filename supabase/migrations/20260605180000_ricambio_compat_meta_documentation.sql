-- Ricambi meta: compatibilità rename-safe (ID refs) + codice originale secondario.
-- Struttura JSONB aggiuntiva (non breaking):
--   meta.compatibilitaRefs  → [{ "tree": "attrezzature"|"telai", "marcaId": "...", "modelloId"?: "..." }]
--   meta.codiceOriginaleSecondario → string (codice OE alternativo, opzionale)
--
-- Backfill compatibilitaRefs da compatibilitaMezzi legacy: eseguito lato app
-- (lib/magazzino/ricambio-compat-resolver.ts) on read/save — nessun UPDATE distruttivo qui.

comment on column public.magazzino_ricambi.meta is
  'Campi estesi ricambio: note, categoria, compatibilitaMezzi, compatibilitaRefs (ID stabili), codiceOriginaleSecondario, scortaMinima, fornitori alternativi, autoreUltimaModifica.';
