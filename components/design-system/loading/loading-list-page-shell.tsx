
import { memo, type ReactNode } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

/** Stack lista gestionale — allineato a `dsStackPage`. */
export const gestionaleListPageStackClass = dsStackPage;

export type LoadingListPageShellProps = {
  children: ReactNode;
  className?: string;
  /** Header pagina (h-14 pulse). */
  withPageHeader?: boolean;
  ariaLabel?: string;
};

export const LoadingListPageShell = memo(function LoadingListPageShell({
  children,
  className = "",
  withPageHeader = false,
  ariaLabel = "Caricamento pagina",
}: LoadingListPageShellProps) {
  return (
    <div
      className={`${gestionaleListPageStackClass} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {withPageHeader ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      {children}
    </div>
  );
});
