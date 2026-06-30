# DDT in Preventivi

Il Documento di Trasporto (DDT) è integrato nel modulo **Preventivi**. Non esiste una route dedicata `/ddt` (redirect legacy → `/preventivi`).

## Permessi

| Elemento | Valore |
|----------|--------|
| UI | Pulsante riga / pannello editor in `/preventivi` |
| Capability UI | `preventivi.canWrite` (genera / rigenera) · `preventivi.canRead` (apri esistente) |
| Modulo backend RLS/RPC | `ddt` (grant mirror da `preventivi` in migration `20260721120000`) |
| Entità audit | `ddt_documents` |
| Artifact PDF | `ddt` (`/api/pdf/artifacts/ddt?id=`) |

### Capability v1

| Azione | Permesso UI | Permesso DB |
|--------|-------------|-------------|
| Visualizza / PDF | `preventivi` read | `ddt` read (mirror) |
| Genera / rigenera / segna consegnato | `preventivi` write | `ddt` write (mirror) |
| Annulla definitivo | admin globale | `ddt` admin |

## Regola 1:1

Un solo DDT **attivo** per preventivo. In rigenerazione il precedente viene **annullato** e sostituito (`replace_ddt_for_preventivo`).

Indice: `uq_ddt_documents_active_preventivo` su `preventivo_id` where `status <> 'annullato'`.

## Database

Migrations:

- `20260720120000_ddt_module.sql` — tabelle, RPC base, RLS
- `20260720120100_user_permissions_ddt.sql` — modulo `ddt`
- `20260721120000_ddt_one_per_preventivo.sql` — unique index, replace RPC, grant mirror

RPC principali: `create_ddt_with_rows`, `replace_ddt_for_preventivo`, `confirm_ddt`, `cancel_ddt`, `mark_ddt_stampato`, `mark_ddt_consegnato`.

## Flusso UX

### Lista preventivi

1. Nessun DDT attivo → pulsante **Genera DDT** (auto: tutte le righe strutturate, causale “Consegna merci”, data odierna)
2. DDT esistente → pulsante **DDT** + badge stato → drawer dettaglio
3. Nel drawer: stampa PDF, segna consegnato, **Rigenera DDT** (conferma)

### Editor preventivo

Pannello **DdtPreventivoPanel**: stato assente/presente, apri drawer, stampa PDF, rigenera.

### Lavorazioni

`LavorazioneDdtPanel` — collegamento read-only lavorazione → DDT collegati (nessuna creazione da lavorazione).

## PDF

Generato via artifact `ddt`; layout con `drawGestionaleDataSectionTable` (codice, descrizione, qty, U.M.) **senza prezzi**.

RBAC PDF: `preventivi` read **oppure** `ddt` read.

## Domain

- `buildDdtDraftFromPreventivoAuto` — draft automatico full-line
- `ddtService.createOrReplaceForPreventivo` — RPC replace
- `usePreventivoDdtIndex` — indice leggero per lista preventivi
