/**
 * Design System Lock — pattern vietati (lint-time).
 */

import type { DesignSystemRuleId } from "@/lib/ui-design-system-lock/ds-enforcement-rules";

export type ForbiddenPatternSeverity = "blocker" | "warning";

export type ForbiddenPattern = {
  id: DesignSystemRuleId;
  severity: ForbiddenPatternSeverity;
  message: string;
  /** Scope file path glob-like substrings; empty = all */
  fileScope: string[];
  /** Skip if file path includes any */
  fileExclude: string[];
};

export const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  {
    id: "flex-no-containment",
    severity: "blocker",
    message: "flex-1/grow without min-w-0 or flex-safe containment",
    fileScope: [],
    fileExclude: ["lavorazioni-kanban-view"],
  },
  {
    id: "toolbar-sticky",
    severity: "blocker",
    message: "toolbar must not use sticky top-* (use PageToolbar/dsPageToolbar)",
    fileScope: ["-view.tsx", "toolbar", "ToolbarGroup", "PageToolbar"],
    fileExclude: ["global-table", "gestionale-list-table.css", "app-shell.tsx"],
  },
  {
    id: "toolbar-deprecated",
    severity: "blocker",
    message: "dsStickyToolbar is deprecated — use dsPageToolbar",
    fileScope: [],
    fileExclude: [],
  },
  {
    id: "table-prev-token",
    severity: "blocker",
    message: "prevTableTd forbidden — use gestionaleListTableTd",
    fileScope: ["components/gestionale/"],
    fileExclude: [],
  },
  {
    id: "table-deprecated-head",
    severity: "blocker",
    message: "dsTableHead* deprecated — use GlobalTableSortTh",
    fileScope: ["-view.tsx"],
    fileExclude: ["components/report/"],
  },
  {
    id: "table-text-sm",
    severity: "warning",
    message: "dense lists must not use text-sm on table — use globalTableFixed (13px)",
    fileScope: ["components/gestionale/", "-view.tsx"],
    fileExclude: ["components/report/", "lavorazioni-kanban"],
  },
  {
    id: "flex-wrap-unscoped",
    severity: "warning",
    message: "flex-wrap on non-allowlisted wrapper",
    fileScope: [],
    fileExclude: ["toolbar-group.tsx", "design-system.ts", "lavorazioni-kanban"],
  },
  {
    id: "toolbar-missing-flex-safe-row",
    severity: "warning",
    message: "toolbar row missing flex-safe-row",
    fileScope: ["toolbar-group.tsx", "page-toolbar.tsx"],
    fileExclude: [],
  },
  {
    id: "modal-custom-shell",
    severity: "warning",
    message: "dialog must use Modal or LavorazioniModalShell tokens",
    fileScope: [],
    fileExclude: ["modal.tsx", "lavorazioni-modals.tsx", "gestionale-modal.tsx"],
  },
];

/** Regex / substring matchers per rule id. */
export const PATTERN_MATCHERS: Record<
  DesignSystemRuleId,
  { testLine: (line: string, className?: string) => boolean; testClassName?: (cls: string) => boolean }
> = {
  "flex-no-containment": {
    testLine: (line) => /\bflex-1\b|\bgrow\b/.test(line),
    testClassName: (cls) => /\bflex-1\b|\bgrow\b/.test(cls),
  },
  "toolbar-sticky": {
    testLine: (line) => /\bsticky\s+top-/.test(line),
  },
  "toolbar-deprecated": {
    testLine: (line) => /\bdsStickyToolbar\b/.test(line),
  },
  "table-prev-token": {
    testLine: (line) => /\bprevTableTd\b/.test(line),
  },
  "table-deprecated-head": {
    testLine: (line) => /\bdsTableHead\b|\bdsTableSortTh\b|\bdsTableHeadCell\b/.test(line),
  },
  "table-text-sm": {
    testLine: (line) => /<table[^>]*className=[^>]*\btext-sm\b/.test(line.replace(/\s+/g, " ")),
  },
  "flex-wrap-unscoped": {
    testLine: (line) => /\bflex-wrap\b/.test(line) && !/sm:flex-wrap|md:flex-wrap|lg:flex-wrap/.test(line),
    testClassName: (cls) => /\bflex-wrap\b/.test(cls) && !/sm:flex-wrap|md:flex-wrap|lg:flex-wrap/.test(cls),
  },
  "toolbar-missing-flex-safe-row": {
    testLine: (line) =>
      /ToolbarGroupPrimaryRow|ToolbarGroupMetaRow|ToolbarGroupUtilityRow/.test(line) &&
      !/flex-safe-row/.test(line),
  },
  "modal-custom-shell": {
    testLine: (line) =>
      /role=["']dialog["']/.test(line) &&
      !/dsModalPanel|LavorazioniModalShell|GestionaleModalShell|dsLavorazioniModalDialog/.test(line),
  },
  "toolbar-without-containment": {
    testLine: (line) => /(toolbar|search|filter)/i.test(line),
    testClassName: (cls) => /(toolbar|search|filter)/i.test(cls),
  },
  "modal-footer-alignment": {
    testLine: () => false,
  },
  "table-padding-override": {
    testLine: (line) =>
      /<(th|td)[^>]*className=[^>]*(py-\d|px-\d|p-\d)/.test(line.replace(/\s+/g, " ")),
  },
};

export function patternMatchesFile(pattern: ForbiddenPattern, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (pattern.fileExclude.some((s) => normalized.includes(s))) return false;
  if (pattern.fileScope.length === 0) return true;
  return pattern.fileScope.some((s) => normalized.includes(s));
}
