/** Prompt condiviso — legacy analyze e pipeline v4.1. */

export const SCHEDA_OFFICINA_EXTRACTION_SYSTEM = `Estrai campi da schede officina meccanica (ingresso, lavorazioni, ricambi).
Il documento può essere un PDF oppure una foto/scansione (JPEG, PNG, WebP): leggi testo scritto a mano e stampato.
Per ogni campo restituisci key, value e confidence 0-1. Se incerto, confidence bassa ma estrai comunque il valore.
NON restituire un elenco fields vuoto se il documento contiene testo leggibile.

Scheda ingresso blank v2 — imposta schedaTipo "ingresso" e usa queste chiavi quando riconosci il template CAB:
data_ingresso (etichetta «Data ingresso» in alto — data scritta sul foglio in GG/MM/AAAA, non la data odierna; se illeggibile o assente ometti il campo),
cliente, cantiere, utilizzatore (solo nome persona),
tipo_attrezzatura (etichetta «Attrezzatura» su schede stampate — es. SPAZZATRICE, escavatore; NON è utilizzatore),
attrezzatura_marca, attrezzatura_modello, attrezzatura_matricola, n_scuderia, ore,
telaio_marca, telaio_modello, targa, km,
descrizione_anomalia,
riparazione, tagliando, garanzia, recidivo (checkbox sulla scheda: value "true" se barrato/spuntato, "false" se vuoto; non inferire da testo libero),
nome, cognome, telefono, note.
Per descrizione_anomalia e note: conserva gli a capo del foglio (una riga per ogni riga visibile sulla scheda; non appiattire in una sola riga).
Correggi refusi OCR evidenti nel testo (es. aspirae→aspirazione, cor→per, supp→supporto) senza inventare interventi non presenti.
Ometti n_scuderia, ore e km se la casella sul foglio è vuota (non inventare cifre).

Scheda lavorazioni blank CAB — imposta schedaTipo "lavorazioni" e usa:
cliente, targa_matricola,
riga_1_lavorazione, riga_1_nome, riga_1_ore … fino a riga_24_* (una chiave per cella; ometti righe vuote).

Scheda ricambi blank CAB — imposta schedaTipo "ricambi" e usa:
cliente, targa_matricola (in fondo al foglio),
riga_1_nome, riga_1_codice, riga_1_descrizione, riga_1_qt, riga_1_data … fino a riga_34_* (ometti righe vuote).`;

export const SCHEDA_OFFICINA_EXTRACTION_USER =
  "Estrai tutti i campi visibili dalla scheda (foto o PDF), con confidence per campo. Restituisci ogni etichetta riconosciuta in fields.";

export const SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX = `Alcuni campi sono già stati letti da OCR/PDF (JSON sotto). Verifica e correggi solo valori errati o mancanti.
Non duplicare chiavi già corrette. Completa i campi assenti. Restituisci schedaTipo e fields completi.
Campi pre-estratti:`;
