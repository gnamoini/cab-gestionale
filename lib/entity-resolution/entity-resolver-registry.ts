import type { EntityType, ResolutionStrategy } from "@/lib/entity-resolution/entity-resolution-types";

export type EntityDatasetRef =
  | "mezziListe.clienti"
  | "mezziListe.cantieri"
  | "mezziListe.utilizzatori"
  | "mezziListe.marche"
  | "mezziListe.modelli"
  | "mezziListe.tipiAttrezzatura"
  | "mezziListe.tipiTelaio"
  | "mezziListe.attrezzature"
  | "mezziListe.telai"
  | "magazzinoMaster.marche"
  | "magazzinoMaster.categorie"
  | "magazzinoMaster.fornitori"
  | "lavorazioni.addettiRecords"
  | "magazzino.ricambi"
  | "mezzi.catalog";

export type EntityGraphEdge = {
  parentFieldPattern: string;
  parentEntityType: EntityType;
};

export type EntityResolverConfig = {
  entityType: EntityType;
  dataset: EntityDatasetRef;
  normalize: {
    unicode: boolean;
    stripLegalSuffix: boolean;
    stripGeographic: boolean;
    punctuation: boolean;
  };
  strategies: ResolutionStrategy[];
  autoApplyThreshold: number;
  candidateGapMin: number;
  useAliases: boolean;
  useKnownCorrections: boolean;
  graphParents?: EntityGraphEdge[];
  allowFuzzy: boolean;
  allowLlm: boolean;
};

const DEFAULT_STRATEGIES: ResolutionStrategy[] = [
  "exact",
  "canonical",
  "alias",
  "known_correction",
  "dictionary",
  "hierarchy",
  "graph",
  "fuzzy",
  "llm_semantic",
];

function cfg(
  entityType: EntityType,
  dataset: EntityDatasetRef,
  overrides: Partial<EntityResolverConfig> = {},
): EntityResolverConfig {
  return {
    entityType,
    dataset,
    normalize: {
      unicode: true,
      stripLegalSuffix: dataset.includes("clienti") || dataset.includes("fornitori") || dataset.includes("marche"),
      stripGeographic: true,
      punctuation: true,
    },
    strategies: DEFAULT_STRATEGIES,
    autoApplyThreshold: 0.95,
    candidateGapMin: 0.15,
    useAliases: true,
    useKnownCorrections: true,
    allowFuzzy: true,
    allowLlm: true,
    ...overrides,
  };
}

export const ENTITY_RESOLVER_REGISTRY: Record<EntityType, EntityResolverConfig> = {
  MARCA: cfg("MARCA", "mezziListe.marche", {
    autoApplyThreshold: 0.95,
    graphParents: [],
  }),
  MODELLO: cfg("MODELLO", "mezziListe.modelli", {
    autoApplyThreshold: 0.95,
    graphParents: [{ parentFieldPattern: "marca_attrezzatura", parentEntityType: "MARCA" }],
  }),
  CLIENTE: cfg("CLIENTE", "mezziListe.clienti", {
    autoApplyThreshold: 0.97,
    normalize: { unicode: true, stripLegalSuffix: true, stripGeographic: true, punctuation: true },
  }),
  CANTIERE: cfg("CANTIERE", "mezziListe.cantieri", {
    autoApplyThreshold: 0.96,
    graphParents: [{ parentFieldPattern: "cliente", parentEntityType: "CLIENTE" }],
  }),
  UTILIZZATORE: cfg("UTILIZZATORE", "mezziListe.utilizzatori", { autoApplyThreshold: 0.96 }),
  FORNITORE: cfg("FORNITORE", "magazzinoMaster.fornitori", { autoApplyThreshold: 0.97 }),
  CATEGORIA: cfg("CATEGORIA", "magazzinoMaster.categorie", { autoApplyThreshold: 0.95 }),
  RICAMBIO: cfg("RICAMBIO", "magazzino.ricambi", {
    autoApplyThreshold: 0.99,
    candidateGapMin: 0.2,
    useAliases: false,
    graphParents: [
      { parentFieldPattern: "marca_attrezzatura", parentEntityType: "MARCA" },
      { parentFieldPattern: "modello_attrezzatura", parentEntityType: "MODELLO" },
    ],
  }),
  OPERATORE: cfg("OPERATORE", "lavorazioni.addettiRecords", {
    autoApplyThreshold: 1.0,
    candidateGapMin: 0.2,
    allowFuzzy: false,
    allowLlm: false,
    useAliases: false,
  }),
  TIPO_ATTREZZATURA: cfg("TIPO_ATTREZZATURA", "mezziListe.tipiAttrezzatura", { useAliases: false }),
  TIPO_TELAIO: cfg("TIPO_TELAIO", "mezziListe.tipiTelaio", { useAliases: false }),
  MEZZO_IDENT: cfg("MEZZO_IDENT", "mezzi.catalog", {
    autoApplyThreshold: 0.98,
    allowFuzzy: true,
    graphParents: [{ parentFieldPattern: "cliente", parentEntityType: "CLIENTE" }],
  }),
  GENERIC: cfg("GENERIC", "mezziListe.clienti", { useAliases: false, useKnownCorrections: false }),
};

export function getEntityResolverConfig(entityType: EntityType): EntityResolverConfig {
  return ENTITY_RESOLVER_REGISTRY[entityType] ?? ENTITY_RESOLVER_REGISTRY.GENERIC;
}
