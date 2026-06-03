/**
 * Global Flex System — analisi statica className per rischio overflow flex.
 * SSOT allowlist: @/lib/ui/global-flex-system
 */
import {
  hasFlexContainmentMarker,
  hasFlexOverflowAllowlistToken,
} from "@/lib/ui/global-flex-system";

export const FLEX_SYSTEM_LINT_MESSAGE = "[flex-system] potential overflow risk detected";

export type FlexOverflowRiskReason =
  | "flex-grow-without-containment"
  | "toolbar-without-containment";

export type FlexOverflowRisk = {
  reason: FlexOverflowRiskReason;
  message: string;
};

function hasToolbarKeyword(className: string): boolean {
  return /toolbar|search|filter/i.test(className);
}

/** Analizza una stringa className; ritorna motivo se rischio overflow, altrimenti null. */
export function analyzeClassNameForFlexOverflowRisk(className: string): FlexOverflowRisk | null {
  if (!className.trim()) return null;

  if (hasFlexOverflowAllowlistToken(className)) return null;

  const hasFlexGrow = /\bflex-1\b|\bgrow\b/.test(className);
  const hasKanbanBreakpointPair = /\blg:flex-1\b/.test(className) && /\blg:min-w-0\b/.test(className);

  if (hasFlexGrow && !hasKanbanBreakpointPair && !hasFlexContainmentMarker(className)) {
    return {
      reason: "flex-grow-without-containment",
      message: FLEX_SYSTEM_LINT_MESSAGE,
    };
  }

  if (
    hasToolbarKeyword(className) &&
    !/\bmin-w-0\b/.test(className) &&
    !hasFlexContainmentMarker(className) &&
    !className.includes("dsPageToolbar") &&
    !className.includes("flex-safe")
  ) {
    return {
      reason: "toolbar-without-containment",
      message: FLEX_SYSTEM_LINT_MESSAGE,
    };
  }

  return null;
}
