/** ESLint adapter — Global Flex System (baseline-aware) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FLEX_SYSTEM_LINT_MESSAGE = "[flex-system] potential overflow risk detected";

const dir = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(dir, "..", ".eslint-flex-baseline.json");

/** @type {{ version: number; entries: { file: string; line: number; reason: string }[] }} */
let baselineData = { version: 1, entries: [] };

try {
  baselineData = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch {
  /* empty */
}

const STRICT = process.env.CAB_FLEX_BASELINE_STRICT === "1";

const CONTAINMENT_MARKERS = [
  "min-w-0", "flex-fill", "flex-fill-safe", "flex-safe", "flex-safe-row",
  "flex-safe-col", "flex-safe-item", "text-safe",
];

const ALLOWLIST_TOKENS = [
  "globalTableWrap", "dsModalPanel", "dsLavorazioniModalDialog",
  "gestionaleModalBodyFlexClass", "dsScrollPanel", "layoutModalBodySafe",
  "layoutFlexColSafe", "layoutFlexSafe", "layoutFlexChildSafe",
  "dsPageToolbar", "ToolbarGroup",
];

const FILE_LINE_ALLOWLIST = [
  {
    path: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx",
    pattern: /lg:flex-1/,
  },
];

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function toRepoRelativePath(filePath) {
  const f = normalizePath(filePath);
  for (const marker of ["/components/", "/app/"]) {
    const idx = f.indexOf(marker);
    if (idx >= 0) return f.slice(idx + 1);
  }
  if (f.startsWith("components/") || f.startsWith("app/")) return f;
  return f;
}

function isInBaseline(file, line, reason) {
  if (STRICT) return false;
  const f = toRepoRelativePath(file);
  return baselineData.entries.some(
    (e) => normalizePath(e.file) === f && e.line === line && e.reason === reason,
  );
}

function isLineFileAllowlisted(filePath, lineContent) {
  const f = toRepoRelativePath(filePath);
  return FILE_LINE_ALLOWLIST.some((a) => f === a.path && a.pattern.test(lineContent));
}

function hasContainment(cls) {
  return CONTAINMENT_MARKERS.some((m) => cls.includes(m));
}

function hasAllowlistToken(cls) {
  return ALLOWLIST_TOKENS.some((t) => cls.includes(t));
}

function analyzeClassName(cls) {
  if (!cls.trim()) return null;
  if (hasAllowlistToken(cls)) return null;

  const hasFlexGrow = /\bflex-1\b|\bgrow\b/.test(cls);
  const hasKanbanPair = /\blg:flex-1\b/.test(cls) && /\blg:min-w-0\b/.test(cls);

  if (hasFlexGrow && !hasKanbanPair && !hasContainment(cls)) {
    return { reason: "flex-grow-without-containment" };
  }

  if (
    /(toolbar|search|filter)/i.test(cls) &&
    !/\bmin-w-0\b/.test(cls) &&
    !hasContainment(cls) &&
    !cls.includes("dsPageToolbar") &&
    !cls.includes("flex-safe")
  ) {
    return { reason: "toolbar-without-containment" };
  }

  return null;
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

function reportIfViolation(context, node, filePath, line, hit) {
  if (!hit || isInBaseline(filePath, line, hit.reason)) return;
  context.report({
    node,
    messageId: "flexOverflow",
  });
}

/** @type {import('eslint').Rule.RuleModule} */
export const noFlexOverflowRisk = {
  meta: {
    type: "problem",
    docs: {
      description: "Global Flex System — flag flex overflow risk (baseline-grandfathered)",
    },
    schema: [],
    messages: {
      flexOverflow: FLEX_SYSTEM_LINT_MESSAGE,
    },
  },
  create(context) {
    const filePath = toRepoRelativePath(context.filename ?? context.getFilename?.() ?? "");
    const sourceCode = context.sourceCode ?? context.getSourceCode?.();

    return {
      JSXAttribute(node) {
        if (node.name.name !== "className") return;
        const line = node.loc?.start?.line ?? 0;
        let lineContent = "";
        if (sourceCode?.lines?.[line - 1]) {
          lineContent = sourceCode.lines[line - 1];
        } else if (sourceCode?.getText) {
          const lines = sourceCode.getText().split("\n");
          lineContent = lines[line - 1] ?? "";
        }
        if (isLineFileAllowlisted(filePath, lineContent)) return;

        const classStrings = extractClassStrings(node.value);
        for (const cls of classStrings) {
          const hit = analyzeClassName(cls);
          if (hit) {
            reportIfViolation(context, node, filePath, line, hit);
            return;
          }
        }
      },
    };
  },
};
