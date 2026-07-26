# Matrice rename anagrafiche — kind → operationIds

SSOT registry: [`lib/settings/rename-engine/rename-operation-registry.ts`](../lib/settings/rename-engine/rename-operation-registry.ts)

| Kind | Operation IDs | Tabelle live |
|------|---------------|--------------|
| `cliente` | mezzi, preventivi, schede, profiles, anagrafica, billing, DDT bozze, alias | `mezzi`, `preventivi`, `billing_customers`, `ddt_documents` (bozza) |
| `utilizzatore` | mezzi, schede | `mezzi`, `scheda_lavorazione` |
| `cantiere` | mezzi.meta, schede | `mezzi`, `scheda_lavorazione` |
| `tipo_attrezzatura` | attrezzature.tipo | `attrezzature` |
| `tipo_telaio` | mezzi.tipo_telaio | `mezzi` |
| `hierarchy_marca_attrezzature` | attrezzature.marca, documenti, compat | `attrezzature`, `documenti` |
| `hierarchy_modello_attrezzature` | attrezzature.modello, documenti, compat | `attrezzature`, `documenti` |
| `hierarchy_marca_telai` | mezzi.marca_telaio, documenti, compat | `mezzi`, `documenti` |
| `hierarchy_modello_telai` | mezzi.modello_telaio, documenti, compat | `mezzi`, `documenti` |

## Policy snapshot

- **Protetti:** DDT/fatture emessi, snapshot JSONB, PDF
- **Live:** bozze, mezzi, attrezzature, preventivi aperti

## Rename ≠ Merge

Vedi [`lib/settings/rename-engine/merge-plan.ts`](../lib/settings/rename-engine/merge-plan.ts)
