"use client";

/**
 * UI OS Backward Adapter — Phase 2 gated opt-in wrapper.
 *
 * Stable UIRenderer tree for opt-in pages (no remount on gate flip).
 * `primary` controls OS activation metadata; shells use `display: contents`.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getPageUIMode } from "@/lib/ui-os/ui-os-engine";
import { UiOsErrorBoundary } from "@/lib/ui-os/ui-os-error-boundary";
import { UIRenderer, type UIRendererSlots } from "@/lib/ui-os/ui-renderer";
import {
  runUIOsValidationPipeline,
  type UIOsRenderDecision,
} from "@/lib/ui-os/ui-render-decision";
import { getSuggestedSchema, type UIPageMode, type UIPageSchema } from "@/lib/ui-os/ui-schema";
import { useUIOsPhase2 } from "@/lib/ui-os/use-ui-os-phase2";

export type UIPageFallbackMode = "legacy";

export type UIPageAdapterProps = {
  page?: string;
  /** @deprecated Use `page`. */
  pageId?: string;
  schema?: UIPageSchema;
  mode?: UIPageMode;
  fallback?: UIPageFallbackMode;
  slots?: UIRendererSlots;
  children: ReactNode;
};

function resolvePageId(props: UIPageAdapterProps): string {
  return props.page ?? props.pageId ?? "/";
}

function isOsEligible(pageId: string, mode: UIPageMode, schema: UIPageSchema | undefined): boolean {
  if (process.env.NEXT_PUBLIC_CAB_UI_OS !== "1") return false;
  if (mode !== "os") return false;
  if (getPageUIMode(pageId) !== "os") return false;
  if (!schema) return false;
  return true;
}

export function UIPageAdapter(props: UIPageAdapterProps) {
  const { schema: schemaProp, mode: modeProp, slots, children } = props;
  const pageId = resolvePageId(props);
  const effectiveMode = modeProp ?? getPageUIMode(pageId);

  const schema = useMemo(
    () => schemaProp ?? getSuggestedSchema(pageId),
    [schemaProp, pageId],
  );

  const [decision, setDecision] = useState<UIOsRenderDecision | null>(null);
  const eligible = isOsEligible(pageId, effectiveMode, schema);

  useEffect(() => {
    if (!eligible) {
      setDecision(null);
      return;
    }

    function evaluate() {
      const main = typeof document !== "undefined" ? document.querySelector(".cab-app-shell main") : null;
      setDecision(runUIOsValidationPipeline(pageId, schema, main, effectiveMode));
    }

    evaluate();
    const timer = setTimeout(evaluate, 450);
    return () => clearTimeout(timer);
  }, [eligible, pageId, schema, effectiveMode]);

  useUIOsPhase2(pageId, schema, effectiveMode, [decision?.driftScore, decision?.primary]);

  if (!eligible) {
    return <>{children}</>;
  }

  const primary = decision?.primary ?? "legacy";

  return (
    <UiOsErrorBoundary pageId={pageId} fallback={children}>
      <UIRenderer
        schema={schema}
        pageId={pageId}
        primary={primary}
        slots={{ ...slots, children: slots?.children ?? children }}
      />
    </UiOsErrorBoundary>
  );
}
