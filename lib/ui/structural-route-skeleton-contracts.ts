import type { SkeletonContract } from "@/components/design-system/loading/skeleton-contract";
import { SKELETON_GRID } from "@/components/design-system/loading/skeleton-layout-presets";
import type { MigratedStructuralRoute } from "@/lib/ui/migrated-structural-routes";

/** ponytail: duplicato da SETTINGS_PAGE_GRID — evita import server-only in audit/tests. */
const SETTINGS_PAGE_GRID_SKELETON =
  "grid min-h-0 items-start gap-x-5 gap-y-5 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-6 md:gap-y-6 lg:grid-cols-[16rem_minmax(0,1fr)]";

/** Pattern liste ERP — toolbar + tabella in ShellCard. */
export const COMBINED_LIST_SKELETON_CONTRACT: SkeletonContract = {
  kind: "combined-list",
  geometry: { height: "inventory-table", width: "full" },
  sectionLabel: "Azioni e filtri lista",
};

export const ERP_TABLE_SKELETON_CONTRACT: SkeletonContract = {
  kind: "table",
  geometry: { height: "table", width: "full" },
};

export const ERP_TABLE_DOCUMENTI_SKELETON_CONTRACT: SkeletonContract = {
  kind: "table",
  geometry: { height: "table-documenti", width: "full" },
};

export const LAVORAZIONI_LIST_BODY_SKELETON_CONTRACT: SkeletonContract = {
  kind: "stack",
  geometry: { height: "table" },
  className: "flex min-w-0 flex-col gap-4",
  children: [
    { kind: "card", geometry: { height: "table" } },
    { kind: "block", geometry: { height: "toolbar" }, className: "min-h-0" },
  ],
};

export const AGENDA_CONTENT_SKELETON_CONTRACT: SkeletonContract = {
  kind: "card",
  geometry: { height: "agenda-main" },
};

export const DIPENDENTI_TIMESHEET_BODY_SKELETON_CONTRACT: SkeletonContract = {
  kind: "stack",
  geometry: { height: "table" },
  className: "flex min-w-0 flex-col gap-4",
  children: [
    { kind: "block", geometry: { height: "kpi-row" } },
    { kind: "card", geometry: { height: "table" } },
  ],
};

export const FATTURAZIONE_TAB_BODY_SKELETON_CONTRACT: SkeletonContract = {
  kind: "stack",
  geometry: { height: "table" },
  className: "flex min-w-0 flex-col gap-4",
  children: [
    { kind: "card", geometry: { height: "table" } },
    {
      kind: "grid",
      geometry: { height: "card-sm" },
      className: SKELETON_GRID.lavorazioniMobileStack,
      itemCount: 4,
    },
  ],
};

export const CLIENT_DETAIL_BODY_SKELETON_CONTRACT: SkeletonContract = {
  kind: "stack",
  geometry: { height: "card" },
  className: "flex min-w-0 flex-col gap-4",
  children: [
    { kind: "card", geometry: { height: "table-compact" } },
    { kind: "card", geometry: { height: "card-sm" } },
  ],
};

/** SSOT contratti route — usati da *PageStructure e LoadingPageSkeleton (Suspense). */
export const STRUCTURAL_ROUTE_SKELETON_CONTRACTS: Record<MigratedStructuralRoute, SkeletonContract> = {
  magazzino: {
    ...COMBINED_LIST_SKELETON_CONTRACT,
    sectionLabel: "Azioni e filtri magazzino",
  },
  mezzi: {
    ...COMBINED_LIST_SKELETON_CONTRACT,
    sectionLabel: "Azioni e filtri mezzi",
  },
  preventivi: {
    ...COMBINED_LIST_SKELETON_CONTRACT,
    sectionLabel: "Azioni e filtri preventivi",
  },
  documenti: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      {
        kind: "card",
        geometry: { height: "toolbar" },
        sectionLabel: "Azioni e filtri documenti",
      },
      {
        kind: "card",
        geometry: { height: "table-documenti" },
      },
    ],
  },
  dashboard: {
    kind: "stack",
    geometry: { height: "welcome" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "card", geometry: { height: "welcome" } },
      { kind: "card", geometry: { height: "card-promemoria" } },
      { kind: "card", geometry: { height: "card-sm" } },
      { kind: "block", geometry: { height: "kpi-row" } },
      {
        kind: "grid",
        geometry: { height: "card-sm" },
        className: SKELETON_GRID.dashboardWidgetsLg,
        itemCount: 2,
      },
      {
        kind: "grid",
        geometry: { height: "card-sm" },
        className: SKELETON_GRID.dashboardWidgetsMobile,
        itemCount: 2,
      },
      { kind: "card", geometry: { height: "card-promemoria" } },
    ],
  },
  lavorazioni: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "toolbar", geometry: { height: "toolbar" } },
      { kind: "card", geometry: { height: "table" } },
      { kind: "block", geometry: { height: "toolbar" }, className: "min-h-0" },
    ],
  },
  report: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    sectionLabel: "Report V2 — delegato a ReportV2RouteSkeleton",
    children: [
      { kind: "toolbar", geometry: { height: "toolbar" } },
      { kind: "block", geometry: { height: "kpi-row" } },
      { kind: "card", geometry: { height: "table" } },
    ],
  },
  agenda: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "toolbar", geometry: { height: "toolbar" } },
      {
        kind: "stack",
        geometry: { height: "agenda-main" },
        className: "grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,300px)]",
        children: [
          { kind: "card", geometry: { height: "agenda-calendar" } },
          { kind: "card", geometry: { height: "agenda-main" } },
          { kind: "card", geometry: { height: "agenda-sidebar" }, className: "hidden xl:block" },
        ],
      },
    ],
  },
  dipendenti: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "block", geometry: { height: "kpi-row" } },
      { kind: "toolbar", geometry: { height: "toolbar" } },
      { kind: "card", geometry: { height: "table" } },
    ],
  },
  fatturazione: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "block", geometry: { height: "kpi-row" } },
      { kind: "toolbar", geometry: { height: "toolbar" } },
      { kind: "card", geometry: { height: "table" } },
      {
        kind: "grid",
        geometry: { height: "card-sm" },
        className: SKELETON_GRID.lavorazioniMobileStack,
        itemCount: 4,
      },
    ],
  },
  impostazioni: {
    kind: "stack",
    geometry: { height: "settings-content" },
    className: SETTINGS_PAGE_GRID_SKELETON,
    children: [
      { kind: "block", geometry: { height: "settings-nav" }, className: "hidden md:block" },
      {
        kind: "stack",
        geometry: { height: "settings-content" },
        className: "flex min-w-0 flex-col gap-4",
        children: [{ kind: "card", geometry: { height: "settings-content" } }],
      },
    ],
  },
  sicurezza: {
    kind: "stack",
    geometry: { height: "tab-bar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "tab-bar", geometry: { height: "tab-bar" } },
      { kind: "card", geometry: { height: "sicurezza-panel" } },
    ],
  },
  "production-readiness": {
    kind: "stack",
    geometry: { height: "card-sm" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      { kind: "card", geometry: { height: "production-readiness-outcome" } },
      {
        kind: "grid",
        geometry: { height: "production-readiness-card" },
        className: "grid min-w-0 gap-4 lg:grid-cols-2",
        itemCount: 2,
      },
    ],
  },
  clienti: {
    kind: "stack",
    geometry: { height: "toolbar" },
    className: "flex min-w-0 flex-col gap-4",
    children: [
      {
        kind: "combined-list",
        geometry: { height: "toolbar" },
        sectionLabel: "Azioni e filtri lavorazioni clienti",
      },
      { kind: "card", geometry: { height: "table" } },
      { kind: "card", geometry: { height: "table-compact" }, className: "min-h-0" },
    ],
  },
  "client-detail": CLIENT_DETAIL_BODY_SKELETON_CONTRACT,
  login: {
    kind: "card",
    geometry: { height: "login-card", width: "full" },
    className: "mx-auto w-full max-w-md rounded-[var(--ds-radius-xl)]",
  },
};

export const STRUCTURAL_ROUTE_PAGE_STRUCTURE: Record<MigratedStructuralRoute, string> = {
  magazzino: "MagazzinoPageStructure",
  mezzi: "MezziPageStructure",
  documenti: "DocumentiPageStructure",
  preventivi: "PreventiviPageStructure",
  dashboard: "DashboardPageStructure",
  lavorazioni: "LavorazioniPageStructure",
  report: "ReportPageStructure",
  agenda: "AgendaPageStructure",
  dipendenti: "DipendentiPageStructure",
  fatturazione: "FatturazionePageStructure",
  impostazioni: "ImpostazioniPageStructure",
  sicurezza: "SicurezzaPageStructure",
  "production-readiness": "ProductionReadinessPageStructure",
  clienti: "ClientiPageStructure",
  "client-detail": "ClientDetailPageStructure",
  login: "LoginPageStructure",
};

export const STRUCTURAL_ROUTE_PAGE_TITLES: Record<MigratedStructuralRoute, string> = {
  magazzino: "Magazzino ricambi",
  mezzi: "Mezzi",
  documenti: "Documenti",
  preventivi: "Preventivi",
  dashboard: "Dashboard",
  lavorazioni: "Lavorazioni",
  report: "Report",
  agenda: "Agenda",
  dipendenti: "Dipendenti",
  fatturazione: "Fatturazione",
  impostazioni: "Configurazione",
  sicurezza: "Sicurezza",
  "production-readiness": "Production Readiness",
  clienti: "Portale Clienti",
  "client-detail": "Portale Clienti",
  login: "",
};
