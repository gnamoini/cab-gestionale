# Sistema notifiche gestionale CAB

Report completo — implementazione v2 role-based (2026-07-01).

**SSOT codice:** [`lib/notifications/notification-event-catalog.ts`](../lib/notifications/notification-event-catalog.ts)  
**RCA architettura push:** [`docs/investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md`](investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md)  
**ADR:** [`docs/adr/ADR-002-notification-ssot-architecture.md`](adr/ADR-002-notification-ssot-architecture.md)  
**Migration DB:** [`supabase/migrations/20260901150000_notification_events_v2.sql`](../supabase/migrations/20260901150000_notification_events_v2.sql)

---

## Mapping ruoli

| Profilo operativo | Ruoli canonici | Meccanismo visibilità |
|---|---|---|
| **ADMIN** | `admin`, `manager` | Bypass RLS — vede tutte le notifiche inbox |
| **PERSONALE UFFICIO** | `addetto_amministrativo` | Scope `global` o `addetto_amministrativo` + modulo read |
| **PERSONALE OFFICINA** | `operatore` | Scope `global` o `operatore` + modulo read |

Guest e cliente sono esclusi (`staff-inbox-eligible`).

---

# 1. Mappa completa delle notifiche del gestionale

| Evento | Modulo | Descrizione | Ruoli destinatari | Stato |
|---|---|---|---|---|
| Nuova lavorazione (remote) | Lavorazioni | Altra postazione crea intervento | ADMIN, UFFICIO, OFFICINA | **Implementata** |
| Lavorazione completata | Lavorazioni | Stato → completata (follow-up amministrativo) | ADMIN, UFFICIO | **Implementata** |
| Lavorazioni in ritardo (digest) | Lavorazioni | ≥1 lavorazione oltre 14 gg | ADMIN, UFFICIO, OFFICINA | **Implementata** |
| Preventivo approvato | Preventivi | Transizione stato → approvato | ADMIN, UFFICIO | **Implementata** |
| Ricambio sotto scorta | Magazzino | Crossing sotto scorta minima | ADMIN, OFFICINA | **Implementata** |
| Ricambio esaurito | Magazzino | Crossing scorta → 0 | ADMIN, OFFICINA | **Implementata** (stesso tipo, copy urgente) |
| Fatture scadute (digest) | Fatturazione | Fatture con residuo oltre scadenza | ADMIN, UFFICIO | **Implementata** |
| Promemoria calendario | Dashboard | Promemoria creato dall'utente | Tutto lo staff | **Implementata** (pre-esistente) |
| Presenze mancanti 17:00 | Dipendenti | Zero ore inserite oggi | ADMIN (`manager`) | **Implementata** (pre-esistente) |
| Test campanella | Sistema | Verifica desktop/inbox | Solo autore | **Implementata** (pre-esistente) |
| Lavorazione aggiornata | Lavorazioni | Modifica generica | — | Non implementata |
| Lavorazione eliminata | Lavorazioni | Soft delete | — | Non implementata |
| Lavorazione consegnata/archiviata | Lavorazioni | Archivio ufficiale | — | Non implementata |
| Preventivo creato | Preventivi | Nuovo documento | — | Non implementata |
| Preventivo inviato | Preventivi | Stato inviato | — | Non implementata |
| Preventivo rifiutato | Preventivi | Stato rifiutato | — | Non implementata |
| Preventivo convertito | Preventivi | Workflow downstream | — | Non implementata |
| DDT creato/aggiornato | DDT/Documenti | Documento generico | — | Non implementata |
| Fattura emessa | Fatturazione | Flusso normale | — | Non implementata |
| Fattura pagata | Fatturazione | Incasso completato | — | Non implementata |
| Fattura scaduta (singola) | Fatturazione | Per-documento | — | Non implementata (digest) |
| Movimento magazzino | Magazzino | Scarico/carico generico | — | Non implementata |
| Ricambio creato/eliminato | Magazzino | CRUD anagrafica | — | Non implementata |
| Scheda lavorazione aggiornata | Schede | Aggiornamento frequente | — | Non implementata |
| Mezzo creato/aggiornato | Mezzi | CRUD anagrafica | — | Non implementata |
| Attrezzatura creata/aggiornata | Attrezzature | Asset lifecycle | — | Non implementata |
| Cliente creato/aggiornato | Clienti | Anagrafica | — | Non implementata |
| Compliance asset in scadenza | Mezzi/Report | Revisioni programmate | — | Non implementata |
| Compliance asset scaduta | Mezzi/Report | Revisioni overdue | — | Non implementata |
| Ordine fornitore | Ordini fornitori | Modulo ordini | — | Non implementata |
| Errore di sistema | Osservabilità | Nessuna pipeline | — | Non implementata |
| Permessi utente modificati | Sicurezza | Invalidation only | — | Non implementata |
| Impostazioni aggiornate | Settings | Toast efemero | — | Non implementata (inbox) |
| Toast cab-sync generici | Sync | "…da altro dispositivo" | Admin (toast) | Non implementata (inbox) |
| Timesheet dipendenti | Dipendenti | Volume alto | — | Non implementata |
| Documento generico CRUD | Documenti | Listini, certificazioni | — | Non implementata |
| Lavorazione completata → officina | Lavorazioni | Rumore operativo | — | Non implementata (by design) |

---

# 2. Notifiche implementate

### Nuova lavorazione (`lavorazione_created`)

- **Perché:** l'officina deve prendere in carico; l'ufficio deve sapere che c'è nuovo lavoro amministrativo.
- **Problema risolto:** dimenticanze su interventi creati da collega/altro device.
- **Destinatari:** ADMIN, UFFICIO, OFFICINA (scope `global`).
- **Trigger:** cab-sync remoto `entity_created` su `lavorazioni` — bridge [`admin-lavorazioni-notification-bridge.tsx`](../src/components/admin-lavorazioni-notification-bridge.tsx).

### Lavorazione completata (`lavorazione_completata`)

- **Perché:** l'ufficio deve fatturare/chiudere amministrativamente; l'officina ha già l'informazione.
- **Problema risolto:** ritardo nel follow-up post-officina.
- **Destinatari:** ADMIN, UFFICIO (scope `addetto_amministrativo`).
- **Trigger:** cab-sync remoto `entity_updated` con transizione stato → `completata` (registry stato + cache).

### Lavorazioni in ritardo (`lavorazioni_ritardo_digest`)

- **Perché:** SLA operativo — interventi fermi troppo a lungo.
- **Problema risolto:** backlog invisibile; digest evita spam per-item.
- **Destinatari:** ADMIN, UFFICIO, OFFICINA (scope `global`).
- **Trigger:** digest giornaliero ~08:00 feriali — bridge [`admin-scheduled-digest-notification-bridge.tsx`](../src/components/admin-scheduled-digest-notification-bridge.tsx).

### Preventivo approvato (`preventivo_approvato`)

- **Perché:** sblocca fatturazione/DDT.
- **Problema risolto:** preventivo approvato sul portale/cliente senza allerta ufficio.
- **Destinatari:** ADMIN, UFFICIO (scope `addetto_amministrativo`).
- **Trigger:** cab-sync remoto `entity_updated` su `preventivi` — bridge [`admin-preventivi-notification-bridge.tsx`](../src/components/admin-preventivi-notification-bridge.tsx).

### Ricambio sotto scorta / esaurito (`magazzino_sotto_scorta`)

- **Perché:** blocca lavorazioni; richiede ordine/ricarico.
- **Problema risolto:** crossing sotto minimo + bug fix esaurimento 1→0 già sotto soglia.
- **Destinatari:** ADMIN, OFFICINA (scope `operatore`).
- **Trigger:** cab-sync remoto `entity_updated` su `magazzino_ricambi` con `shouldNotifyStockCrossing`.

### Fatture scadute (`fatture_scadute_digest`)

- **Perché:** crediti da recuperare; impatto cash-flow.
- **Problema risolto:** insoluti dimenticati; digest evita una notifica per fattura.
- **Destinatari:** ADMIN, UFFICIO (scope `addetto_amministrativo`).
- **Trigger:** digest giornaliero ~09:00 feriali, query `invoicesService.getList()`.

### Promemoria calendario (`dashboard_promemoria_reminder`) — pre-esistente

- **Perché:** opt-in utente; alta rilevanza personale.
- **Destinatari:** tutto lo staff.
- **Trigger:** timer + `dashboard_promemoria.notified_on`.

### Presenze dipendenti (`dipendenti_presenze_reminder`) — pre-esistente

- **Perché:** supervisione ADMIN; una volta al giorno.
- **Destinatari:** ADMIN (`manager`).
- **Trigger:** 17:00 feriali se zero presenze.

---

# 3. Notifiche escluse

| Evento | Motivo esclusione | Rumore / no valore | Caso futuro |
|---|---|---|---|
| Lavorazione aggiornata/eliminata | Informativo | Alta frequenza, nessuna azione specifica | Solo se introdotta assegnazione esplicita |
| Preventivo creato/inviato/rifiutato | Non richiede azione immediata | Spam amministrativo | Notifica su `convertito` se workflow DDT automatico |
| DDT creato | Conseguenza di preventivo/fattura | Duplicazione | Modulo DDT autonomo con approvazioni |
| Fattura emessa/pagata | Flusso normale | Rumore quotidiano | — |
| Per-fattura scaduta | Spam | N fatture = N notifiche | Digest copre il caso |
| Per-lavorazione in ritardo | Spam | Decine di alert/giorno | Digest copre il caso |
| Scheda lavorazione | Ogni modifica tecnica | Altissima frequenza | Solo su blocchi critici (es. firma cliente) |
| Mezzi/clienti CRUD | Routine anagrafica | Basso valore operativo | — |
| Movimenti magazzino generici | Coperto da crossing | Duplicazione | — |
| Asset compliance | Modulo non production-ready | Tipi TS riservati | Con `asset-lifecycle-v1` flag ON |
| Errori sistema | Nessuna pipeline | Falsi positivi | Integrazione Sentry → notifica admin |
| Toast cab-sync → inbox | Duplicazione | Stesso evento due volte | — |
| Completata → officina | Chi l'ha fatta lo sa | Auto-notifica inutile | — |
| Lavorazione consegnata | Evento amministrativo raro | Bassa urgenza vs completata | Se workflow consegna separato |

---

# 4. Analisi finale

### Punti di forza

- **Architettura event-driven** riusa infrastruttura v2 (registry DB, dedup, RLS, realtime inbox).
- **Catalogo SSOT** (`notification-event-catalog.ts`) estendibile senza hardcode nei componenti UI.
- **Digest giornalieri** per ritardo e fatture — pochi alert, alto segnale.
- **Scope per ruolo** nel registry DB — niente spam cross-ruolo.
- **Transizioni conservative** — skip se manca stato precedente (no false positive).

### Miglioramenti futuri

1. **Cron server-side** (Supabase pg_cron / Edge Function) per digest indipendenti da tab aperto.
2. **Asset compliance** quando `asset-lifecycle-v1` è production-ready.
3. **Push mobile/PWA** oltre desktop notification API.
4. **Preferenze utente** opt-out per tipo (senza toccare RBAC base).
5. **Parametro `priority` override** in RPC per magazzino esaurito → `urgent` a livello DB.

### Notifiche da aggiungere solo con nuovi moduli/ruoli

- **Ordini fornitori:** ordine confermato/in ritardo → UFFICIO + OFFICINA.
- **Ruolo magazziniere dedicato:** scope separato da operatore.
- **Portale cliente:** notifiche su preventivo pronto (canale separato, non inbox staff).
- **Supervisor cantiere:** ruolo intermedio con subset notifiche lavorazioni.

---

## Architettura (riepilogo)

```
Eventi cab-sync / timer
    → Bridge (mapper per dominio)
    → publishNotification
    → cab_create_notification (registry strict)
    → Inbox v2 + desktop opzionale
```

**Bridge attivi:** lavorazioni, magazzino, presenze — **solo toast UX** (inbox via `notification_outbox` server-side).

**Test:** `notification-dedup-keys.test.ts`, `notification-event-catalog.test.ts`, `notification-transition-mappers.test.ts`, `ricambio-stock-crossing.test.ts`, `notifications-policy.test.ts`, `notification-pipeline-policy.test.ts`, `verify-notifications-rbac.ts`.

---

## Publisher audit (2026-11 — ripristino SSOT)

| Evento | Publisher precedente | Publisher attuale | Idempotency key |
|--------|---------------------|-------------------|-----------------|
| `lavorazioni.created` | bridge cab-sync admin | DB trigger → `notification_outbox` → worker | `lavorazioni.created:lavorazioni:{id}` |
| `lavorazioni.completed` | bridge cab-sync admin | DB trigger → outbox → worker | `lavorazioni.completed:lavorazioni:{id}` |
| `magazzino.below_minimum` | bridge cab-sync admin | DB trigger quantita → outbox → worker | `magazzino.below_minimum:magazzino_ricambi:{id}:{prev}->{curr}` |
| `dipendenti.presence_reminder` | bridge scheduled client | cron `/api/cron/dipendenti-presenze-reminder` | `dipendenti.presence_reminder:dipendenti_presenze:{date}` |
| `lavorazioni.tagliando_due` | client + server | `POST /api/notifications/tagliando-due` (server) | entity-based |
| `mezzi.tagliando_forecast_7g` | cron | cron (invariato) | — |
| `client_portal_*` | DB trigger | DB trigger (invariato) | — |
| `system.dashboard_test` | UI bell | UI bell (`publishNotification`) | — |

**Pipeline outbox:** `INSERT entità` → trigger leggero → `notification_outbox` → `/api/cron/notification-outbox-processor` → `fanoutEntityNotification` → `dispatchNotificationEvent` → `notifications` → `delivery_queue` → push worker.

**Tracciabilità:** `trace_id` su `notification_outbox`, `notification_delivery`, payload push, log strutturati `[notification-trace]`.

---

## Preferenze utente (SSOT eventi, 2026-07)

- **Registry:** `notificationEventId` in [`notification-event-catalog.ts`](../lib/notifications/notification-event-catalog.ts) — distinto da `domainEvent`.
- **DB:** `notification_event_preferences (user_id, company_id, notification_event_id, enabled)` — lazy write; assenza riga = `defaultEnabled` dal registry.
- **Lifecycle:** le preferenze influenzano solo notifiche future; lo storico inbox non viene modificato.
- **Dispatch:** `POST /api/notifications/dispatch` → `dispatchNotificationEvent` (RBAC batch + preferenze + fanout `scope_type=user` atomico via `cab_dispatch_notifications_bulk`).
- **UI:** modal "Impostazioni notifiche" nel drawer campanella — view-model filtrato server-side (`GET /api/notifications/preferences`).
