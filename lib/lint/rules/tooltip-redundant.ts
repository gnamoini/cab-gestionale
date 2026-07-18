/**
 * AST scan — tooltip ridondanti (WARN governance).
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { tooltipValueScore } from "@/lib/ui/tooltip-value-score";

export type TooltipRedundantFinding = {
  file: string;
  line: number;
  problem: string;
  visible: string;
  tooltip: string;
};

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);
const SCAN_ROOTS = ["components", "app"];
const EXT = new Set([".ts", ".tsx"]);

const EXEMPT_TAGS = new Set([
  "TruncatedTextTooltip",
  "DisabledElementTooltip",
  "TooltipStatus",
  "TooltipList",
]);

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

function lineCol(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function exprToString(expr: ts.Expression | undefined): { value: string; dynamic: boolean } {
  if (!expr) return { value: "", dynamic: true };
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { value: expr.text, dynamic: false };
  }
  return { value: "", dynamic: true };
}

function getAttr(attrs: ts.JsxAttributes, name: string) {
  for (const p of attrs.properties) {
    if (!ts.isJsxAttribute(p) || p.name.getText() !== name) continue;
    if (!p.initializer) return { value: "", dynamic: false };
    if (ts.isStringLiteral(p.initializer)) return { value: p.initializer.text, dynamic: false };
    if (ts.isJsxExpression(p.initializer)) return exprToString(p.initializer.expression);
  }
  return undefined;
}

function collectVisibleText(node: ts.JsxElement): { visible: string; ariaLabel: string; iconOnly: boolean } {
  let visible = "";
  let ariaLabel = "";
  const opening = node.openingElement;
  const aria = getAttr(opening.attributes, "aria-label");
  if (aria) ariaLabel = aria.value;

  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const t = child.getText().replace(/\s+/g, " ").trim();
      if (t && !child.getText().includes("sr-only")) visible += (visible ? " " : "") + t;
    }
    if (ts.isJsxElement(child)) {
      const cls = child.openingElement.attributes.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name.getText() === "className",
      );
      const classText =
        cls && ts.isJsxAttribute(cls) && cls.initializer && ts.isStringLiteral(cls.initializer)
          ? cls.initializer.text
          : "";
      if (!classText.includes("sr-only")) {
        for (const gc of child.children) {
          if (ts.isJsxText(gc)) {
            const t = gc.getText().replace(/\s+/g, " ").trim();
            if (t) visible += (visible ? " " : "") + t;
          }
        }
      }
    }
  }

  const iconOnly = !visible.trim();
  return { visible: visible.trim(), ariaLabel, iconOnly };
}

export function scanTooltipRedundantInSource(fileRel: string, content: string): TooltipRedundantFinding[] {
  const findings: TooltipRedundantFinding[] = [];
  const kind = fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileRel, content, ts.ScriptTarget.Latest, true, kind);

  function visit(node: ts.Node) {
    if (!ts.isJsxElement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const opening = node.openingElement;
    const tag = opening.tagName.getText();
    if (tag !== "Tooltip" || EXEMPT_TAGS.has(tag)) {
      ts.forEachChild(node, visit);
      return;
    }

    const contentAttr = getAttr(opening.attributes, "content");
    if (!contentAttr || contentAttr.dynamic || !contentAttr.value.trim()) {
      ts.forEachChild(node, visit);
      return;
    }

    const child = node.children.find((c) => ts.isJsxElement(c)) as ts.JsxElement | undefined;
    if (!child) {
      ts.forEachChild(node, visit);
      return;
    }

    const { visible, ariaLabel, iconOnly } = collectVisibleText(child);
    const tooltip = contentAttr.value;

    if (iconOnly) {
      ts.forEachChild(node, visit);
      return;
    }

    const score = tooltipValueScore(visible || ariaLabel, tooltip);
    if (score === 0 && visible) {
      findings.push({
        file: fileRel,
        line: lineCol(sourceFile, opening.getStart()),
        problem: "TooltipRedundant",
        visible,
        tooltip,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

export function scanTooltipRedundantRepo(root = process.cwd()): TooltipRedundantFinding[] {
  const findings: TooltipRedundantFinding[] = [];
  const files = SCAN_ROOTS.flatMap((d) => walk(path.join(root, d)));

  for (const file of files) {
    const fileRel = rel(root, file);
    if (fileRel.includes("design-system-preview")) continue;
    const content = fs.readFileSync(file, "utf8");
    findings.push(...scanTooltipRedundantInSource(fileRel, content));
  }

  return findings;
}
