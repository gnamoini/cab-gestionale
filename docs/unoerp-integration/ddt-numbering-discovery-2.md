# DDT numbering discovery 2

## Campi (OBSERVED)

| Campo | Module | Note |
|-------|--------|------|
| doc_number | Magazzino/movimento | insert_ignore NOT indicated as true |
| doc_number_padded | Magazzino/movimento | display |
| sezionale | Magazzino/movimento | menu |
| numerazione, formato | Amministrazione/sezionali | es. NNNNNNNNNN/Z |
| autoprot | Magazzino/causali_magazzino | protocolla automaticamente |

## Assegnazione numero

**Classification:** AUTOMATIC_BY_SECTIONAL (hypothesis) — confidence LOW

Evidenza: `autoprot` su causali + `numerazione` su sezionali. Comportamento CREATE **REQUIRES_SAFE_WRITE_TEST**.

Anno: non esposto come campo dedicato — probabile derivazione da `data` o formato sezionale — NOT_VERIFIED