# Mezzo Identity Policy

## Regole

1. **`mezzi.id` (UUID)** è l'unica identità persistente del mezzo. Immutabile; usata in ogni FK e audit trail.
2. **Campi operativi** (`numero_scuderia`, `targa`, `matricola`, `telaio_num`, ecc.) sono attributi descrittivi, **non chiavi**. Possono duplicarsi tra mezzi diversi.
3. **Ogni funzione che modifica un mezzo** deve ricevere obbligatoriamente `mezzo_id`. Nessun update "per targa" o "per scuderia".
4. **Risoluzione tramite ident** consentita **solo** nei punti di ingresso:
   - import dati
   - OCR / document capture
   - scheda ingresso manuale
   - migrazioni legacy / riconciliazione esplicita
5. **Fuori dai punti di ingresso:** `mezzo_id` esplicito obbligatorio.
6. **Duplicati operativi:** warning informativo, mai blocco (eccetto VIN).
7. **Ambiguità:** mai first-match silenzioso. Usare sempre `MezzoResolutionResult` da `lib/domain/mezzo/mezzo-resolution.ts`.

## Unicità di dominio

| Campo | Unicità globale |
|-------|-----------------|
| `mezzi.id` | Sì (PK) |
| `telaio_num` / VIN normalizzato | Sì (indice parziale) |
| `targa`, `matricola`, `numero_scuderia` | **No** |

## Esempi validi / non validi

| Scenario | Valido? |
|----------|---------|
| Due mezzi con `numero_scuderia = 123`, clienti diversi | Sì |
| `updateMezzo({ targa: "AB123" }, patch)` senza id | **No** |
| Scheda ingresso: ident match → suggerimento link | Sì (punto ingresso) |
| Hub tagliandi: lookup per scuderia per aggiornare config | **No** — serve `mezzo_id` |
| `preferredMezzoId` invalido → fallback su matricola | **No** — errore esplicito |
| Import: score VIN+targa → suggerimento update | Sì (con review utente) |
| Import: auto-update solo su scuderia uguale | **No** |
| Lavorazione orfana: fuzzy attach automatico | **No** — proposta riconciliazione o orphan |

## Pattern vietati

```ts
// VIETATO — first-match senza gestione multipla
mezzi.find((m) => m.targa === targa);

// VIETATO — assume unicità non garantita
supabase.from("mezzi").eq("targa", value).single();
supabase.from("mezzi").eq("targa", value).maybeSingle();

// VIETATO — fallback silenzioso da preferred a ident
if (!preferredMezzoId) findByMatricola(...);
else if (!exists(preferredMezzoId)) findByMatricola(...);
```

## Pattern corretti

```ts
// Modifica mezzo — sempre per id
await updateMezzo(mezzoId, patch);

// Risoluzione in punto ingresso
const result = resolveMezzoByIdentFromCatalog(catalog, ident);
if (result.status === "ambiguous") showDisambiguationPicker(result.candidates);

// preferredMezzoId = SSOT quando presente e valido
const explicit = resolveExplicitMezzo(preferredMezzoId, catalog);
if (explicit.status === "error") throw new PreferredMezzoInvalidError(...);
```

## Riferimenti codice

- Contract: `lib/domain/mezzo/mezzo-resolution.ts`
- Scheda ingresso: `lib/domain/mezzo/resolve-mezzo-from-scheda.ts`
- Import scoring: `lib/data-import/entities/mezzi/mezzi-import-match-score.ts`
- Audit runtime: tabella `mezzo_resolution_events`
