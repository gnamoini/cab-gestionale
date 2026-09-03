# DDT numbering design

**Stato: PARTIALLY_VERIFIED**

## Campi osservati (READ-ONLY)

| Concetto | Campo | Module/File | Note |
|----------|-------|-------------|------|
| Numero | `doc_number` | Magazzino/movimento | text, insert non verificato |
| Numero padded | `doc_number_padded` | Magazzino/movimento | text |
| Sezionale | `sezionale` | Magazzino/movimento | menu con valori |
| Protocollo | `cod`, `id_prot` | Magazzino/movimento | |
| Anno | non esposto come campo dedicato | | probabile dentro `doc_number` / sezionale |
| Serie | non identificata come campo separato | | |

## Configurazione sezionali (OBSERVED)

**Amministrazione/sezionali:**

- `numerazione` — es. `INT` (campione anonimizzato)
- `formato` — es. `NNNNNNNNNN/Z`
- `descrizione` — es. sezionale integrazioni

## Causali magazzino (OBSERVED)

**Magazzino/causali_magazzino:**

- `sezionale_id` — sezionale predefinito per causale
- `autoprot` — "Protocolla automaticamente il documento"
- `protocollo` — flag osservato in sample

## Chi assegna il numero

| Ipotesi | Evidenza | Stato |
|---------|----------|-------|
| UnoERP via sezionale + autoprot | campi `autoprot`, `doc_number*` | PARTIALLY_VERIFIED |
| CAB assegna e UnoERP accetta | `insert_ignore` su campi numero | NOT VERIFIED |
| Handshake | | NOT TESTED |

## Strategia CAB

**NON implementare** strategia numerazione senza:

```
REQUIRES_SAFE_WRITE_TEST
```

Gate DDT numerazione: **PASS_CONDITIONED** con condition `SAFE_WRITE_TEST`.

Non inventare policy. Documentare solo evidenza read-only sopra.
