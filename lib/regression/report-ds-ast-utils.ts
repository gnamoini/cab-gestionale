import ts from "typescript";
import { REPORT_COMPOSITION_JSX_TO_PRIMITIVE } from "@/components/report/design-system/contracts/primitive-contract";
import type { ReportPrimitiveKind } from "@/components/report/design-system/contracts/primitive-contract";

export type JsxUsage = {
  name: string;
  primitive?: ReportPrimitiveKind;
};

function parseTsx(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Risolve alias locali: const Table = ReportDataTable */
function collectLocalAliases(source: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer || !ts.isIdentifier(decl.initializer)) continue;
      aliases.set(decl.name.text, decl.initializer.text);
    }
  }
  return aliases;
}

function resolveJsxName(name: string, aliases: Map<string, string>): string {
  let current = name;
  const seen = new Set<string>();
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current)!;
  }
  return current;
}

function visitJsx(source: ts.SourceFile): JsxUsage[] {
  const aliases = collectLocalAliases(source);
  const out: JsxUsage[] = [];

  function walk(node: ts.Node): void {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName;
      if (ts.isIdentifier(tag)) {
        const resolved = resolveJsxName(tag.text, aliases);
        out.push({
          name: resolved,
          primitive: REPORT_COMPOSITION_JSX_TO_PRIMITIVE[resolved],
        });
      }
    }
    ts.forEachChild(node, walk);
  }

  walk(source);
  return out;
}

export function extractJsxPrimitivesFromSource(filePath: string, content: string): Set<ReportPrimitiveKind> {
  const source = parseTsx(filePath, content);
  const usages = visitJsx(source);
  const kinds = new Set<ReportPrimitiveKind>();
  for (const u of usages) {
    if (u.primitive) kinds.add(u.primitive);
  }
  return kinds;
}

export function extractImportsFromSource(content: string): string[] {
  const source = parseTsx("file.tsx", content);
  const imports: string[] = [];
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    imports.push(stmt.moduleSpecifier.text);
  }
  return imports;
}

export function hasInlineColumnsProp(filePath: string, content: string): boolean {
  const source = parseTsx(filePath, content);
  let found = false;
  function walk(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "columns") {
      if (node.initializer && !ts.isStringLiteral(node.initializer)) found = true;
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return found;
}

export function collectImportedBindingNames(content: string, modulePattern: RegExp): string[] {
  const source = parseTsx("file.tsx", content);
  const names: string[] = [];
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (!modulePattern.test(stmt.moduleSpecifier.text)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;
    if (clause.name) names.push(clause.name.text);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        const imported = el.propertyName?.text ?? el.name.text;
        const local = el.name.text;
        names.push(local === imported ? imported : local);
      }
    }
  }
  return names;
}
