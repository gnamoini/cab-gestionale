import { lavorazioniSearchConfig } from "@/lib/search/domains/lavorazioni.config";
import { magazzinoSearchConfig } from "@/lib/search/domains/magazzino.config";
import { mezziSearchConfig } from "@/lib/search/domains/mezzi.config";
import { preventiviSearchConfig } from "@/lib/search/domains/preventivi.config";
import { securityUsersSearchConfig } from "@/lib/search/domains/security-users.config";
import type { SearchDomainConfig, SearchDomainId, SearchExecutionMode } from "@/lib/search/types";

const REGISTRY: Record<SearchDomainId, SearchDomainConfig<any, any>> = {
  lavorazioni: lavorazioniSearchConfig,
  preventivi: preventiviSearchConfig,
  magazzino: magazzinoSearchConfig,
  mezzi: mezziSearchConfig,
  documenti: {
    domain: "documenti",
    executionMode: "server",
    fields: [],
    buildDocument: () => "",
  },
  "ordini-fornitori": {
    domain: "ordini-fornitori",
    executionMode: "server",
    fields: [],
    buildDocument: () => "",
  },
  fatturazione: {
    domain: "fatturazione",
    executionMode: "server",
    fields: [],
    buildDocument: () => "",
  },
  "security-users": securityUsersSearchConfig,
  "client-portal-lavorazioni": {
    ...lavorazioniSearchConfig,
    domain: "client-portal-lavorazioni",
    executionMode: "client",
  },
  settings: {
    domain: "settings",
    executionMode: "client",
    fields: [],
    buildDocument: () => "",
  },
};

export function getSearchConfig(domain: SearchDomainId): SearchDomainConfig {
  return REGISTRY[domain];
}

export function resolveExecutionMode(domain: SearchDomainId): SearchExecutionMode {
  return REGISTRY[domain].executionMode;
}

export function usesServerSearch(domain: SearchDomainId): boolean {
  const mode = resolveExecutionMode(domain);
  return mode === "server" || mode === "both";
}

export function listSearchDomains(): SearchDomainId[] {
  return Object.keys(REGISTRY) as SearchDomainId[];
}
