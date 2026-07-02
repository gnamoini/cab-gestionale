# Security production-ready — report implementazione

Data: 2026-07-02 · Piano v2.2

## Conferma orchestrator

La pagina `/sicurezza` non contiene più logica di sicurezza propria nel browser: tutte le operazioni privilegiate e le letture admin passano da **server actions** con `assertAdminCaller` / `verifyServerPermission("manageSecurity")` e client Supabase service solo lato server.

---

## Matrice RBAC (prima → dopo)

| Area | Prima | Dopo |
|------|-------|------|
| Gate pagina | `canManageSecurity` UI | Invariato + route RBAC esistente |
| Admin actions | `assertAdminCaller` generico | `verifyServerPermission("manageSecurity")` SSOT |
| Ruoli validazione | Mix `APP_ROLES` / legacy | `CANONICAL_ROLES` (= `APP_ROLES` alias) |
| Portale clienti mutabile | Toggle `clientLavorazioniAccess` in batch | **Rimosso** — solo derivato da ruolo |
| Guest audit | Incerto in test | `guest` può leggere audit (test allineato v3.1) |
| Operatore settings | — | Nessun accesso settings (test allineato) |

---

## Migrazioni tecniche

### Nuovi file

| File | Ruolo |
|------|--------|
| `lib/auth/user-ban-state.ts` | SSOT `isUserBanned()`, `accountEnabledFromAuthUser()` |
| `lib/auth/revoke-user-sessions.server.ts` | Revoke sessioni admin (skip typed se JWT assente) |
| `lib/auth/password-reset.ts` | Pure reset email + redirect URL |
| `lib/auth/request-password-reset.client.ts` | Wrapper browser login/profilo |
| `lib/security/security-audit-log.ts` | Audit minimo senza PII |
| `src/actions/security-read.ts` | Activity, audit recente, auth logs, access log pagina |
| `components/dashboard/security/security-monitoring-section.tsx` | Tab monitoraggio |
| `components/dashboard/security/security-release-section.tsx` | Tab release/pilot |

### File rimossi (zero-caller verificato)

- `lib/auth/request-password-reset.ts` → sostituito da `.client.ts` + `password-reset.ts`
- `components/dashboard/security/security-toggle.tsx`
- `components/dashboard/client-lavorazioni-access-panel.tsx`
- Stub `listClientLavorazioniAccessByAdminAction` / `setClientLavorazioniAccessByAdminAction`

### Boundary client/server

- **Niente** `getBrowserSupabase` nei componenti security (grep + `security-page-architecture-policy.test.ts`)
- Ban enforcement in `resolve-server-auth.ts`: utente bannato → `signOut` + snapshot vuoto
- Batch update rifiuta target bannati (`isUserBanned` in `security-users-permissions.ts`)

### Server actions aggiunte/rafforzate

- `sendPasswordResetByAdminAction` — messaggio sempre generico (anti-enumeration)
- `setUserAccountEnabledByAdminAction` — `ban_duration` Auth SSOT
- `listRecentSecurityAuditAction`, `listAuthLogsAdminAction`, `logSecurityPageAccessAction`

---

## Non implementato / motivazione

| Voce | Motivo |
|------|--------|
| RPC batch atomico (Option A) | Option B scelta: fail-fast + draft preservato su errore (`ponytail:` in panel) |
| Revoke sessioni immediate senza JWT target | API Supabase ^2.49 richiede JWT; ban è meccanismo primario |
| Middleware edge dedicato ban | Coperto da `resolve-server-auth` + policy test 3b |
| `NEXT_PUBLIC_SITE_URL` in repo | Aggiunto a `.env.production.example`; valore reale solo deploy |

---

## Ban middleware — risultati test policy

| Check | Esito |
|-------|-------|
| 3a SSOT `user-ban-state` | OK — `security-ban-middleware-policy.test.ts` |
| 3b Snapshot server sign-out se banned | OK — `resolve-server-auth.ts` |
| 3c Batch block su target banned | OK — `security-users-permissions.ts` |

---

## UX completata

- Drawer: reset password, disattiva/riattiva account
- Tabella: colonna/filtro stato account (`accountEnabled`)
- Create user modal → `GestionaleModalShell`
- Lazy fetch auth logs: tab monitoring only (`enabled: activeTab === "monitoring"`)

---

## Verifica

Eseguire localmente:

```bash
npm run ci:tsc
npm run lint
npm run build
npm run test:regression
```

Test regression aggiunti: `security-page-architecture-policy`, `security-ban-middleware-policy`, `user-ban-state`.
