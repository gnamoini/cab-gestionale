import type { MigratedStructuralRoute } from "@/lib/ui/migrated-structural-routes";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";
import { StructuralRouteSkeleton } from "./structural-route-skeleton";

/** Min-height body per route — parity con loading.tsx / LoadingSuspenseFallback. */
const VARIANT_MIN_HEIGHT: Partial<Record<MigratedStructuralRoute, string>> = {
  dashboard: SKELETON_MIN_HEIGHT.kpiRow,
  magazzino: SKELETON_MIN_HEIGHT.tableDesktop,
  lavorazioni: SKELETON_MIN_HEIGHT.tableDesktop,
  mezzi: SKELETON_MIN_HEIGHT.tableDesktop,
  documenti: SKELETON_MIN_HEIGHT.tableDocumenti,
  preventivi: SKELETON_MIN_HEIGHT.tableDesktop,
  ordini_fornitori: SKELETON_MIN_HEIGHT.tableDesktop,
  fatturazione: SKELETON_MIN_HEIGHT.tableDesktop,
  dipendenti: SKELETON_MIN_HEIGHT.tableDesktop,
  report: SKELETON_MIN_HEIGHT.tableDesktop,
  impostazioni: SKELETON_MIN_HEIGHT.settingsContent,
  clienti: SKELETON_MIN_HEIGHT.tableDesktop,
  "client-detail": SKELETON_MIN_HEIGHT.tableCompact,
  sicurezza: SKELETON_MIN_HEIGHT.sicurezzaPanel,
  "production-readiness": SKELETON_MIN_HEIGHT.productionReadinessCard,
  agenda: SKELETON_MIN_HEIGHT.agendaMain,
};

export type PageTransitionLoaderProps = {
  variant: MigratedStructuralRoute;
};

/**
 * Fallback Suspense LEVEL 2 — structural skeleton body (no spinner).
 * RSC-safe: zero hook, zero client boundary.
 */
export function PageTransitionLoader({ variant }: PageTransitionLoaderProps) {
  const minHeight = VARIANT_MIN_HEIGHT[variant] ?? SKELETON_MIN_HEIGHT.tableDesktop;
  return (
    <div data-testid="page-transition-loader" role="status" aria-label="Caricamento pagina">
      <StructuralRouteSkeleton route={variant} className={minHeight} />
    </div>
  );
}
