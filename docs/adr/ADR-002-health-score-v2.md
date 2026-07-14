# ADR-002: Health Score Officina v2

**Status:** Accepted  
**Date:** 2026-07-13  
**Deciders:** Platform / Engineering  
**Supersedes:** client-side operational health score (v1)

---

## Context

Il Health Score v1 (`lib/dashboard/operational-health-score.ts`) calcola il punteggio **nel browser**, con input filtrati dai permessi RBAC dell'utente. Due operatori sulla stessa Dashboard possono vedere punteggi diversi. Non esiste audit trail, versioning, né target assoluti.

Requisiti enterprise:
- Score **unico per officina** (stesso valore per tutti con `dashboard` READ)
- Calcolo **server-side** con dati completi (service-role)
- Motore **estendibile** via plugin registry (KPI/sezioni)
- **Determinismo** assoluto su stesso snapshot + config + versioni
- **Breakdown filtrato** per permessi (minimo privilegio su dati economici)
- Audit con `input_snapshot`, formula trace, versioni separate

---

## Decision

### Architettura plugin registry

```
engine → registry → sections → kpi plugins → normalizers
```

Il motore non conosce KPI specifici. Loop generico su `HealthKpiDefinition` registrati via `registerHealthKpi()`.

### Score vs breakdown

| Layer | Permessi | Comportamento |
|---|---|---|
| Engine | Nessuno (service-role) | Tutti i dati officina |
| Score finale | Nessuno | Identico per tutti |
| Breakdown API | Filtrato | Redazione per modulo senza READ |

### Determinismo

```
Stesso InputSnapshot + config_version + engine_version + schema_version
= stesso Health Score (bit-identico)
```

- Anchor data passato esplicitamente (no `Date.now()` nel pipeline)
- Esecuzione ordinata su registry (sort by id)

### Persistenza

- Config: `app_settings` (`health_score_v2_config`)
- Storico: `health_score_runs` con `input_snapshot`, `breakdown`, tre versioni
- Cache doppia: input aggregates + result; invalidazione event-driven

---

## Consequences

### Positive

- Score coerente cross-utente
- Estensibilità senza modificare il motore
- Riproducibilità e benchmark algoritmi
- RBAC sul breakdown preserva dati sensibili

### Negative

- Nuova dipendenza service-role su route dashboard
- Latenza cold compute (mitigata da cache)
- Shock UX possibile vs v1 (shadow period consigliato)

---

## Permission matrix (breakdown redaction)

| Sezione | Modulo richiesto (READ) |
|---|---|
| produzione | lavorazioni |
| magazzino | magazzino |
| personale | dipendenti |
| economico | preventivi **or** fatturazione |
| rischio | almeno una sezione operativa visibile |

Contributi redatti → nodo aggregato `Altri fattori` senza alterare il totale.
