import type { CabDocumentType, DocumentTypeRegistryEntry } from "@/lib/integrations/unoerp/types";

/**
 * Registry post-discovery. Tutti UNRESOLVED finché info sull'istanza non è verificata.
 * Un consuntivo non può puntare al modulo preventivi.
 */
const REGISTRY: Record<CabDocumentType, DocumentTypeRegistryEntry> = {
  preventivo: {
    cabDocumentType: "preventivo",
    unoerpModule: "Produzione",
    unoerpFile: "preventivi",
    unoerpRepresentation: null,
    mappingStrategy: null,
    resolved: false,
  },
  consuntivo: {
    cabDocumentType: "consuntivo",
    unoerpModule: null,
    unoerpFile: null,
    unoerpRepresentation: null,
    mappingStrategy: null,
    resolved: false,
  },
  ddt: {
    cabDocumentType: "ddt",
    unoerpModule: "Magazzino",
    unoerpFile: "movimento",
    unoerpRepresentation: "movimento_magazzino",
    mappingStrategy: "direct_movimento",
    resolved: false,
  },
};

export function getDocumentTypeRegistryEntry(type: CabDocumentType): DocumentTypeRegistryEntry {
  return REGISTRY[type];
}

export function assertRegistryDispatchSafe(type: CabDocumentType): void {
  const e = REGISTRY[type];
  if (type === "consuntivo" && e.unoerpModule && REGISTRY.preventivo.unoerpModule) {
    if (e.unoerpModule === REGISTRY.preventivo.unoerpModule && e.unoerpFile === REGISTRY.preventivo.unoerpFile) {
      throw new Error("Consuntivo must not dispatch to the Preventivi UnoERP module");
    }
  }
}

export function listDocumentTypeRegistry(): DocumentTypeRegistryEntry[] {
  return [REGISTRY.preventivo, REGISTRY.consuntivo, REGISTRY.ddt];
}
