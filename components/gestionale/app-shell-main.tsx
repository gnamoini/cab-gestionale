"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  dsGestionaleContentMax,
  dsGestionaleContentRail,
} from "@/lib/ui/design-system";
import { layoutPageRoot, layoutResponsiveCoreScope } from "@/lib/ui/responsive-layout-core";
import { gestionaleShellContentGutterClass } from "@/lib/ui/gestionale-shell-layout";
import { dsGestionaleScrollEndPadFade } from "@/lib/ui/scroll-system";
import type { GestionaleShellTier } from "@/lib/ui/gestionale-shell-layout";
import type { RefObject } from "react";
import { PullToRefreshIndicator } from "@/components/gestionale/pull-to-refresh-indicator";
import { DeferredDataStaleBanner } from "@/components/gestionale/deferred-data-stale-banner";
import type { PullToRefreshPhase } from "@/lib/ui/pull-to-refresh-contract";

const DevAuditMounts = dynamic(
  () => import("@/components/gestionale/dev-audit-mounts").then((m) => m.DevAuditMounts),
  { ssr: false },
);
const ReactRenderAuditProfiler = dynamic(
  () =>
    import("@/components/gestionale/react-render-audit-profiler").then((m) => m.ReactRenderAuditProfiler),
  { ssr: false },
);
const PerformanceDiagnosticsOverlay = dynamic(
  () =>
    import("@/components/dev/performance-diagnostics-overlay").then((m) => m.PerformanceDiagnosticsOverlay),
  { ssr: false },
);

const showPerfDiagnostics =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS === "1";

export type AppShellMainProps = {
  children: React.ReactNode;
  shellColRef: RefObject<HTMLDivElement | null>;
  mainScrollRef: RefObject<HTMLElement | null>;
  pullContentRef: RefObject<HTMLDivElement | null>;
  pullToRefreshPhase?: PullToRefreshPhase;
  pullToRefreshProgress?: number;
  isCompactShell: boolean;
  shellTier: GestionaleShellTier;
  mainInert: boolean;
};

function AppShellMainInner({
  children,
  shellColRef,
  mainScrollRef,
  pullContentRef,
  pullToRefreshPhase = "idle",
  pullToRefreshProgress = 0,
  isCompactShell,
  shellTier,
  mainInert,
}: AppShellMainProps) {
  const pathname = usePathname();
  const suppressGlobalScrollEndPad = pathname.startsWith("/impostazioni");
  const contentGutter = gestionaleShellContentGutterClass(shellTier);
  const mainPad = isCompactShell ? "" : "pl-[4.25rem]";

  return (
    <div
      ref={shellColRef}
      className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-[var(--cab-sidebar-width-motion)] ease-out ${mainPad}`}
    >
      {process.env.NODE_ENV === "development" ? <DevAuditMounts /> : null}
      {showPerfDiagnostics ? <PerformanceDiagnosticsOverlay /> : null}

      <div
        className={dsGestionaleContentRail}
        {...(mainInert ? { inert: true as boolean, "aria-hidden": true } : {})}
      >
        <main
          ref={mainScrollRef}
          className={`gestionale-scroll-y gestionale-scrollbar relative w-full ${layoutResponsiveCoreScope} min-h-0 min-w-0 flex-1 pt-0 ${
            isCompactShell
              ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              : "pb-[max(1rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <DeferredDataStaleBanner />
          <PullToRefreshIndicator phase={pullToRefreshPhase} progress={pullToRefreshProgress} />
          <div ref={pullContentRef} className="min-h-full min-w-0 will-change-transform">
            <div className={`${dsGestionaleContentMax} ${layoutPageRoot} ${contentGutter}`}>
              {process.env.NODE_ENV === "development" ? (
                <ReactRenderAuditProfiler>{children}</ReactRenderAuditProfiler>
              ) : (
                children
              )}
              {!suppressGlobalScrollEndPad ? (
                <div aria-hidden className={dsGestionaleScrollEndPadFade} />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const AppShellMain = memo(AppShellMainInner);
