import type { ImportEntity, ImportDuplicateAction } from "@/lib/data-import/core/types";
import type { ImportRowAction, ImportStrategy } from "@/lib/data-import/core/import-plugin";

export type ImportEntityClientConfig = {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  status: "active" | "stub";
  rowLabelKeys: string[];
  defaultStrategy: ImportStrategy;
  defaultDuplicateAction: ImportDuplicateAction;
  supportedStrategies: ImportStrategy[];
  allowedRowActions: ImportRowAction[];
  supportsReplace: boolean;
};

const CONFIGS: ImportEntityClientConfig[] = [
  {
    id: "magazzino_ricambi",
    routeSlug: "magazzino",
    label: "Magazzino ricambi",
    status: "active",
    rowLabelKeys: ["codice", "descrizione"],
    defaultStrategy: "incremental",
    defaultDuplicateAction: "update",
    supportedStrategies: ["initial", "incremental", "replace"],
    allowedRowActions: ["skip", "update", "replace", "create"],
    supportsReplace: true,
  },
  {
    id: "clienti_anagrafica",
    routeSlug: "clienti",
    label: "Clienti anagrafica",
    status: "active",
    rowLabelKeys: ["nomeDisplay", "nome_display"],
    defaultStrategy: "incremental",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["initial", "incremental"],
    allowedRowActions: ["skip", "update", "create"],
    supportsReplace: false,
  },
  {
    id: "listino_ricambi",
    routeSlug: "listino",
    label: "Listino ricambi",
    status: "active",
    rowLabelKeys: ["codice", "descrizione"],
    defaultStrategy: "sync",
    defaultDuplicateAction: "update",
    supportedStrategies: ["sync", "incremental", "initial"],
    allowedRowActions: ["skip", "update", "create"],
    supportsReplace: false,
  },
  {
    id: "mezzi",
    routeSlug: "mezzi",
    label: "Mezzi",
    status: "active",
    rowLabelKeys: ["targa", "matricola", "cliente"],
    defaultStrategy: "incremental",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["initial", "incremental"],
    allowedRowActions: ["skip", "update", "create"],
    supportsReplace: false,
  },
  {
    id: "preventivi",
    routeSlug: "preventivi",
    label: "Preventivi",
    status: "active",
    rowLabelKeys: ["cliente", "targa"],
    defaultStrategy: "initial",
    defaultDuplicateAction: "create_new",
    supportedStrategies: ["initial", "incremental"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_fornitori",
    routeSlug: "settings-fornitori",
    label: "Fornitori",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_produttori",
    routeSlug: "settings-produttori",
    label: "Produttori",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_categorie",
    routeSlug: "settings-categorie",
    label: "Categorie ricambi",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_marche",
    routeSlug: "settings-marche",
    label: "Marche ricambi",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_addetti",
    routeSlug: "settings-addetti",
    label: "Operatori / addetti",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_cantieri",
    routeSlug: "settings-cantieri",
    label: "Cantieri",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_utilizzatori",
    routeSlug: "settings-utilizzatori",
    label: "Utilizzatori",
    status: "active",
    rowLabelKeys: ["valore"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "replace", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_hierarchy_attrezzature",
    routeSlug: "settings-attrezzature",
    label: "Catalogo attrezzature",
    status: "active",
    rowLabelKeys: ["marca", "modello"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
  {
    id: "settings_hierarchy_telai",
    routeSlug: "settings-telai",
    label: "Catalogo telai",
    status: "active",
    rowLabelKeys: ["marca", "modello"],
    defaultStrategy: "merge",
    defaultDuplicateAction: "skip",
    supportedStrategies: ["merge", "initial"],
    allowedRowActions: ["skip", "create"],
    supportsReplace: false,
  },
];

const STUB_DEFAULT: Omit<ImportEntityClientConfig, "id" | "routeSlug" | "label"> = {
  status: "stub",
  rowLabelKeys: ["id"],
  defaultStrategy: "initial",
  defaultDuplicateAction: "skip",
  supportedStrategies: ["initial"],
  allowedRowActions: ["skip"],
  supportsReplace: false,
};

const STUBS: ImportEntityClientConfig[] = (
  [
    ["lavorazioni", "lavorazioni", "Lavorazioni"],
    ["fatture_draft", "fatture", "Fatture (bozze)"],
    ["billing_customers", "billing-customers", "Clienti fatturazione"],
    ["documenti_metadata", "documenti-metadata", "Documenti (metadati)"],
    ["dipendenti_timesheet", "dipendenti", "Dipendenti timesheet"],
  ] as const
).map(([id, routeSlug, label]) => ({
  id,
  routeSlug,
  label,
  ...STUB_DEFAULT,
}));

const ALL = [...CONFIGS, ...STUBS];
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function getImportEntityClientConfig(entity: ImportEntity): ImportEntityClientConfig {
  return BY_ID.get(entity) ?? { id: entity, routeSlug: entity, label: entity, ...STUB_DEFAULT };
}

export function formatImportRowLabel(entity: ImportEntity, row: Record<string, unknown>): string {
  const cfg = getImportEntityClientConfig(entity);
  for (const key of cfg.rowLabelKeys) {
    const v = row[key];
    if (v != null && String(v).trim()) return String(v);
  }
  return `#${row.rowIndex ?? "?"}`;
}
