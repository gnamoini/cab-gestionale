/** FatturaPA TipoDocumento — schema-supported (TD01–TD28). */
export type SchemaSupportedDocumentType =
  | "TD01" | "TD02" | "TD03" | "TD04" | "TD05" | "TD06"
  | "TD16" | "TD17" | "TD18" | "TD19" | "TD20" | "TD21" | "TD22" | "TD23"
  | "TD24" | "TD25" | "TD26" | "TD27" | "TD28";

/** Tipi abilitati nel ciclo attivo CAB (UI + generazione). */
export type CabEnabledDocumentType = "TD01" | "TD04" | "TD05" | "TD24" | "TD25";

export type DocumentTypePolicy = {
  type: SchemaSupportedDocumentType;
  schemaSupported: true;
  cabEnabled: boolean;
  reason: string;
};

const POLICIES: DocumentTypePolicy[] = [
  { type: "TD01", schemaSupported: true, cabEnabled: true, reason: "Fattura ordinaria ciclo attivo" },
  { type: "TD02", schemaSupported: true, cabEnabled: false, reason: "Acconto su fattura — non esposto CAB" },
  { type: "TD03", schemaSupported: true, cabEnabled: false, reason: "Acconto su parcella — non esposto CAB" },
  { type: "TD04", schemaSupported: true, cabEnabled: true, reason: "Nota di credito" },
  { type: "TD05", schemaSupported: true, cabEnabled: true, reason: "Nota di debito" },
  { type: "TD06", schemaSupported: true, cabEnabled: false, reason: "Parcella — non esposto CAB" },
  { type: "TD16", schemaSupported: true, cabEnabled: false, reason: "Integrazione reverse charge — non ciclo attivo CAB" },
  { type: "TD17", schemaSupported: true, cabEnabled: false, reason: "Autofattura servizi estero — non ciclo attivo CAB" },
  { type: "TD18", schemaSupported: true, cabEnabled: false, reason: "Acquisto beni intracomunitari — non ciclo attivo CAB" },
  { type: "TD19", schemaSupported: true, cabEnabled: false, reason: "Autofattura ex art. 17 — non ciclo attivo CAB" },
  { type: "TD20", schemaSupported: true, cabEnabled: false, reason: "Autofattura regolarizzazione — non ciclo attivo CAB" },
  { type: "TD21", schemaSupported: true, cabEnabled: false, reason: "Autofattura splafonamento — non ciclo attivo CAB" },
  { type: "TD22", schemaSupported: true, cabEnabled: false, reason: "Estrazione deposito IVA — non ciclo attivo CAB" },
  { type: "TD23", schemaSupported: true, cabEnabled: false, reason: "Estrazione deposito IVA con versamento — non ciclo attivo CAB" },
  { type: "TD24", schemaSupported: true, cabEnabled: true, reason: "Fattura differita art. 21 c.4 lett. a) con DDT" },
  { type: "TD25", schemaSupported: true, cabEnabled: true, reason: "Fattura differita art. 21 c.4 lett. b)" },
  { type: "TD26", schemaSupported: true, cabEnabled: false, reason: "Cessione beni ammortizzabili — non ciclo attivo CAB" },
  { type: "TD27", schemaSupported: true, cabEnabled: false, reason: "Autoconsumo/cessioni gratuite — non ciclo attivo CAB" },
  { type: "TD28", schemaSupported: true, cabEnabled: false, reason: "Acquisti San Marino — non ciclo attivo CAB" },
];

const POLICY_MAP = new Map(POLICIES.map((p) => [p.type, p]));

export function getDocumentTypePolicy(type: string): DocumentTypePolicy | undefined {
  return POLICY_MAP.get(type as SchemaSupportedDocumentType);
}

export function isSchemaSupportedDocumentType(type: string): type is SchemaSupportedDocumentType {
  return POLICY_MAP.has(type as SchemaSupportedDocumentType);
}

export function isCabEnabledDocumentType(type: string): type is CabEnabledDocumentType {
  const p = getDocumentTypePolicy(type);
  return Boolean(p?.cabEnabled);
}

export function listDocumentTypePolicies(): DocumentTypePolicy[] {
  return [...POLICIES];
}
