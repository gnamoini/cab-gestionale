import { memo } from "react";
import { LoginPageStructure } from "@/components/auth/login-page-structure";
import { DashboardPageStructure } from "@/components/dashboard/dashboard-page-structure";
import { ImpostazioniPageStructure } from "@/components/dashboard/impostazioni-page-structure";
import { SicurezzaPageStructure } from "@/components/dashboard/sicurezza-page-structure";
import { ProductionReadinessPageStructure } from "@/components/dashboard/security/production-readiness-page-structure";
import { FatturazionePageStructure } from "@/components/fatturazione/fatturazione-page-structure";
import { DocumentiPageStructure } from "@/components/gestionale/documenti/documenti-page-structure";
import { DipendentiPageStructure } from "@/components/gestionale/dipendenti/dipendenti-page-structure";
import { LavorazioniPageStructure } from "@/components/gestionale/lavorazioni/lavorazioni-page-structure";
import { MagazzinoPageStructure } from "@/components/gestionale/magazzino/magazzino-page-structure";
import { MezziPageStructure } from "@/components/gestionale/mezzi/mezzi-page-structure";
import { ClientDetailPageStructure } from "@/components/lavorazioni-clienti/client-lavorazione-detail-page-structure";
import { ClientiPageStructure } from "@/components/lavorazioni-clienti/client-lavorazioni-page-structure";
import { OrdiniFornitoriPageStructure } from "@/components/ordini-fornitori/ordini-fornitori-page-structure";
import { PreventiviPageStructure } from "@/components/preventivi/preventivi-page-structure";
import { ReportPageStructure } from "@/components/report/report-page-structure";
import { AgendaPageStructure } from "@/components/workshop-schedule/agenda-page-structure";
import type { MigratedStructuralRoute } from "@/lib/ui/migrated-structural-routes";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export type StructuralRouteSkeletonProps = {
  route: MigratedStructuralRoute;
  ariaLabel?: string;
  className?: string;
  scope?: RouteSkeletonScope;
};

const ROUTE_PAGE_STRUCTURE: Record<
  MigratedStructuralRoute,
  (props: { className?: string; scope?: RouteSkeletonScope }) => React.ReactNode
> = {
  login: ({}) => <LoginPageStructure mode="skeleton" />,
  dashboard: ({ scope }) => <DashboardPageStructure mode="skeleton" scope={scope} />,
  magazzino: ({ scope }) => <MagazzinoPageStructure mode="skeleton" scope={scope} />,
  mezzi: ({ scope }) => <MezziPageStructure mode="skeleton" scope={scope} />,
  documenti: ({ scope }) => <DocumentiPageStructure mode="skeleton" scope={scope} />,
  preventivi: ({ scope }) => <PreventiviPageStructure mode="skeleton" scope={scope} />,
  ordini_fornitori: ({ scope }) => (
    <OrdiniFornitoriPageStructure mode="skeleton" scope={scope} />
  ),
  lavorazioni: ({ scope }) => <LavorazioniPageStructure mode="skeleton" scope={scope} />,
  report: ({ className, scope }) => <ReportPageStructure mode="skeleton" scope={scope ?? "full"} className={className} />,
  agenda: ({ scope }) => <AgendaPageStructure mode="skeleton" scope={scope} />,
  dipendenti: ({ scope }) => <DipendentiPageStructure mode="skeleton" scope={scope} />,
  fatturazione: ({ scope }) => <FatturazionePageStructure mode="skeleton" scope={scope} />,
  impostazioni: ({ scope }) => <ImpostazioniPageStructure mode="skeleton" scope={scope} />,
  sicurezza: ({ scope }) => <SicurezzaPageStructure mode="skeleton" scope={scope} />,
  "production-readiness": ({ scope }) => (
    <ProductionReadinessPageStructure mode="skeleton" scope={scope} />
  ),
  clienti: ({ scope }) => <ClientiPageStructure mode="skeleton" scope={scope} />,
  "client-detail": ({ scope }) => <ClientDetailPageStructure mode="skeleton" scope={scope} />,
};

/** Skeleton body route — senza PageHeader (per Suspense sub-route). */
export const StructuralRouteSkeleton = memo(function StructuralRouteSkeleton({
  route,
  className = "",
  scope = "full",
}: StructuralRouteSkeletonProps) {
  const render = ROUTE_PAGE_STRUCTURE[route];
  return <>{render({ className, scope })}</>;
});
