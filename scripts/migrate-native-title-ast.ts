#!/usr/bin/env npx tsx
/**
 * Migra native title → Tooltip wrap (AST) — content={expr} corretto.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { auditUiConsistencyRepo } from "../lib/ui/ui-consistency-audit";

const DRY = process.argv.includes("--dry-run");
const ROOT = process.cwd();
const HTML_TAGS = new Set(["button", "span", "td", "th", "a", "div", "input", "label", "img"]);

function getTitleAttr(opening: ts.JsxOpeningLikeElement): ts.JsxAttribute | undefined {
  return opening.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "title",
  );
}

/** Espressione per prop content={...} */
function titleContentExpr(attr: ts.JsxAttribute): string | null {
  if (!attr.initializer) return '""';
  if (ts.isStringLiteral(attr.initializer)) return JSON.stringify(attr.initializer.text);
  if (ts.isJsxExpression(attr.initializer)) {
    if (!attr.initializer.expression) return null;
    if (attr.initializer.expression.kind === ts.SyntaxKind.Identifier && attr.initializer.expression.getText() === "undefined") {
      return null;
    }
    return attr.initializer.expression.getText();
  }
  return null;
}

function isLowercaseTag(opening: ts.JsxOpeningLikeElement): boolean {
  return ts.isIdentifier(opening.tagName) && HTML_TAGS.has(opening.tagName.text);
}

function addImport(source: string): string {
  if (source.includes('@/components/ui"') || source.includes("@/components/ui'")) return source;
  const importLine = 'import { Tooltip } from "@/components/ui";\n';
  if (source.includes('"use client"')) {
    return source.replace(/"use client";\s*\n/, `"use client";\n\n${importLine}`);
  }
  return `${importLine}${source}`;
}

type Patch = { start: number; end: number; text: string };

function migrateSource(fileRel: string, content: string): { out: string; count: number } {
  const kind = fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileRel, content, ts.ScriptTarget.Latest, true, kind);
  const patches: Patch[] = [];
  const printer = ts.createPrinter({ omitTrailingSemicolon: true });

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const titleAttr = getTitleAttr(opening);
      if (titleAttr && isLowercaseTag(opening)) {
        const expr = titleContentExpr(titleAttr);
        if (!expr) {
          ts.forEachChild(node, visit);
          return;
        }
        const line = sf.getLineAndCharacterOfPosition(opening.getStart()).line;
        const prev = sf.text.split(/\r?\n/)[line - 1] ?? "";
        if (/ui-contract-disable-next-line/.test(prev)) {
          ts.forEachChild(node, visit);
          return;
        }
        const withoutTitle = opening.attributes.properties.filter((p) => p !== titleAttr);
        const newOpening = ts.factory.updateJsxOpeningElement(
          opening,
          opening.tagName,
          opening.typeArguments,
          ts.factory.updateJsxAttributes(opening.attributes, withoutTitle),
        );
        const newElement = ts.factory.updateJsxElement(node, newOpening, node.children, node.closingElement);
        const inner = printer.printNode(ts.EmitHint.Unspecified, newElement, sf);
        const wrapped = `<Tooltip content={${expr}}>${inner}</Tooltip>`;
        patches.push({ start: node.getStart(), end: node.getEnd(), text: wrapped });
        return;
      }
    }
    if (ts.isJsxSelfClosingElement(node)) {
      const titleAttr = getTitleAttr(node);
      if (titleAttr && isLowercaseTag(node)) {
        const expr = titleContentExpr(titleAttr);
        if (!expr) {
          ts.forEachChild(node, visit);
          return;
        }
        const withoutTitle = node.attributes.properties.filter((p) => p !== titleAttr);
        const newNode = ts.factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          ts.factory.updateJsxAttributes(node.attributes, withoutTitle),
        );
        const inner = printer.printNode(ts.EmitHint.Unspecified, newNode, sf);
        const wrapped = `<Tooltip content={${expr}}>${inner}</Tooltip>`;
        patches.push({ start: node.getStart(), end: node.getEnd(), text: wrapped });
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  if (patches.length === 0) return { out: content, count: 0 };
  patches.sort((a, b) => b.start - a.start);
  let out = content;
  for (const p of patches) {
    out = out.slice(0, p.start) + p.text + out.slice(p.end);
  }
  if (!out.includes("@/components/ui")) {
    out = addImport(out);
  }
  return { out, count: patches.length };
}

function main() {
  const report = auditUiConsistencyRepo(ROOT);
  const blockers = report.findings.filter((f) => f.severity === "BLOCKER" && f.problem.includes("Native title"));
  const files = [...new Set(blockers.map((b) => b.file))];
  let total = 0;
  for (const fileRel of files) {
    const full = path.join(ROOT, fileRel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    const { out, count } = migrateSource(fileRel, content);
    if (count === 0) continue;
    total += count;
    if (!DRY) fs.writeFileSync(full, out);
    console.log(`${DRY ? "[dry-run] " : ""}${fileRel}: ${count}`);
  }
  console.log(`Total: ${total}`);
}

main();
