---
name: SSOT PDF Preventivi
overview: "Sostituire upload manuali con PDF generati SSOT. Dominio preventivo → pdf_artifacts versionati → resolver superficie → delivery RBAC. Stati BOZZA/INVIATO/CONFERMATO/ANNULLATO, immutabilità post-invio, advisory lock, token accesso cliente."
todos:
  - id: db-migration-stato
    content: "Migration: pdf_artifacts (status, is_current), preventivi (stato, confermato_by), document_access_tokens, funzioni SECURITY DEFINER, orphan health check, cleanup legacy"
    status: pending
  - id: pdf-artifacts-layer
    content: "Service pdf_artifacts: versioned artifact con is_current, stati GENERATING/READY/FAILED/DELETED; integrazione pipeline esistente"
    status: pending
  - id: status-service-audit
    content: "transition_preventivo_status: advisory lock, generate→upload temp→RPC commit, NO regen su confermato, PreventivoStatusChanged event"
    status: pending
  - id: preventivi-status-pill
    content: Colonna Stato con pill cliccabile in preventivi-view (pattern ordini fornitori)
    status: pending
  - id: pdf-preview-page
    content: "OfficialDocumentViewer (iframe desktop / PDF.js mobile); route staff by UUID; route cliente by public token"
    status: pending
  - id: official-documents-resolver
    content: "resolveStaffDocuments() / resolveClientDocuments() separati; token generation per portale"
    status: pending
  - id: remove-legacy-upload
    content: Rimuovere LavorazioneDocumentsManager, upload policy lavorazione, servizi e riferimenti sync/PWA
    status: pending
  - id: ddt-ui-simplify
    content: Rimuovere pill/badge stato DDT da UI; visibilità via is_ddt_visible_to_client()
    status: pending
  - id: rbac-regression-tests
    content: Test lock concorrenza, immutabilità confermato, artifact status, token access, e2e completo
    status: pending
isProject: false
---

# SSOT Preventivi/DDT — PDF ufficiali generati (v3 — ready for dev)

## Architettura target

```
                PREVENTIVO
                    |
          stato lifecycle SSOT
                    |
        +-----------+-----------+
        |                       |
 PDF_ARTIFACTS              AUDIT EVENTS
 (versioned, is_current)         |
        |                  PreventivoStatusChanged
 current version (READY)
        |
 +------+------+------+
 |             |      |
Lavorazioni  Mezzi  Portale
 (UUID)      (UUID)  (public_token)
                 |
             RLS SQL
          SECURITY DEFINER
                 |
              Cliente
```

## Prerequisiti obbligatori (gate sviluppo)

| # | Requisito | Implementazione |
|---|-----------|-----------------|
| 1 | Lock concorrenza transizioni | `pg_advisory_xact_lock(hashtext(preventivo_id))` in RPC commit |
| 2 | Immutabilità post-invio | `INVIATO` crea PDF v1; `CONFERMATO` **non** rigenera |
| 3 | Stato artifact diagnostico | `pdf_artifacts.status`: GENERATING / READY / FAILED / DELETED |
| 4 | Funzioni SQL cliente sicure | `SECURITY DEFINER STABLE SET search_path = public` |
| 5 | Token accesso cliente | `document_access_tokens` — no UUID preventivo in URL portale |

---

## Situazione attuale

Tre percorsi paralleli: `preventivi` (artifact cache), `ddt_documents`, `lavorazione_documents` (upload manuale). Portale espone solo upload senza filtro stato. PDF aperti in nuova scheda via blob popup.

---

## Fase 1 — Schema DB

### Tabella `pdf_artifacts`

Polimorfismo `entity_type` + `entity_id` **mantenuto** (pragmatico, allineato a SSOT/RLS esistente). Integrità referenziale delegata ai service + health check orfani.

```sql
CREATE TABLE public.pdf_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL CHECK (entity_type IN ('preventivo','ddt','fattura')),
  entity_id       uuid NOT NULL,
  storage_path    text NOT NULL,
  hash            text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'generating'
                  CHECK (status IN ('generating','ready','failed','deleted')),
  is_current      boolean NOT NULL DEFAULT false,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  generated_by    uuid REFERENCES auth.users(id),
  UNIQUE (entity_type, entity_id, version)
);

-- Una sola versione corrente per entità
CREATE UNIQUE INDEX uq_pdf_artifacts_current
  ON public.pdf_artifacts (entity_type, entity_id)
  WHERE is_current = true;

CREATE INDEX idx_pdf_artifacts_entity ON public.pdf_artifacts (entity_type, entity_id);
```

**Alternativa documentata (non adottata):** junction tables `preventivo_pdf_artifacts` / `ddt_pdf_artifacts` per FK forte — valutare solo se health check orfani risulta insufficiente.

**Health check orfani** (control plane / cron):

```sql
-- preventivi orfani
SELECT pa.* FROM pdf_artifacts pa
WHERE pa.entity_type = 'preventivo'
  AND NOT EXISTS (SELECT 1 FROM preventivi p WHERE p.id = pa.entity_id);

-- ddt orfani
SELECT pa.* FROM pdf_artifacts pa
WHERE pa.entity_type = 'ddt'
  AND NOT EXISTS (SELECT 1 FROM ddt_documents d WHERE d.id = pa.entity_id);
```

### Colonne su `preventivi`

| Colonna | Tipo | Note |
|---------|------|------|
| `stato` | text + CHECK | `bozza`, `inviato`, `confermato`, `annullato` |
| `current_pdf_artifact_id` | uuid FK → `pdf_artifacts` | puntatore versione corrente |
| `inviato_at` | timestamptz | |
| `confermato_at` | timestamptz | |
| `confermato_by` | uuid FK → `auth.users` | chi ha accettato (cliente o staff) |
| `annullato_at` | timestamptz | |

**DDT:** `current_pdf_artifact_id`; deprecare `pdf_artifact_hash`.

### Tabella `document_access_tokens` (portale cliente)

```sql
CREATE TABLE public.document_access_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           text NOT NULL UNIQUE,  -- URL-safe, es. nanoid 21
  entity_type     text NOT NULL CHECK (entity_type IN ('preventivo','ddt')),
  entity_id       uuid NOT NULL,
  lavorazione_id  uuid NOT NULL REFERENCES lavorazioni(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,           -- nullable = no scadenza
  revoked_at      timestamptz,
  created_by      uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_doc_tokens_entity ON document_access_tokens (entity_type, entity_id);
CREATE UNIQUE INDEX uq_doc_tokens_active
  ON document_access_tokens (entity_type, entity_id)
  WHERE revoked_at IS NULL;
```

Cliente apre `/documenti/[token]` — backend risolve token → entity → visibility check → stream PDF. Vantaggi: revoca, audit apertura, URL non espone UUID interni.

Staff continua a usare `/documenti/preventivo/[id]/preview` (UUID diretto + RBAC staff).

### Funzioni SQL visibilità (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.is_preventivo_visible_to_client(p_preventivo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM preventivi p
    WHERE p.id = p_preventivo_id
      AND p.stato IN ('inviato', 'confermato')
      AND public.rbac_scope_cliente_matches_mezzo(p.mezzo_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ddt_visible_to_client(p_ddt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ddt_documents d
    WHERE d.id = p_ddt_id
      AND d.status <> 'annullato'
      AND d.preventivo_id IS NOT NULL
      AND public.is_preventivo_visible_to_client(d.preventivo_id)
  );
$$;
```

`SECURITY DEFINER` + `search_path` esplicito evita RLS ricorsiva. Usate da: RLS policies, resolver client, preview auth, token resolution.

### Backfill stato

- `approvato`, `convertito` → `confermato`
- `rifiutato` → `annullato`

### Rimozione upload legacy

`DELETE FROM lavorazione_documents` + storage cleanup + revoke insert.

---

## Fase 2 — Macchina stati + generazione PDF

### Transizioni

```ts
export const PREVENTIVO_TRANSITIONS = {
  bozza:      ["inviato", "annullato"],
  inviato:    ["confermato", "annullato"],
  confermato: ["annullato"],
  annullato:  [],
} as const;
```

Nessuna retrocessione. Solo `transition_preventivo_status()` — mai update diretto.

### Visibilità cliente (TS mirror)

```ts
export function isPreventivoVisibleToClient(stato: PreventivoStato): boolean {
  return stato === "inviato" || stato === "confermato";
}
```

### Immutabilità documentale

| Transizione | Azione PDF |
|-------------|------------|
| `bozza → inviato` | **Genera PDF v1**, `is_current=true`, `status=ready` |
| `inviato → confermato` | **NON rigenera**. Registra solo `confermato_at`, `confermato_by` |
| `* → annullato` | Artifact corrente → `status=deleted` (soft); revoca token |

**Modifica post-invio:** flusso `annulla → nuova revisione preventivo → nuovo invio`. Il documento accettato dal cliente resta immutabile (valore probatorio).

### Flusso generazione PDF (jsPDF in Node)

PostgreSQL **non** può eseguire jsPDF. Flusso a due fasi con advisory lock:

```
1. RPC acquire_lock(preventivo_id)
       pg_advisory_xact_lock(hashtext(preventivo_id))
       verifica stato attuale + canTransition(from, to)

2. [Node] generatePdfBytes(preventivo)

3. [Node] upload storage path temporaneo
       pdf_artifacts.status = 'generating'

4. RPC commit_transition(preventivo_id, to, artifact_meta):
       INSERT pdf_artifacts (version=max+1, is_current=true, status='ready')
       UPDATE precedente is_current=false
       UPDATE preventivi SET stato=to, current_pdf_artifact_id=..., *_at=now()
       INSERT audit + emit PreventivoStatusChanged
       COMMIT  -- rilascia advisory lock

5. on failure anywhere:
       stato invariato
       artifact orfano in storage → garbage collect
       se record esiste: status='failed'
```

**Concorrenza:** due utenti su `bozza → inviato` simultaneo — il secondo attende il lock, poi vede `stato != bozza` e fallisce con errore esplicito.

**`confermato`:** RPC leggera — solo update stato + `confermato_at/by`, nessuna chiamata jsPDF.

### Stati artifact diagnostici

| `pdf_artifacts.status` | Significato |
|------------------------|-------------|
| `generating` | Upload in corso, commit non ancora avvenuto |
| `ready` | PDF valido, referenziato come corrente o storico |
| `failed` | Generazione/upload fallito |
| `deleted` | Soft-delete su annullamento |

Caso diagnosticabile: `preventivo.stato = inviato` + `pdf_artifacts.status = failed` → alert operatore.

### Evento dominio

```ts
type PreventivoStatusChangedPayload = {
  preventivo_id: string;
  from: PreventivoStato;
  to: PreventivoStato;
  user_id: string;
  timestamp: string;
  pdf_artifact_id?: string;  // solo su transizioni che creano artifact (→ inviato)
  confermato_by?: string;    // solo su → confermato
};
```

Estendere [`DOMAIN_EVENT_TYPES`](lib/notifications/domain/domain-event.ts) con `"preventivo.status_changed"`.

---

## Fase 3 — Pill stato tabella Preventivi

Pattern [`ordine-fornitore-status-cell.tsx`](components/ordini-fornitori/ordine-fornitore-status-cell.tsx). Pill editabile solo per transizioni in `PREVENTIVO_TRANSITIONS[current]`. `annullato` = terminale read-only.

---

## Fase 4 — Preview inline PDF

### Route

| Route | Audience | Identificatore |
|-------|----------|----------------|
| `/documenti/preventivo/[id]/preview` | Staff | UUID preventivo |
| `/documenti/ddt/[id]/preview` | Staff | UUID DDT |
| `/documenti/[token]` | Cliente | `document_access_tokens.token` |

### `OfficialDocumentViewer`

- **Desktop:** iframe native PDF → `/api/pdf/artifacts/.../preview-frame`
- **Mobile (Safari/iOS):** PDF.js viewer (iframe PDF spesso bloccato)

Shell: `components/documenti/official-document-preview-page.tsx` — titolo, metadati, versione, no download obbligatorio.

### Token resolution (cliente)

```
GET /documenti/[token]
  → lookup document_access_tokens WHERE token=? AND revoked_at IS NULL
  → is_preventivo_visible_to_client(entity_id) OR is_ddt_visible_to_client
  → stream pdf_artifacts WHERE is_current=true AND status='ready'
  → audit: document.token_accessed
```

Token generato su transizione `→ inviato` (e rigenerato se revocato/ri-emesso). Revocato su `→ annullato`.

---

## Fase 5 — Resolver documenti (staff / client separati)

```
lib/official-documents/
├── staff/resolve-staff-documents.ts
├── client/resolve-client-documents.ts
├── preventivo-client-visibility.ts
├── document-access-token.ts
└── types.ts
```

**Staff:** tutti gli stati, UUID diretto, include storico versioni artifact.
**Client:** query via `is_preventivo_visible_to_client()` / `is_ddt_visible_to_client()` in SQL; risposta include `public_token` per preview, mai UUID entity.

---

## Fase 6 — DDT

- Nessuna pill stato UI
- `status` DB solo per `annullato` vs attivo (rigenerazione 1:1)
- Visibilità cliente: `is_ddt_visible_to_client()` only
- PDF generato alla creazione DDT; `current_pdf_artifact_id` su `ddt_documents`

---

## Fase 7 — Permessi, sicurezza, test

| Superficie | Regola |
|------------|--------|
| Staff preview | `preventivi:read` + UUID |
| Cliente preview | token valido + visibility function + artifact `ready` |
| Transizione | advisory lock + RPC commit |
| Orfani | health check in control plane |

**Test obbligatori:**
- Concorrenza: due publish simultanei → uno solo succeeds
- `confermato` non crea nuova versione artifact
- `inviato` con PDF fail → resta `bozza`, artifact `failed` o assente
- Token revocato → 404
- `annullato` → sparisce portale, token revocato
- Funzioni SQL: `SECURITY DEFINER` non bypassa scope cliente

---

## Ordine implementazione

1. Migration DB completa (artifacts, tokens, funzioni, colonne preventivi)
2. Service layer: artifact lifecycle + RPC lock/commit + immutabilità confermato
3. `PREVENTIVO_TRANSITIONS` + evento dominio + audit
4. Pill colonna preventivi
5. `OfficialDocumentViewer` + route staff + route token cliente
6. Resolver staff/client + UI consumer (lavorazioni, mezzi, portale)
7. Rimozione upload legacy + DDT UI simplify
8. Health check orfani + test regressione + e2e

## Rischi residui

- **Polimorfismo entity_id** — mitigato da health check; junction tables come upgrade path
- **Garbage collect** — artifact `generating`/`failed` orfani in storage; job cleanup periodico
- **Token senza scadenza** — default no expiry; configurabile per compliance futura
- **PWA offline** — aggiornare scope sync (rimuovere `lavorazione_documents`)

## Fuori scope

- Archivio `documenti` (listini/manuali)
- Magazzino DDT receiving
- Pipeline fatturazione (`preventivi_billing_status`)
