import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { SKELETON_GRID } from "./skeleton-layout-presets";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import {
  RouteSkeletonActionsRow,
  RouteSkeletonCardsStack,
  RouteSkeletonCombinedList,
  RouteSkeletonKpiRow,
  RouteSkeletonRoot,
  RouteSkeletonTabBar,
  RouteSkeletonTable,
} from "./route-skeleton-primitives";

const SETTINGS_PAGE_GRID_SKELETON =
  "grid min-h-0 items-start gap-x-5 gap-y-5 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-6 md:gap-y-6 lg:grid-cols-[16rem_minmax(0,1fr)]";

export function ListPageRouteSkeleton({
  scope = "full",
  sectionLabel,
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  sectionLabel?: string;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    if (scope === "content") {
      return (
        <RouteSkeletonRoot ariaLabel="Caricamento elenco" testId="list-page-route-skeleton" scope={scope} className={className}>
          <RouteSkeletonCardsStack count={4} />
        </RouteSkeletonRoot>
      );
    }
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento lista" testId="list-page-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonActionsRow />
        <RouteSkeletonCombinedList sectionLabel={sectionLabel} />
        <RouteSkeletonCardsStack count={4} className="mt-4" />
      </RouteSkeletonRoot>
    );
  }
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento tabella" testId="list-page-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonTable />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento lista" testId="list-page-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <RouteSkeletonCombinedList sectionLabel={sectionLabel} />
    </RouteSkeletonRoot>
  );
}

export function DocumentiPageRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento documenti" testId="documenti-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonTable geometry="table-documenti" />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento documenti" testId="documenti-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.toolbar} sectionLabel="Azioni e filtri documenti" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDocumenti} />
    </RouteSkeletonRoot>
  );
}

export function DashboardRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento dashboard" testId="dashboard-route-skeleton" scope={scope} className={className}>
      <SkeletonBlock minHeightClass="min-h-[7.5rem]" className="w-full rounded-2xl" />
      <div className={`grid min-w-0 gap-4 ${SKELETON_GRID.dashboardWidgetsLg}`}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
      </div>
      <div className={`space-y-3 ${SKELETON_GRID.dashboardWidgetsMobile}`}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
      </div>
    </RouteSkeletonRoot>
  );
}

export function LavorazioniRouteSkeleton({
  scope = "full",
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    if (scope === "content") {
      return (
        <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni" testId="lavorazioni-route-skeleton" scope={scope} className={className}>
          <RouteSkeletonCardsStack count={5} />
        </RouteSkeletonRoot>
      );
    }
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni" testId="lavorazioni-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonActionsRow />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <SkeletonBlock minHeightClass="min-h-10" className="w-40" />
          <SkeletonBlock minHeightClass="min-h-10" className="w-24" />
        </div>
        <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="w-full" />
        <RouteSkeletonCardsStack count={5} />
      </RouteSkeletonRoot>
    );
  }
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni" testId="lavorazioni-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni" testId="lavorazioni-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <SkeletonBlock minHeightClass="min-h-10" className="w-40" />
        <SkeletonBlock minHeightClass="min-h-10" className="w-24" />
      </div>
      <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="w-full" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
    </RouteSkeletonRoot>
  );
}

export function DipendentiRouteSkeleton({
  scope = "full",
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    if (scope === "content") {
      return (
        <RouteSkeletonRoot ariaLabel="Caricamento tabella presenze" testId="dipendenti-route-skeleton" scope={scope} className={className}>
          <RouteSkeletonKpiRow count={4} />
          <RouteSkeletonCardsStack count={4} />
        </RouteSkeletonRoot>
      );
    }
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento dipendenti" testId="dipendenti-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonActionsRow />
        <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="w-full" />
        <RouteSkeletonKpiRow count={4} />
        <RouteSkeletonCardsStack count={4} />
      </RouteSkeletonRoot>
    );
  }
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento tabella presenze" testId="dipendenti-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonKpiRow count={4} />
        <SkeletonShellCard title="Tabella presenze" bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento dipendenti" testId="dipendenti-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="w-full" />
      <RouteSkeletonKpiRow count={4} />
      <SkeletonShellCard title="Tabella presenze" bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
    </RouteSkeletonRoot>
  );
}

export function FatturazioneRouteSkeleton({
  scope = "full",
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    if (scope === "content") {
      return (
        <RouteSkeletonRoot ariaLabel="Caricamento sezione fatturazione" testId="fatturazione-route-skeleton" scope={scope} className={className}>
          <RouteSkeletonCardsStack count={4} />
        </RouteSkeletonRoot>
      );
    }
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento fatturazione" testId="fatturazione-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonActionsRow />
        <RouteSkeletonKpiRow count={4} />
        <RouteSkeletonTabBar />
        <RouteSkeletonCardsStack count={4} />
      </RouteSkeletonRoot>
    );
  }
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento sezione fatturazione" testId="fatturazione-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento fatturazione" testId="fatturazione-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <RouteSkeletonKpiRow count={4} />
      <RouteSkeletonTabBar />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
    </RouteSkeletonRoot>
  );
}

export function ImpostazioniRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento configurazione" testId="impostazioni-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.settingsContent} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento configurazione" testId="impostazioni-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <div className={SETTINGS_PAGE_GRID_SKELETON}>
        <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.settingsNav} className="hidden min-w-0 md:block" />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.settingsContent} />
      </div>
    </RouteSkeletonRoot>
  );
}

export function SicurezzaRouteSkeleton({
  scope = "full",
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento sicurezza" testId="sicurezza-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonTabBar />
        <RouteSkeletonCardsStack count={4} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento sicurezza" testId="sicurezza-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonTabBar />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.sicurezzaPanel} />
    </RouteSkeletonRoot>
  );
}

export function AgendaRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento sessioni agenda" testId="agenda-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaMain} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento agenda" testId="agenda-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="w-full" />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,300px)]">
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaCalendar} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaMain} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaSidebar} className="hidden xl:block" />
      </div>
    </RouteSkeletonRoot>
  );
}

export function ClientiRouteSkeleton({
  scope = "full",
  className = "",
  listSurface = "table",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
  listSurface?: ListSurface;
}) {
  if (listSurface === "cards") {
    if (scope === "content") {
      return (
        <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni clienti" testId="clienti-route-skeleton" scope={scope} className={className}>
          <RouteSkeletonCardsStack count={4} />
        </RouteSkeletonRoot>
      );
    }
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento portale clienti" testId="clienti-route-skeleton" scope={scope} className={className}>
        <RouteSkeletonActionsRow />
        <RouteSkeletonCombinedList sectionLabel="Azioni e filtri lavorazioni clienti" />
        <RouteSkeletonCardsStack count={4} />
      </RouteSkeletonRoot>
    );
  }
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento lavorazioni clienti" testId="clienti-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento portale clienti" testId="clienti-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <RouteSkeletonCombinedList sectionLabel="Azioni e filtri lavorazioni clienti" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableCompact} className="min-h-0" />
    </RouteSkeletonRoot>
  );
}

export function ClientDetailRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento dettaglio lavorazione" testId="client-detail-route-skeleton" scope={scope} className={className}>
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableCompact} />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
    </RouteSkeletonRoot>
  );
}

export function ProductionReadinessRouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  if (scope === "content") {
    return (
      <RouteSkeletonRoot ariaLabel="Caricamento production readiness" testId="production-readiness-route-skeleton" scope={scope} className={className}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessOutcome} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
          <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
        </div>
      </RouteSkeletonRoot>
    );
  }
  return (
    <RouteSkeletonRoot ariaLabel="Caricamento production readiness" testId="production-readiness-route-skeleton" scope={scope} className={className}>
      <RouteSkeletonActionsRow />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessOutcome} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
      </div>
    </RouteSkeletonRoot>
  );
}
