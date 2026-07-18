/**
 * AST scan tooltip UX — inventario repo-wide.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { scanNativeTitleInSource } from "@/lib/lint/rules/native-title-tooltip";
import {
  classifyTooltipVerdict,
  inferDynamicTooltipNecessity,
  tooltipNecessityScore,
  type TooltipVerdict,
  type TooltipTriggerContext,
} from "@/lib/ui/tooltip-value-score";

export type TooltipAuditEntry = {
  file: string;
  line: number;
  route: string;
  component: string;
  element: string;
  visibleText: string;
  tooltipText: string;
  verdict: TooltipVerdict;
  source: string;
  necessityScore?: number;
  necessityRationale?: string;
  recommendedAction?: "KEEP" | "REMOVE" | "REVIEW";
};

export type TooltipAuditSummary = Record<TooltipVerdict | "TOTAL", number>;

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);
const SCAN_ROOTS = ["components", "app"];
const EXT = new Set([".ts", ".tsx"]);

const NON_HOVER_TITLE_COMPONENTS = new Set([
  "Drawer",
  "GestionaleModalShell",
  "Modal",
  "HealthScoreCard",
  "HealthScoreCardSkeleton",
  "HubModalPanoramicaFieldGroup",
  "GestionaleInfoCard",
  "ShellCard",
  "PageHeader",
  "FactorList",
  "Section",
  "EmbeddedModule",
]);

const ROUTE_RULES: { pattern: RegExp; route: string }[] = [
  { pattern: /components\/dashboard\//, route: "/dashboard" },
  { pattern: /components\/gestionale\/mezzi\//, route: "/mezzi" },
  { pattern: /components\/workshop-schedule\//, route: "/agenda" },
  { pattern: /components\/gestionale\/documenti\//, route: "/documenti" },
  { pattern: /components\/gestionale\/magazzino\//, route: "/magazzino" },
  { pattern: /components\/gestionale\/lavorazioni\//, route: "/lavorazioni" },
  { pattern: /components\/lavorazioni\//, route: "/lavorazioni" },
  { pattern: /components\/preventivi\//, route: "/preventivi" },
  { pattern: /components\/gestionale\/dipendenti\//, route: "/dipendenti" },
  { pattern: /components\/fatturazione\//, route: "/fatturazione" },
  { pattern: /components\/report\//, route: "/report" },
  { pattern: /components\/dashboard\/security\//, route: "/sicurezza" },
  { pattern: /dashboard\/settings\//, route: "/impostazioni" },
  { pattern: /impostazioni\//, route: "/impostazioni" },
  { pattern: /components\/ordini-fornitori\//, route: "/magazzino" },
  { pattern: /components\/data-import\//, route: "/impostazioni" },
  { pattern: /components\/document-capture\//, route: "/lavorazioni" },
  { pattern: /components\/lavorazioni-clienti\//, route: "/lavorazioni-clienti" },
  { pattern: /components\/ddt\//, route: "/magazzino" },
  { pattern: /app\/\(gestionale\)\/dashboard\//, route: "/dashboard" },
  { pattern: /app\/\(gestionale\)\/mezzi\//, route: "/mezzi" },
  { pattern: /app\/\(gestionale\)\/agenda\//, route: "/agenda" },
  { pattern: /app\/\(gestionale\)\/documenti\//, route: "/documenti" },
  { pattern: /app\/\(gestionale\)\/magazzino\//, route: "/magazzino" },
  { pattern: /app\/\(gestionale\)\/lavorazioni\//, route: "/lavorazioni" },
  { pattern: /app\/\(gestionale\)\/preventivi\//, route: "/preventivi" },
  { pattern: /app\/\(gestionale\)\/dipendenti\//, route: "/dipendenti" },
  { pattern: /app\/\(gestionale\)\/fatturazione\//, route: "/fatturazione" },
  { pattern: /app\/\(gestionale\)\/report\//, route: "/report" },
  { pattern: /app\/\(gestionale\)\/sicurezza\//, route: "/sicurezza" },
  { pattern: /app\/\(gestionale\)\/impostazioni\//, route: "/impostazioni" },
];

const PRIMITIVE_GENERATORS: { name: string; path: string; props: string[] }[] = [
  { name: "IconActionButton", path: "components/design-system/icon-action-button.tsx", props: ["label", "tooltipContent"] },
  { name: "IconButton", path: "components/design-system/icon-button.tsx", props: ["label", "title"] },
  { name: "ShellNavIconButton", path: "components/design-system/shell-nav-icon-button.tsx", props: ["label", "tooltipContent"] },
  { name: "CloseButton", path: "components/design-system/close-button.tsx", props: ["label", "title"] },
  { name: "ToolbarGroup", path: "components/design-system/toolbar-group.tsx", props: ["tooltip", "label"] },
  { name: "PageToolbar", path: "components/design-system/page-toolbar.tsx", props: ["title", "label"] },
  { name: "GestionaleRefreshToolbarButton", path: "components/gestionale/page-header-toolbar.tsx", props: ["label", "tip"] },
  { name: "PageActionMenu", path: "components/ui/page-action-menu/PageActionMenu.tsx", props: ["tooltip"] },
  { name: "PageActionMenuItem", path: "components/ui/page-action-menu/PageActionMenuItem.tsx", props: ["tooltip", "label"] },
  { name: "DisabledElementTooltip", path: "components/design-system/disabled-element-tooltip.tsx", props: ["content"] },
  { name: "TruncatedTextTooltip", path: "components/design-system/truncated-text-tooltip.tsx", props: ["text"] },
  { name: "OptionalTooltip", path: "components/design-system/optional-tooltip.tsx", props: ["content"] },
  { name: "Tooltip", path: "components/design-system/tooltip.tsx", props: ["content"] },
  { name: "GlobalTableSortTh", path: "components/gestionale/global-table/global-table-header.tsx", props: ["title", "label"] },
];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function rel(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

export function resolveRoute(fileRel: string): string {
  for (const { pattern, route } of ROUTE_RULES) {
    if (pattern.test(fileRel)) return route;
  }
  if (fileRel.includes("design-system")) return "/design-system";
  return "/shared";
}

function lineCol(sourceFile: ts.SourceFile, pos: number): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

function exprToString(expr: ts.Expression | undefined): { value: string; dynamic: boolean } {
  if (!expr) return { value: "", dynamic: true };
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { value: expr.text, dynamic: false };
  }
  if (ts.isIdentifier(expr)) {
    const name = expr.text;
    if (name === "undefined" || name === "null") return { value: "", dynamic: false };
    return { value: `{${name}}`, dynamic: true };
  }
  if (ts.isTemplateExpression(expr)) {
    return { value: expr.getText(), dynamic: true };
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return { value: expr.getText(), dynamic: true };
  }
  if (ts.isConditionalExpression(expr)) return { value: expr.getText(), dynamic: true };
  return { value: expr.getText().slice(0, 80), dynamic: true };
}

function getJsxAttr(
  attrs: ts.JsxAttributes,
  name: string,
): { expr?: ts.Expression; dynamic: boolean; value: string } | undefined {
  for (const p of attrs.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name) continue;
    if (!p.initializer) return { value: "", dynamic: false };
    if (ts.isStringLiteral(p.initializer)) return { value: p.initializer.text, dynamic: false };
    if (ts.isJsxExpression(p.initializer)) {
      const r = exprToString(p.initializer.expression);
      return { expr: p.initializer.expression, ...r };
    }
  }
  return undefined;
}

function collectVisibleText(node: ts.JsxElement | ts.JsxSelfClosingElement): {
  visible: string;
  ariaLabel: string;
  iconOnly: boolean;
} {
  let visible = "";
  let ariaLabel = "";
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const aria = getJsxAttr(opening.attributes, "aria-label");
  if (aria) ariaLabel = aria.value;

  function walkText(n: ts.Node) {
    if (ts.isJsxText(n)) {
      const t = n.getText().replace(/\s+/g, " ").trim();
      if (t && !n.parent || (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
        visible += (visible ? " " : "") + t;
      }
    }
    if (ts.isJsxExpression(n) && n.expression) {
      const r = exprToString(n.expression);
      if (!r.dynamic && r.value) visible += (visible ? " " : "") + r.value;
    }
    ts.forEachChild(n, walkText);
  }

  if (ts.isJsxElement(node)) {
    for (const child of node.children) walkText(child);
  }

  const hasSrOnly = node.getText().includes("sr-only");
  const trimmed = visible.trim();
  const iconOnly = !trimmed || (hasSrOnly && trimmed.length < 40);
  return { visible: trimmed, ariaLabel, iconOnly: iconOnly && !trimmed };
}

function pushEntry(
  entries: TooltipAuditEntry[],
  opts: {
    fileRel: string;
    line: number;
    element: string;
    visibleText: string;
    tooltipText: string;
    source: string;
    context?: TooltipTriggerContext;
    dynamic?: boolean;
  },
) {
  const { fileRel, line, element, visibleText, tooltipText, source, context = {}, dynamic } = opts;
  const ctx: TooltipTriggerContext = {
    ...context,
    visibleText: context.visibleText ?? visibleText,
    dynamic: dynamic ?? context.dynamic,
  };
  const verdict = classifyTooltipVerdict(visibleText, tooltipText, ctx);
  let necessityScore: number | undefined;
  let necessityRationale: string | undefined;
  let recommendedAction: TooltipAuditEntry["recommendedAction"];

  if (verdict === "MANUAL_REVIEW" || dynamic) {
    const inferred = inferDynamicTooltipNecessity(tooltipText, visibleText, ctx);
    necessityScore = inferred.score;
    necessityRationale = inferred.rationale;
    recommendedAction = inferred.score < 25 ? "REMOVE" : inferred.score < 50 ? "REVIEW" : "KEEP";
  } else if (verdict === "REMOVE_DUPLICATE") {
    necessityScore = 8;
    necessityRationale = "duplica testo visibile";
    recommendedAction = "REMOVE";
  } else {
    necessityScore = tooltipNecessityScore(visibleText, tooltipText, ctx);
    necessityRationale = verdict.startsWith("KEEP") ? "informativo / accessibilità" : "—";
    recommendedAction = "KEEP";
  }

  entries.push({
    file: fileRel,
    line,
    route: resolveRoute(fileRel),
    component: path.basename(fileRel, path.extname(fileRel)),
    element,
    visibleText: visibleText.slice(0, 120),
    tooltipText: tooltipText.slice(0, 200),
    verdict,
    source,
    necessityScore,
    necessityRationale,
    recommendedAction,
  });
}

function scanTooltipJsx(
  fileRel: string,
  sourceFile: ts.SourceFile,
  entries: TooltipAuditEntry[],
) {
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText();
      const { line } = lineCol(sourceFile, opening.getStart());

      const tooltipTags = new Set([
        "Tooltip",
        "OptionalTooltip",
        "DisabledElementTooltip",
        "TruncatedTextTooltip",
      ]);

      if (tooltipTags.has(tag)) {
        const contentAttr = getJsxAttr(opening.attributes, "content") ?? getJsxAttr(opening.attributes, "text");
        const tooltipText = contentAttr?.value ?? "";
        const dynamic = contentAttr?.dynamic ?? true;

        let childVisible = "";
        let childAria = "";
        let childIconOnly = true;
        let childElement = tag;

        if (ts.isJsxElement(node) && node.children.length === 1) {
          const child = node.children[0];
          if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const childOpening = ts.isJsxElement(child) ? child.openingElement : child;
            childElement = childOpening.tagName.getText();
            const vis = collectVisibleText(child);
            childVisible = vis.visible;
            childAria = vis.ariaLabel;
            childIconOnly = vis.iconOnly;
          }
        }

        pushEntry(entries, {
          fileRel,
          line,
          element: `${tag} > ${childElement}`,
          visibleText: childVisible || childAria,
          tooltipText,
          source: tag,
          dynamic,
          context: {
            iconOnly: childIconOnly,
            ariaLabel: childAria,
            truncated: tag === "TruncatedTextTooltip",
            disabledHint: tag === "DisabledElementTooltip",
          },
        });
      }

      if (tag === "IconActionButton") {
        const label = getJsxAttr(opening.attributes, "label");
        const tip = getJsxAttr(opening.attributes, "tooltipContent");
        pushEntry(entries, {
          fileRel,
          line,
          element: "IconActionButton",
          visibleText: label?.value ?? "",
          tooltipText: tip?.value ?? label?.value ?? "",
          source: "IconActionButton",
          dynamic: label?.dynamic || tip?.dynamic,
          context: { iconOnly: true, ariaLabel: label?.value },
        });
      }

      if (tag === "PageActionMenuItem") {
        const label = getJsxAttr(opening.attributes, "label");
        const tip = getJsxAttr(opening.attributes, "tooltip");
        if (tip) {
          pushEntry(entries, {
            fileRel,
            line,
            element: "PageActionMenuItem",
            visibleText: label?.value ?? "",
            tooltipText: tip.value,
            source: "PageActionMenuItem",
            dynamic: label?.dynamic || tip.dynamic,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function scanNativeTitles(fileRel: string, content: string, entries: TooltipAuditEntry[]) {
  const { violations } = scanNativeTitleInSource(fileRel, content);
  const kind = fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileRel, content, ts.ScriptTarget.Latest, true, kind);

  for (const v of violations) {
    if (NON_HOVER_TITLE_COMPONENTS.has(v.element)) continue;
    const lines = content.split(/\r?\n/);
    const lineContent = lines[v.line - 1] ?? "";
    if (/Drawer|Modal|HealthScoreCard|title=\{/.test(lineContent) && /title=/.test(lineContent)) {
      const parentCtx = lines.slice(Math.max(0, v.line - 3), v.line).join("\n");
      if (/<(Drawer|Modal|HealthScoreCard|PageHeader|GestionaleInfoCard)/.test(parentCtx)) continue;
    }

    const titleMatch = lineContent.match(/title=\{?"([^"]*)"?\}/) ?? lineContent.match(/title=\{([^}]+)\}/);
    const tooltipText = titleMatch?.[1] ?? "native title";
    const dynamic = Boolean(titleMatch?.[0]?.includes("{") && !titleMatch?.[0]?.includes('"'));

    pushEntry(entries, {
      fileRel,
      line: v.line,
      element: `<${v.element} title>`,
      visibleText: "",
      tooltipText,
      source: "native title",
      dynamic,
      context: { iconOnly: true },
    });
  }
}

export function auditTooltipRepo(root = process.cwd()): TooltipAuditEntry[] {
  const entries: TooltipAuditEntry[] = [];
  const files = SCAN_ROOTS.flatMap((d) => walk(path.join(root, d)));

  for (const file of files) {
    const fileRel = rel(root, file);
    if (fileRel.includes("design-system-preview")) continue;
    if (fileRel.includes("tooltip-value-score.test")) continue;
    const content = fs.readFileSync(file, "utf8");
    const kind = fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(fileRel, content, ts.ScriptTarget.Latest, true, kind);
    scanTooltipJsx(fileRel, sourceFile, entries);
    scanNativeTitles(fileRel, content, entries);
  }

  return entries.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file) || a.line - b.line);
}

export function summarizeTooltipAudit(entries: TooltipAuditEntry[]): TooltipAuditSummary {
  const summary: TooltipAuditSummary = {
    TOTAL: entries.length,
    REMOVE_DUPLICATE: 0,
    KEEP_INFORMATIONAL: 0,
    KEEP_ACCESSIBILITY: 0,
    KEEP_CONTEXTUAL: 0,
    MANUAL_REVIEW: 0,
  };
  for (const e of entries) summary[e.verdict]++;
  return summary;
}

export function formatAuditMarkdown(entries: TooltipAuditEntry[], summary: TooltipAuditSummary): string {
  const lines: string[] = [
    "# Tooltip UX Audit",
    "",
    `> Generato: ${new Date().toISOString().slice(0, 10)} — \`npm run audit:tooltip\``,
    "",
    "## Riepilogo",
    "",
    "| Metrica | Conteggio |",
    "| ------- | --------- |",
    `| Totale tooltip | ${summary.TOTAL} |`,
    `| REMOVE_DUPLICATE | ${summary.REMOVE_DUPLICATE} |`,
    `| KEEP_INFORMATIONAL | ${summary.KEEP_INFORMATIONAL} |`,
    `| KEEP_ACCESSIBILITY | ${summary.KEEP_ACCESSIBILITY} |`,
    `| KEEP_CONTEXTUAL | ${summary.KEEP_CONTEXTUAL} |`,
    `| MANUAL_REVIEW | ${summary.MANUAL_REVIEW} |`,
    "",
    "## Mappa tooltip per route",
    "",
  ];

  const byRoute = new Map<string, TooltipAuditEntry[]>();
  for (const e of entries) {
    const list = byRoute.get(e.route) ?? [];
    list.push(e);
    byRoute.set(e.route, list);
  }

  for (const [route, routeEntries] of [...byRoute.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`### ${route}`, "");
    lines.push("| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |");
    lines.push("| ---- | ----- | -------- | -------------- | ------- | ------- |");
    for (const e of routeEntries) {
      const vis = e.visibleText.replace(/\|/g, "\\|") || "—";
      const tip = e.tooltipText.replace(/\|/g, "\\|") || "—";
      lines.push(`| \`${e.file}\` | ${e.line} | ${e.element} | ${vis} | ${tip} | ${e.verdict} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatManualReviewScoresMarkdown(entries: TooltipAuditEntry[]): string {
  const manual = entries.filter((e) => e.verdict === "MANUAL_REVIEW" || e.recommendedAction === "REMOVE");
  const remove = manual.filter((e) => (e.necessityScore ?? 50) < 25);
  const review = manual.filter((e) => {
    const s = e.necessityScore ?? 50;
    return s >= 25 && s < 50;
  });
  const keep = manual.filter((e) => (e.necessityScore ?? 0) >= 50);

  const lines: string[] = [
    "# Tooltip MANUAL_REVIEW — Necessity Scores",
    "",
    `> Generato: ${new Date().toISOString().slice(0, 10)} — \`npm run audit:tooltip\``,
    "",
    "## Riepilogo",
    "",
    "| Fascia score | Azione | Conteggio |",
    "| ------------ | ------ | --------- |",
    `| 0–24 | **Rimuovere** (ridondante) | ${remove.length} |`,
    `| 25–49 | Revisione caso per caso | ${review.length} |`,
    `| 50–100 | **Mantenere** | ${keep.length} |`,
  ];

  const section = (title: string, items: TooltipAuditEntry[]) => {
    lines.push("", `## ${title}`, "");
    if (items.length === 0) {
      lines.push("_Nessuna entry._", "");
      return;
    }
    lines.push("| Score | File | Linea | Tooltip | Visibile | Rationale |");
    lines.push("| ----- | ---- | ----- | ------- | -------- | --------- |");
    for (const e of items.sort((a, b) => (a.necessityScore ?? 0) - (b.necessityScore ?? 0))) {
      const tip = e.tooltipText.replace(/\|/g, "\\|") || "—";
      const vis = e.visibleText.replace(/\|/g, "\\|") || "—";
      const rat = (e.necessityRationale ?? "—").replace(/\|/g, "\\|");
      lines.push(`| ${e.necessityScore ?? "—"} | \`${e.file}\` | ${e.line} | ${tip} | ${vis} | ${rat} |`);
    }
    lines.push("");
  };

  section("Rimuovere (score 0–24)", remove);
  section("Revisione (score 25–49)", review);
  section("Mantenere (score 50–100)", keep);

  return lines.join("\n");
}

export function formatBaselineMarkdown(summary: TooltipAuditSummary): string {
  const date = new Date().toISOString().slice(0, 10);
  return [
    `# Tooltip Audit Baseline — ${date}`,
    "",
    "| Metrica | Conteggio |",
    "| ------- | --------- |",
    `| Totale tooltip | ${summary.TOTAL} |`,
    `| REMOVE_DUPLICATE | ${summary.REMOVE_DUPLICATE} |`,
    `| KEEP_INFORMATIONAL | ${summary.KEEP_INFORMATIONAL} |`,
    `| KEEP_ACCESSIBILITY | ${summary.KEEP_ACCESSIBILITY} |`,
    `| KEEP_CONTEXTUAL | ${summary.KEEP_CONTEXTUAL} |`,
    `| MANUAL_REVIEW | ${summary.MANUAL_REVIEW} |`,
    "",
    "Rigenerare con: `npm run audit:tooltip -- --baseline`",
    "",
  ].join("\n");
}

export function countPrimitiveGeneratorUsage(root: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const gen of PRIMITIVE_GENERATORS) counts.set(gen.name, 0);

  const files = SCAN_ROOTS.flatMap((d) => walk(path.join(root, d)));
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const gen of PRIMITIVE_GENERATORS) {
      const re = new RegExp(`<${gen.name}[\\s>]`, "g");
      const matches = content.match(re);
      if (matches) counts.set(gen.name, (counts.get(gen.name) ?? 0) + matches.length);
    }
  }
  return counts;
}

export function formatPrimitiveGeneratorsMarkdown(root: string): string {
  const counts = countPrimitiveGeneratorUsage(root);
  const lines = [
    "# Tooltip Primitive Generators Audit",
    "",
    `> Generato: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Componenti che **generano** tooltip downstream. Fix qui = massimo ROI.",
    "",
    "| Componente | Path | Props tooltip | Caller stimati |",
    "| ---------- | ---- | ------------- | -------------- |",
  ];
  for (const gen of PRIMITIVE_GENERATORS) {
    lines.push(
      `| ${gen.name} | \`${gen.path}\` | ${gen.props.join(", ")} | ${counts.get(gen.name) ?? 0} |`,
    );
  }
  lines.push("", "## Priorità refactor", "", "1. IconActionButton, ShellNavIconButton, page-header-toolbar", "2. PageActionMenuItem, toolbar-group, close-button", "3. OptionalTooltip callers con content duplicato", "");
  return lines.join("\n");
}
