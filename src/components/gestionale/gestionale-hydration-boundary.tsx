"use client";

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";
import { CAB_COLD_START_MARK } from "@/lib/observability/cold-start-mark-names";
import { lazyMarkColdStart } from "@/lib/observability/cold-start-diagnostics-lazy";
import {
  exposeNavigationBootTimeline,
  markNavigationBoot,
} from "@/lib/observability/navigation-boot-timeline";

type Props = {
  state: DehydratedState;
  children: ReactNode;
  /** Distinguish layout vs page hydration in timeline. */
  boundary?: "layout" | "page";
};

/** Bridge dehydrate server → React Query client hooks. */
export function GestionaleHydrationBoundary({ state, children, boundary = "page" }: Props) {
  useLayoutEffect(() => {
    lazyMarkColdStart(CAB_COLD_START_MARK.hydrationStart);
  }, [boundary]);

  useEffect(() => {
    lazyMarkColdStart(CAB_COLD_START_MARK.hydrationEnd);
    if (!isNavigationBootDiagnosticsEnabled()) return;
    markNavigationBoot("hydration_boundary_apply", { boundary });
    markNavigationBoot("first_route_render", { boundary });
    exposeNavigationBootTimeline();
  }, [boundary, state]);

  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
