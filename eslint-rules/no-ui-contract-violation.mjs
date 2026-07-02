/** ESLint adapter — Design System Lock (baseline-aware) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DS_LOCK_LINT_MESSAGE = "[design-system-lock] violation detected";

const dir = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(dir, "..", "lib", "ui-design-system-lock", "ds-lock-baseline.json");

/** @type {{ version: number; entries: { file: string; line: number; rule: string }[] }} */
let baselineData = { version: 1, entries: [] };

try {
  baselineData = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch {
  /* empty */
}

const STRICT = process.env.CAB_DS_LOCK_STRICT === "1";

const CONTAINMENT_MARKERS = [
  "min-w-0", "flex-fill", "flex-fill-safe", "flex-safe", "flex-safe-row",
  "flex-safe-col", "flex-safe-item", "text-safe", "layoutFlexFill", "layoutFlexSafe",
  "layoutFlexColSafe", "layoutFlexChildSafe", "gestionaleModalBodyFlexClass",
  "dsScrollPanel", "layoutModalBodySafe",
];

const ALLOWLIST_TOKENS = [
  "globalTableWrap", "dsModalPanel", "dsLavorazioniModalDialog",
  "gestionaleModalBodyFlexClass", "dsScrollPanel", "layoutModalBodySafe",
  "layoutFlexColSafe", "layoutFlexSafe", "layoutFlexChildSafe",
  "dsPageToolbar", "ToolbarGroup", "lavorazioni-kanban", "recharts", "ReportKpiGrid",
];

const FILE_ALLOWLIST = [
  "global-table", "gestionale-list-table.css", "lavorazioni-scroll.css",
  "lavorazioni-kanban-view", "components/report/", "preventivi-editor-modal",
  "sistema-impostazioni-modal", "report-magazzino-section",
];

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function isInBaseline(file, line, rule) {
  if (STRICT) return false;
  const f = normalizePath(file);
  return baselineData.entries.some(
    (e) => normalizePath(e.file) === f && e.line === line && e.rule === rule,
  );
}

function isFileAllowlisted(filePath) {
  const f = normalizePath(filePath);
  return FILE_ALLOWLIST.some((s) => f.includes(s));
}

function hasContainment(cls) {
  return CONTAINMENT_MARKERS.some((m) => cls.includes(m));
}

function hasAllowlistToken(cls) {
  return ALLOWLIST_TOKENS.some((t) => cls.includes(t));
}

function extractClassStrings(node) {
  const out = [];
  if (!node) return out;
  if (node.type === "Literal" && typeof node.value === "string") {
    out.push(node.value);
    return out;
  }
  if (node.type === "TemplateLiteral") {
    let combined = "";
    for (let i = 0; i < node.quasis.length; i++) {
      combined += node.quasis[i].value.cooked ?? "";
      if (i < node.expressions.length) {
        const expr = node.expressions[i];
        if (expr.type === "Literal" && typeof expr.value === "string") combined += expr.value;
        else if (expr.type === "Identifier") combined += expr.name;
      }
    }
    out.push(combined);
    return out;
  }
  if (node.type === "JSXExpressionContainer") return extractClassStrings(node.expression);
  if (node.type === "BinaryExpression" && node.operator === "+") {
    return [...extractClassStrings(node.left), ...extractClassStrings(node.right)];
  }
  return out;
}

function analyzeClassName(cls, filePath) {
  if (!cls.trim() || hasAllowlistToken(cls) || isFileAllowlisted(filePath)) return null;

  if (/\bdsStickyToolbar\b/.test(cls)) {
    return { rule: "toolbar-deprecated", detail: "dsStickyToolbar is deprecated — use dsPageToolbar" };
  }

  if (/\bsticky\s+top-/.test(cls)) {
    return { rule: "toolbar-sticky", detail: "toolbar must not use sticky top-*" };
  }

  const hasFlexGrow = /\bflex-1\b|\bgrow\b/.test(cls);
  const hasKanbanPair = /\blg:flex-1\b/.test(cls) && /\blg:min-w-0\b/.test(cls);
  if (hasFlexGrow && !hasKanbanPair && !hasContainment(cls)) {
    return { rule: "flex-no-containment", detail: "flex-1/grow without min-w-0 or flex-safe containment" };
  }

  if (/(toolbar|search|filter)/i.test(cls) && !/\bmin-w-0\b/.test(cls) && !hasContainment(cls)) {
    if (!cls.includes("dsPageToolbar") && !cls.includes("flex-safe")) {
      return { rule: "toolbar-without-containment", detail: "toolbar/search missing containment" };
    }
  }

  if (/\bprevTableTd\b/.test(cls)) {
    return { rule: "table-prev-token", detail: "prevTableTd forbidden — use gestionaleListTableTd" };
  }

  if (/\bdsTableHead\b|\bdsTableSortTh\b|\bdsTableHeadCell\b/.test(cls)) {
    return { rule: "table-deprecated-head", detail: "dsTableHead* deprecated — use GlobalTableSortTh" };
  }

  if (/\bflex-wrap\b/.test(cls) && !/sm:flex-wrap|md:flex-wrap|lg:flex-wrap|xl:flex-wrap/.test(cls)) {
    if (!cls.includes("flex-col") && !filePath.includes("toolbar-group")) {
      return { rule: "flex-wrap-unscoped", detail: "unscoped flex-wrap on wrapper" };
    }
  }

  return null;
}

function reportIfViolation(context, node, filePath, line, hit) {
  if (!hit || isInBaseline(filePath, line, hit.rule)) return;
  context.report({
    node,
    messageId: "violation",
    data: { detail: hit.detail },
  });
}

/** @type {import('eslint').Rule.RuleModule} */
export const noUiContractViolation = {
  meta: {
    type: "problem",
    docs: {
      description: "Design System Lock — enforce UI component contracts",
    },
    schema: [],
    messages: {
      violation: `${DS_LOCK_LINT_MESSAGE}: {{detail}}`,
    },
  },
  create(context) {
    const filePath = normalizePath(context.filename ?? context.getFilename?.() ?? "");

    return {
      JSXAttribute(node) {
        if (node.name.name !== "className") return;
        const line = node.loc?.start?.line ?? 0;
        const classStrings = extractClassStrings(node.value);
        for (const cls of classStrings) {
          const hit = analyzeClassName(cls, filePath);
          if (hit) {
            reportIfViolation(context, node, filePath, line, hit);
            return;
          }
        }
      },
      Literal(node) {
        if (typeof node.value !== "string") return;
        const line = node.loc?.start?.line ?? 0;
        const parent = node.parent;
        if (parent?.type === "JSXAttribute") return;

        if (/\bsticky\s+top-/.test(node.value) && /-view\.tsx/.test(filePath) && !isFileAllowlisted(filePath)) {
          reportIfViolation(context, node, filePath, line, {
            rule: "toolbar-sticky",
            detail: "sticky top-* forbidden in views",
          });
        }

        if (/\bprevTableTd\b/.test(node.value) && filePath.includes("components/gestionale/")) {
          reportIfViolation(context, node, filePath, line, {
            rule: "table-prev-token",
            detail: "prevTableTd forbidden",
          });
        }
      },
    };
  },
};
