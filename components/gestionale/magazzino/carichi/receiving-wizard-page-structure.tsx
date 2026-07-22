import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";
import { SkeletonShellCard } from "@/components/design-system/loading/skeleton-shell-card";
import { SKELETON_MIN_HEIGHT } from "@/components/design-system/loading/skeleton-layout-presets";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export function ReceivingWizardPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  if (mode !== "skeleton") return null;

  return (
    <div
      className={`${layoutPageRoot} ${dsStackPage} min-w-0`}
      role="status"
      aria-label="Caricamento wizard carico DDT"
      data-testid="receiving-wizard-route-skeleton"
    >
      <div className="space-y-2">
        <SkeletonBlock minHeightClass="min-h-7" className="w-full max-w-xs" />
        <SkeletonBlock minHeightClass="min-h-4" className="w-full max-w-md" />
      </div>

      <SkeletonBlock minHeightClass="min-h-10" className="w-full" />

      <SkeletonShellCard bodyMinHeightClass="min-h-[16rem]" />

      <div className="flex justify-end gap-2 pt-2">
        <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.tabBar} className="w-24" />
        <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.tabBar} className="w-28" />
      </div>
    </div>
  );
}
