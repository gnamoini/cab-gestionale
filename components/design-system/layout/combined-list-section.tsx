import type { ReactNode } from "react";
import type { SkeletonContract, SkeletonGeometryToken, SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { COMBINED_LIST_SKELETON_CONTRACT } from "@/lib/ui/structural-route-skeleton-contracts";
import { PageSection } from "./page-section";

export type CombinedListSectionProps = {
  children?: ReactNode;
  mode?: SkeletonMode;
  className?: string;
  sectionLabel?: string;
  ariaLabel?: string;
  skeleton?: SkeletonContract;
};

/** Pattern liste ERP: toolbar + tabella in ShellCard (magazzino, mezzi, documenti, preventivi). */
export function CombinedListSection({
  children,
  mode = "content",
  className = "",
  sectionLabel,
  ariaLabel,
  skeleton,
}: CombinedListSectionProps) {
  const base = skeleton ?? COMBINED_LIST_SKELETON_CONTRACT;
  return (
    <PageSection
      mode={mode}
      className={className}
      ariaLabel={ariaLabel}
      skeleton={{
        ...base,
        sectionLabel: sectionLabel ?? base.sectionLabel,
      }}
    >
      {children}
    </PageSection>
  );
}

export { COMBINED_LIST_SKELETON_CONTRACT as combinedListSkeletonContract };

export type ErpTableSectionProps = {
  children?: ReactNode;
  mode?: SkeletonMode;
  className?: string;
  geometry?: Extract<SkeletonGeometryToken, "table" | "table-documenti" | "table-compact">;
  ariaLabel?: string;
};

/** Area tabella ERP — primo fetch con toolbar già visibile. */
export function ErpTableSection({
  children,
  mode = "content",
  className = "",
  geometry = "table",
  ariaLabel = "Caricamento tabella",
}: ErpTableSectionProps) {
  return (
    <PageSection
      mode={mode}
      className={className}
      ariaLabel={ariaLabel}
      skeleton={{
        kind: "table",
        geometry: { height: geometry, width: "full" },
      }}
    >
      {children}
    </PageSection>
  );
}
