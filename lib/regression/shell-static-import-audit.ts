/**
 * AST policy: critical shell graph must not statically import boot-investigation.ts.
 * ponytail: ts.Program scan — not regex-only.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

const BOOT_MODULE_RE = /boot-investigation(?:\.ts)?$/;

/** Files allowed to import boot-investigation (static or dynamic). */
export const BOOT_INVESTIGATION_IMPORT_ALLOWLIST = new Set([
  "lib/observability/boot-investigation.ts",
  "lib/observability/boot-investigation-gate.ts",
  "lib/observability/boot-investigation-lazy.ts",
  "components/observability/observability-diagnostics-pack.tsx",
  "components/observability/observability-diagnostics-pack-inner.tsx",
  "components/observability/boot-investigation-mount.tsx",
]);

/** Forbidden zones — 0 static edges to boot-investigation.ts */
const FORBIDDEN_PREFIXES = [
  "app/",
  "context/",
  "src/providers/",
  "components/gestionale/",
  "lib/rbac/",
];

const FORBIDDEN_FILES = new Set(["components/app-providers-gestionale.tsx"]);

const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "generated"]);
const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;

function isForbiddenFile(rel: string): boolean {
  if (FORBIDDEN_FILES.has(rel)) return true;
  return FORBIDDEN_PREFIXES.some((p) => rel.startsWith(p));
}

function isBootInvestigationSpecifier(spec: string): boolean {
  return BOOT_MODULE_RE.test(spec.replace(/\\/g, "/"));
}

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (SKIP_FILE_RE.test(entry.name)) continue;
    out.push(full);
  }
}

function collectForbiddenFiles(): string[] {
  const out: string[] = [];
  for (const prefix of ["app", "context", "src/providers", "components/gestionale", "lib/rbac", "components"]) {
    const abs = path.join(ROOT, prefix);
    if (!fs.existsSync(abs)) continue;
    walk(abs, out);
  }
  return out.filter((f) => {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    return isForbiddenFile(rel);
  });
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  if (node.importClause?.isTypeOnly) return true;
  const clause = node.importClause;
  if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) return false;
  return clause.namedBindings.elements.every((el) => el.isTypeOnly);
}

function importSpecifierText(node: ts.ImportDeclaration | ts.ExportDeclaration): string | null {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return null;
  return node.moduleSpecifier.text;
}

function callExpressionModuleArg(node: ts.CallExpression): string | null {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== "require") return null;
  const [arg] = node.arguments;
  if (!arg || !ts.isStringLiteral(arg)) return null;
  return arg.text;
}

export function auditShellBootInvestigationImports(): string[] {
  const files = collectForbiddenFiles();
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("tsconfig.json not found");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const program = ts.createProgram(files, parsed.options);
  const violations: string[] = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (BOOT_INVESTIGATION_IMPORT_ALLOWLIST.has(rel)) continue;

    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) continue;

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const spec = importSpecifierText(node);
        if (spec && isBootInvestigationSpecifier(spec) && !isTypeOnlyImport(node)) {
          violations.push(`${rel}: static import "${spec}"`);
        }
      }
      if (ts.isExportDeclaration(node)) {
        const spec = importSpecifierText(node);
        if (spec && isBootInvestigationSpecifier(spec)) {
          violations.push(`${rel}: re-export "${spec}"`);
        }
      }
      // ponytail: numeric kind — ts.SyntaxKind.ImportExpression missing in some TS builds
      if (node.kind === 272) {
        const importNode = node as ts.Node & { argument?: ts.Expression };
        if (importNode.argument && ts.isStringLiteral(importNode.argument)) {
          const spec = importNode.argument.text;
          if (isBootInvestigationSpecifier(spec)) {
            violations.push(`${rel}: dynamic import "${spec}" (use boot-investigation-lazy)`);
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const spec = callExpressionModuleArg(node);
        if (spec && isBootInvestigationSpecifier(spec)) {
          violations.push(`${rel}: require("${spec}")`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return violations;
}
