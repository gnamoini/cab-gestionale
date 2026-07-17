
import { memo, type CSSProperties } from "react";
import { dsSurfacePanel } from "@/lib/ui/design-system";
import { loadingSkeletonPulseClass } from "./loading-tokens";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

const skeletonBusyProps = {
  "aria-busy": true as const,
  "aria-hidden": true as const,
};

export type SkeletonBlockProps = {
  className?: string;
  style?: CSSProperties;
  minHeightClass?: string;
};

/** Rettangolo unico — nessun dettaglio interno simulato. */
export const SkeletonBlock = memo(function SkeletonBlock({
  className = "",
  style,
  minHeightClass = "",
}: SkeletonBlockProps) {
  return (
    <div
      className={`${loadingSkeletonPulseClass} min-w-0 rounded-[var(--ds-radius-lg)] ${minHeightClass} ${className}`.trim()}
      style={style}
      {...skeletonBusyProps}
    />
  );
});

export type SkeletonCardProps = {
  minHeightClass?: string;
  className?: string;
};

/** Card / widget: un solo contenitore con superficie panel. */
export const SkeletonCard = memo(function SkeletonCard({
  minHeightClass = SKELETON_MIN_HEIGHT.cardWidget,
  className = "",
}: SkeletonCardProps) {
  return (
    <div
      className={`${dsSurfacePanel} min-w-0 p-0 ${minHeightClass} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <SkeletonBlock className="h-full min-h-[inherit] w-full rounded-[inherit]" />
    </div>
  );
});

export type SkeletonTableProps = {
  minHeightClass?: string;
  visibilityClass?: string;
  className?: string;
  wrapClassName?: string;
};

/** Area tabella: box bordato senza righe/colonne simulate. */
export const SkeletonTable = memo(function SkeletonTable({
  minHeightClass = SKELETON_MIN_HEIGHT.tableDesktop,
  visibilityClass = "",
  className = "",
  wrapClassName = "",
}: SkeletonTableProps) {
  return (
    <div
      className={`${wrapClassName} ${visibilityClass}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento tabella"
    >
      <div
        className={`overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] ${minHeightClass} ${className}`.trim()}
        aria-hidden
      >
        <SkeletonBlock className="h-full min-h-[inherit] w-full rounded-none" />
      </div>
    </div>
  );
});

export type SkeletonChartProps = {
  minHeightClass?: string;
  wide?: boolean;
  className?: string;
};

/** Area grafico / analytics. */
export const SkeletonChart = memo(function SkeletonChart({
  minHeightClass,
  wide = false,
  className = "",
}: SkeletonChartProps) {
  const h = minHeightClass ?? (wide ? SKELETON_MIN_HEIGHT.chartWide : SKELETON_MIN_HEIGHT.chart);
  return (
    <div className={`${dsSurfacePanel} min-w-0 overflow-hidden p-0 ${h} ${className}`.trim()} role="status" aria-busy="true">
      <SkeletonBlock className="h-full min-h-[inherit] w-full rounded-[inherit]" />
    </div>
  );
});

export type SkeletonFormProps = {
  sections?: number;
  minHeightClass?: string;
  className?: string;
};

/** Form / pannello impostazioni: blocchi verticali senza campi simulati. */
export const SkeletonForm = memo(function SkeletonForm({
  sections = 2,
  minHeightClass = SKELETON_MIN_HEIGHT.settingsContent,
  className = "",
}: SkeletonFormProps) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${minHeightClass} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento modulo"
    >
      {Array.from({ length: sections }).map((_, i) => (
        <SkeletonBlock key={i} className="min-h-[6rem] w-full" />
      ))}
    </div>
  );
});

export type SkeletonModalSize = "md" | "lg";

export type SkeletonModalProps = {
  size?: SkeletonModalSize;
  className?: string;
};

export const SkeletonModal = memo(function SkeletonModal({
  size = "md",
  className = "",
}: SkeletonModalProps) {
  const h = size === "lg" ? SKELETON_MIN_HEIGHT.modalLg : SKELETON_MIN_HEIGHT.modalMd;
  return (
    <div className={`mx-auto w-full max-w-2xl ${className}`.trim()} role="status" aria-busy="true">
      <SkeletonCard minHeightClass={h} />
    </div>
  );
});

export type SkeletonDashboardWidgetVariant = "promemoria" | "kpi" | "feed" | "welcome";

export type SkeletonDashboardWidgetProps = {
  variant?: SkeletonDashboardWidgetVariant;
  className?: string;
};

const WIDGET_HEIGHT: Record<SkeletonDashboardWidgetVariant, string> = {
  promemoria: SKELETON_MIN_HEIGHT.cardPromemoria,
  kpi: SKELETON_MIN_HEIGHT.cardWidgetSm,
  feed: SKELETON_MIN_HEIGHT.cardWidget,
  welcome: "min-h-[7.5rem]",
};

export const SkeletonDashboardWidget = memo(function SkeletonDashboardWidget({
  variant = "feed",
  className = "",
}: SkeletonDashboardWidgetProps) {
  return <SkeletonCard minHeightClass={WIDGET_HEIGHT[variant]} className={className} />;
});
