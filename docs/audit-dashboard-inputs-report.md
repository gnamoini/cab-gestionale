# Audit campi input — Dashboard

**Data:** 2026-06-03  
**Perimetro:** `/dashboard`, `/dashboard/security` (escluso `/impostazioni`, production-readiness senza campi)  
**Tipo:** UX / layout / responsive / accessibilità / ancoraggio dropdown — **nessuna modifica business/API**

---

## 1. Elenco campi analizzati

### `/dashboard` — Promemoria

| Campo | Tipo | File | Stato | Note audit |
|-------|------|------|-------|------------|
| Mese | Custom listbox + portal | `dashboard-promemoria-calendar.tsx` | enabled | Portal Floating UI, `matchAnchorWidth` |
| Anno | Custom listbox + portal | idem | enabled | idem |
| Giorno calendario | `button` | idem | enabled | `aria-pressed`, touch 44px |
| Data | `GlobalDatePickerYmd` | `dashboard-promemoria-form-modal.tsx` | enabled | Coerente ERP |
| Orario | `input type="time"` | idem | optional | Picker OS in modal |
| Titolo | `input text` | idem | required | maxLength 200 |
| Descrizione | `textarea` | idem | optional | maxLength 2000 |

### `/dashboard` — Note (`DashboardTasksPanel`)

| Campo | Tipo | File | Stato | Note audit |
|-------|------|------|-------|------------|
| Nuova nota | `input text` | `dashboard-tasks-panel.tsx` | enabled | maxLength allineato a storage (500) |
| Completata | `checkbox` | idem | enabled | aria-label OK |
| Rinomina | `input text` | idem | edit | maxLength 500, keyboard handlers |

### `/dashboard/security` — Utenti

| Campo | Tipo | File | Stato | Note audit |
|-------|------|------|-------|------------|
| Cerca utente | `input text` | `security-users-table.tsx` | enabled | placeholder + sr-only label |
| Filtra ruolo | `GlobalSelect` selectOnly | idem | enabled | **fix:** da `select` nativo |
| Ruolo riga | `GlobalSelect` selectOnly | idem | enabled/disabled | **fix:** da `select` nativo |
| Portale clienti | `SecurityToggle` | idem | switch | touch OK |
| Crea utente (5 campi + ruolo) | input + `GlobalSelect` | `security-create-user-modal.tsx` | modal | **fix:** ruolo da select nativo |
| Modifica nome | `input text` | `security-edit-name-modal.tsx` | modal | label visibile |

### `/dashboard/security` — Filtri log

| Campo | Tipo | File | Stato | Note audit |
|-------|------|------|-------|------------|
| Da data / A data | `GlobalDatePickerYmd` | `security-dashboard-view.tsx` | enabled | **fix:** da `input type="date"` |
| Utente | `GlobalSelect` selectOnly | idem | enabled | **fix:** da `select` nativo |
| Pilot checkbox | `checkbox` | idem | enabled | inline label |

---

## 2. Problemi trovati (pre-fix)

| ID | Severità | Area | Problema |
|----|----------|------|----------|
| D-001 | **Alto** | Security filtri | `input type="date"` nativo: picker OS scollegato su mobile, incoerente con promemoria |
| D-002 | **Alto** | Security select | `select` nativi (ruolo, utente): nessun portal, UX mobile fragile |
| D-003 | **Medio** | Promemoria modal | Titolo senza `id`/`htmlFor`; solo label wrapper |
| D-004 | **Medio** | Note | Testo nota con `truncate` — testi lunghi illeggibili su mobile |
| D-005 | **Medio** | Tasks draft | `maxLength={240}` ma storage accetta fino a 500 caratteri |
| D-006 | **Basso** | Security create user | Testo help password dice «6 caratteri» ma `minLength={8}` |
| D-007 | **Basso** | Incoerenza | Due famiglie input: nativi security vs portal ERP |

---

## 3. Incoerenze e duplicazioni

- **Date:** promemoria usa `GlobalDatePickerYmd`; security usava `type="date"` (risolto).
- **Select:** ERP usa `GlobalSelect` / portal; security usava `<select className={gestionaleSelectNativePlainClass}>` (risolto su dashboard security).
- **Terminologia:** «Note» / «Cose da fare» / promemoria — coerente per contesto, non unificato globalmente (accettabile).

---

## 4. Problemi mobile / tastiera / dropdown

| ID | Severità | Verifica | Esito atteso post-fix |
|----|----------|----------|----------------------|
| D-001 | Alto | Filtri data security su viewport 390px | Datepicker portal ancorato, non fullscreen OS |
| D-002 | Alto | Select ruolo con tastiera | Menu portal sotto campo, `flip`/`shift` |
| D-008 | Medio | Promemoria mese/anno | Già portal; mantenere `matchAnchorWidth` |
| D-009 | Medio | Modal promemoria + `type="time"` | `GestionaleModalScrollBody` + keyboard inset globali |
| D-010 | Medio | Note inline edit | Focus + blur commit; input full width |

---

## 5. Correzioni applicate

| ID | File | Intervento |
|----|------|------------|
| D-001, D-002, D-007 | `security-dashboard-view.tsx` | `GlobalDatePickerYmd` per Da/A data; `GlobalSelect` selectOnly per utente |
| D-002 | `security-users-table.tsx` | `GlobalSelect` per filtro ruolo e ruolo riga |
| D-002 | `security-create-user-modal.tsx` | `GlobalSelect` selectOnly per ruolo profilo |
| D-003 | `dashboard-promemoria-form-modal.tsx` | `id`/`htmlFor` su Data, Orario, Titolo, Descrizione |
| D-004 | `dashboard-tasks-panel.tsx` | `break-words` al posto di `truncate` sul testo nota |
| D-005 | `dashboard-tasks-panel.tsx` | `maxLength={500}` allineato a `createDashboardTask` |
| D-006 | `security-create-user-modal.tsx` | Help password allineato a min 8 caratteri |

---

## 6. Verifica finale

- [x] Inventario completo perimetro dashboard tree
- [x] Security: nessun `input type="date"` nei filtri log
- [x] Security: select nativi sostituiti con `GlobalSelect` selectOnly dove previsto
- [x] Promemoria: label associate (`htmlFor`)
- [x] Note: testo leggibile multilinea; cap input coerente
- [ ] QA manuale device (iPhone/Android) — raccomandato post-deploy
- [x] Regressione statica: `lib/regression/dashboard-inputs-audit.test.ts` (OK)
- [ ] E2E Playwright `e2e/smoke/03-dashboard-report.spec.ts` — richiede `npx playwright install` in ambiente locale

---

## 7. Classificazione residui (non modificati)

| ID | Severità | Nota |
|----|----------|------|
| D-009 | Medio | `input type="time"` in modal: limitazione picker OS; mitigato da scroll modal |
| — | Basso | `AdminNotificationsBell`: pannello portal, non campo form — fuori scope inventario campi |

---

*Report generato nell’ambito del piano «Audit campi Dashboard». Validazione input server-side: `docs/audit-input-security.md` (INP-012 promemoria).*
