# Sistema importazione dati

Infrastruttura riutilizzabile per import batch da Excel/CSV.

**Audit globale entità, architettura plug-in e roadmap:** [data-import-erp.md](./data-import-erp.md)

## Architettura

```
lib/data-import/core/          Parser, mapping, batch store, registry router
lib/data-import/entities/      Plugin per entità
lib/data-import/registry.ts    Registry server-side
app/api/import/[entity]/      Route API generiche (+ alias legacy)
components/data-import/        Wizard UI condiviso
```

## Entità attive (Fase E)

| Entità | Route slug | Permesso | UI |
|--------|------------|----------|-----|
| `magazzino_ricambi` | `magazzino` | write magazzino | Magazzino toolbar |
| `listino_ricambi` | `listino` | write magazzino | Magazzino toolbar |
| `clienti_anagrafica` | `clienti` | manageSettings | Impostazioni Clienti |
| `mezzi` | `mezzi` | write mezzi | Mezzi toolbar |
| `preventivi` | `preventivi` | write preventivi | Preventivi toolbar |
| Settings liste / gerarchie | `settings-*` | manageSettings | Impostazioni sezioni |

Entità **stub** (lavorazioni, fatture, …) sono registrate ma non esposte in UI.

## Flusso wizard

1. **File** — upload .xlsx/.xls/.csv (max 10 MB), download template dinamico
2. **Analisi** — fogli, righe, colonne
3. **Mapping** — auto-detect + modifica; salva preset mapping
4. **Validazione** — preview valid/warning/error, duplicati, strategia
5. **Esecuzione** — batch chunked, progress
6. **Report** — statistiche + export CSV errori

## API

```
POST /api/import/{slug}/parse|preview|execute
GET  /api/import/{slug}/template
GET  /api/export/{slug}?format=csv   (solo entità con exportEnabled)
```

Alias retrocompat: `/api/import/magazzino/*`, `/api/import/clienti/*`

## Audit batch

Ogni import crea un record in `import_batches` con `file_sha256`.

Storico: `GET /api/import/batches?entity=magazzino_ricambi`

## Listino legacy (Documenti)

Import PDF da catalogo documenti: `lib/magazzino/listino-import/` (flusso separato).

Import tabellare listino: plug-in `listino_ricambi` nel wizard generico.
