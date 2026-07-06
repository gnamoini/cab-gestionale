/**
 * AST import resolution: UI/hooks must not import runtime values from src/services/*.service.ts.
 * Type-only imports are allowed. ponytail: uses ts.Program — not regex.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

const SCAN_PREFIXES = ["components", "src/hooks", "context"];
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "generated", "regression"]);
const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;

/** Files mid-migration — shrink as callers move to *-entry.ts */
export const CALL_SITE_AUDIT_ALLOWLIST = new Set<string>([]);

const SERVICE_MODULE_RE = /(?:^|\/)src\/services\/[^/]+\.service(?:\.ts)?$/;

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

function collectScanFiles(): string[] {
  const out: string[] = [];
  for (const prefix of SCAN_PREFIXES) {
    const abs = path.join(ROOT, prefix);
    if (fs.existsSync(abs)) walk(abs, out);
  }
  return out;
}

function resolveImportTarget(
  program: ts.Program,
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
): string | null {
  const resolved = ts.resolveModuleName(
    moduleSpecifier,
    sourceFile.fileName,
    program.getCompilerOptions(),
    ts.sys,
  );
  if (!resolved.resolvedModule?.resolvedFileName) return null;
  return path
    .relative(ROOT, resolved.resolvedModule.resolvedFileName)
    .replace(/\\/g, "/");
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  if (node.importClause?.isTypeOnly) return true;
  const clause = node.importClause;
  if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) return false;
  return clause.namedBindings.elements.every((el) => el.isTypeOnly);
}

function isServiceModule(rel: string): boolean {
  return SERVICE_MODULE_RE.test(rel) || rel === "src/services/index.ts";
}

export function auditEntrypointCallSites(
  allowlist: Set<string> = CALL_SITE_AUDIT_ALLOWLIST,
): string[] {
  const files = collectScanFiles();
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("tsconfig.json not found");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const program = ts.createProgram(files, parsed.options);
  const violations: string[] = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (allowlist.has(rel)) continue;

    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) continue;

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (!isTypeOnlyImport(node)) {
          const target = resolveImportTarget(program, sourceFile, node.moduleSpecifier.text);
          if (target && isServiceModule(target)) {
            violations.push(`${rel}: runtime import from ${target}`);
          }
        }
      }
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const target = resolveImportTarget(program, sourceFile, node.moduleSpecifier.text);
        if (target && isServiceModule(target)) {
          violations.push(`${rel}: re-export from ${target}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return violations;
}
