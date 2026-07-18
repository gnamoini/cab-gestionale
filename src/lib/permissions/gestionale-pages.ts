import type { ComponentType, SVGProps } from "react";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import {
  IconNavAgenda,
  IconNavDashboard,
  IconNavDipendenti,
  IconNavDocumenti,
  IconNavFatturazione,
  IconNavLavorazioni,
  IconNavLavorazioniClient,
  IconNavMagazzino,
  IconNavMezzi,
  IconNavPreventivi,
  IconNavReport,
  IconNavSecurity,
  IconNavSettings,
} from "@/src/lib/permissions/gestionale-page-icons";

export type PageAccessLevel = "write" | "read" | "none";

export type GestionalePageIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type GestionalePage = {
  key: string;
  href: string;
  label: string;
  icon: GestionalePageIcon;
  order: number;
  showInNav: boolean;
  routeMatch: "exact" | "prefix";
  /** Modulo ERP principale (null = pagina senza modulo RLS dedicato). */
  primaryModule: GestionalePermissionModule | null;
  /** Moduli RLS aggiuntivi ereditati da questa pagina. */
  expandableModules: readonly GestionalePermissionModule[];
};

/** Catalogo pagine portale — SSOT assoluta per RBAC, route e menu. */
export const GESTIONALE_PAGES = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: IconNavDashboard,
    order: 0,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: null,
    expandableModules: [],
  },
  {
    key: "agenda",
    href: "/agenda",
    label: "Agenda",
    icon: IconNavAgenda,
    order: 1,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: null,
    expandableModules: [],
  },
  {
    key: "lavorazioni",
    href: "/lavorazioni",
    label: "Lavorazioni",
    icon: IconNavLavorazioni,
    order: 2,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "lavorazioni",
    expandableModules: [],
  },
  {
    key: "lavorazioni_clienti",
    href: "/lavorazioni-clienti",
    label: "Portale Clienti",
    icon: IconNavLavorazioniClient,
    order: 3,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: null,
    expandableModules: [],
  },
  {
    key: "preventivi",
    href: "/preventivi",
    label: "Preventivi",
    icon: IconNavPreventivi,
    order: 4,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "preventivi",
    expandableModules: ["ddt", "ordini_fornitori"],
  },
  {
    key: "fatturazione",
    href: "/fatturazione",
    label: "Fatturazione",
    icon: IconNavFatturazione,
    order: 5,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "fatturazione",
    expandableModules: [],
  },
  {
    key: "documenti",
    href: "/documenti",
    label: "Documenti",
    icon: IconNavDocumenti,
    order: 6,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "documenti",
    expandableModules: ["document_capture"],
  },
  {
    key: "magazzino",
    href: "/magazzino",
    label: "Magazzino",
    icon: IconNavMagazzino,
    order: 7,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "magazzino",
    expandableModules: ["magazzino_carichi"],
  },
  {
    key: "magazzino_carichi",
    href: "/magazzino/carichi",
    label: "Carichi",
    icon: IconNavMagazzino,
    order: 7.5,
    showInNav: false,
    routeMatch: "prefix",
    primaryModule: "magazzino_carichi",
    expandableModules: [],
  },
  {
    key: "mezzi",
    href: "/mezzi",
    label: "Mezzi",
    icon: IconNavMezzi,
    order: 8,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "mezzi",
    expandableModules: [],
  },
  {
    key: "dipendenti",
    href: "/dipendenti",
    label: "Dipendenti",
    icon: IconNavDipendenti,
    order: 9,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "dipendenti",
    expandableModules: [],
  },
  {
    key: "report",
    href: "/report",
    label: "Report",
    icon: IconNavReport,
    order: 10,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: "report",
    expandableModules: [],
  },
  {
    key: "impostazioni",
    href: "/impostazioni",
    label: "Configurazione",
    icon: IconNavSettings,
    order: 11,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: null,
    expandableModules: [],
  },
  {
    key: "sicurezza",
    href: "/sicurezza",
    label: "Sicurezza",
    icon: IconNavSecurity,
    order: 12,
    showInNav: true,
    routeMatch: "prefix",
    primaryModule: null,
    expandableModules: [],
  },
] as const satisfies readonly GestionalePage[];

export type GestionalePageKey = (typeof GESTIONALE_PAGES)[number]["key"];

export type GestionalePageHref = (typeof GESTIONALE_PAGES)[number]["href"];

export const ACCESS_DENIED_PATH = "/acesso-negato";

export function getGestionalePage(key: string): GestionalePage | undefined {
  return GESTIONALE_PAGES.find((p) => p.key === key);
}

export function getGestionalePageHref(key: GestionalePageKey): string {
  const page = getGestionalePage(key);
  if (!page) throw new Error(`Unknown page key: ${key}`);
  return page.href;
}

export const CLIENTE_HOME_PATH = getGestionalePageHref("lavorazioni_clienti");
export const SECURITY_HOME_PATH = getGestionalePageHref("sicurezza");

const PAGE_BY_KEY = new Map(GESTIONALE_PAGES.map((p) => [p.key, p]));

/** Ordine decrescente per prefix match (path più specifici prima). */
const PAGES_BY_MATCH = [...GESTIONALE_PAGES].sort((a, b) => b.href.length - a.href.length);

function normalizePath(pathname: string): string {
  return pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
}

function pathMatchesPage(path: string, page: GestionalePage): boolean {
  if (page.routeMatch === "exact") return path === page.href;
  return path === page.href || path.startsWith(`${page.href}/`);
}

export function pathnameToPage(pathname: string): GestionalePage | null {
  const path = normalizePath(pathname);
  if (path === ACCESS_DENIED_PATH) return null;
  if (path === "/login" || path.startsWith("/login/")) return null;
  if (path.startsWith("/dashboard/security")) return PAGE_BY_KEY.get("sicurezza") ?? null;
  for (const page of PAGES_BY_MATCH) {
    if (pathMatchesPage(path, page)) return page;
  }
  return null;
}

export function pageAccessFromLevel(level: PageAccessLevel): {
  level: PageAccessLevel;
  canRead: boolean;
  canWrite: boolean;
  visible: boolean;
} {
  return {
    level,
    canRead: level === "write" || level === "read",
    canWrite: level === "write",
    visible: level !== "none",
  };
}

export function pageAccessLabel(level: PageAccessLevel): string {
  switch (level) {
    case "write":
      return "Lettura + scrittura";
    case "read":
      return "Lettura";
    case "none":
      return "Nessun accesso";
  }
}

/** Sigla compatta per matrice permessi (W/R/—). */
export function pageAccessShortCode(level: PageAccessLevel): string {
  switch (level) {
    case "write":
      return "W";
    case "read":
      return "R";
    case "none":
      return "—";
  }
}

export function cyclePageAccessLevel(level: PageAccessLevel): PageAccessLevel {
  if (level === "write") return "read";
  if (level === "read") return "none";
  return "write";
}

/** Etichetta colonna matrice (header compatto). */
export function pageMatrixColumnLabel(label: string): string {
  const short: Record<string, string> = {
    Dashboard: "Dash",
    "Portale Clienti": "Portale",
    Configurazione: "Config",
    Lavorazioni: "Lavoraz.",
    Fatturazione: "Fattur.",
    Dipendenti: "Dipend.",
    Preventivi: "Prev.",
    Documenti: "Doc.",
    Magazzino: "Magaz.",
    Sicurezza: "Sicur.",
  };
  return short[label] ?? label;
}

/** Moduli ERP coperti da una pagina (primario + espansioni). */
export function modulesForPage(page: GestionalePage): GestionalePermissionModule[] {
  const mods: GestionalePermissionModule[] = [];
  if (page.primaryModule) mods.push(page.primaryModule);
  for (const m of page.expandableModules) {
    if (!mods.includes(m)) mods.push(m);
  }
  return mods;
}

/** Chiavi permesso modulo per bridge RLS temporaneo (`module.read` / `module.write`). */
export function expandPageToModuleKeys(page: GestionalePage, level: PageAccessLevel): string[] {
  if (level === "none") return [];
  const keys: string[] = [];
  for (const mod of modulesForPage(page)) {
    keys.push(`${mod}.read`);
    if (level === "write") keys.push(`${mod}.write`);
  }
  return keys;
}

export function allGestionalePageKeys(): GestionalePageKey[] {
  return GESTIONALE_PAGES.map((p) => p.key as GestionalePageKey);
}
