/** Prompt condiviso — legacy analyze e pipeline v4.1. */

const COMMON_RULES = `Estrai campi da schede officina meccanica (ingresso, lavorazioni, ricambi).
Documento: PDF o foto/scansione (JPEG, PNG, WebP) con testo manoscritto o stampato.
Per ogni campo: key, value, confidence 0-1. Se incerto, confidence bassa ma estrai il valore.
Non restituire fields vuoto se il documento contiene testo leggibile.
Correggi refusi OCR evidenti senza inventare dati. Ometti campi con casella vuota (non inventare cifre).`;

export const SCHEDA_OFFICINA_EXTRACTION_SYSTEM = `${COMMON_RULES}

schedaTipo "ingresso" (template CAB blank v2):
data_ingresso (GG/MM/AAAA sul foglio, non oggi; ometti se assente),
cliente, cantiere, utilizzatore (solo persona),
tipo_attrezzatura (etichetta «Attrezzatura» — es. SPAZZATRICE; NON utilizzatore),
attrezzatura_marca, attrezzatura_modello, attrezzatura_matricola, n_scuderia, ore,
telaio_marca, telaio_modello, targa, km, descrizione_anomalia,
riparazione, tagliando, garanzia, recidivo (checkbox: "true" se barrato, "false" se vuoto),
nome, cognome, telefono, note.
descrizione_anomalia e note: conserva a capo riga per riga.

schedaTipo "lavorazioni":
cliente, targa_matricola, riga_1_lavorazione, riga_1_nome, riga_1_ore … riga_24_* (ometti righe vuote).

schedaTipo "ricambi":
cliente, targa_matricola (in fondo), riga_1_nome, riga_1_codice, riga_1_descrizione, riga_1_qt, riga_1_data … riga_34_* (ometti righe vuote).`;

export const SCHEDA_OFFICINA_EXTRACTION_USER =
  "Estrai tutti i campi visibili dalla scheda (foto o PDF), con confidence per campo. Restituisci ogni etichetta riconosciuta in fields.";

export const SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX = `Campi pre-estratti da OCR/PDF (JSON sotto). Verifica, correggi errori, completa mancanti. Non duplicare chiavi corrette. Restituisci schedaTipo e fields completi.
Campi pre-estratti:`;
