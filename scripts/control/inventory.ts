#!/usr/bin/env npx tsx
/**
 * Machine-readable inventory of existing controls (Sprint 1).
 * Does NOT define governance — output feeds registry curation in Sprint 2.
 *
 * npm run control:inventory [-- --out=control-inventory.json]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_OUT = "control-inventory.json";

type InventoryEntry = {
  kind: "npm-script" | "workflow-step" | "script-file" | "regression-test" | "doc";
  id: string;
  path: string;
  detail?: string;
};

type ControlInventory = {
  generatedAt: string;
  repositoryRoot: string;
  summary: {
    npmScripts: number;
    workflowSteps: number;
    scriptFiles: number;
    regressionCore: number;
    regressionExtended: number;
    docs: number;
  };
  npmScripts: InventoryEntry[];
  workflowSteps: InventoryEntry[];
  scriptFiles: InventoryEntry[];
  regressionCore: InventoryEntry[];
  regressionExtended: InventoryEntry[];
  docs: InventoryEntry[];
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function listFiles(dir: string, ext: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  function walk(d: string): void {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(ext)) out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
  walk(abs);
  return out.sort();
}

function scanNpmScripts(): InventoryEntry[] {
  const pkg = readJson<{ scripts?: Record<string, string> }>("package.json");
  const scripts = pkg.scripts ?? {};
  const gateLike = (name: string, cmd: string) =>
    /gate|audit|smoke|regression|production|control|rbac|flex|ios|ux:|ci:/i.test(name) ||
    /gate|audit|smoke|regression|production-check/i.test(cmd);

  return Object.entries(scripts)
    .filter(([name, cmd]) => gateLike(name, cmd))
    .map(([name, cmd]) => ({
      kind: "npm-script" as const,
      id: name,
      path: "package.json",
      detail: cmd.length > 120 ? `${cmd.slice(0, 117)}...` : cmd,
    }));
}

function scanWorkflowSteps(): InventoryEntry[] {
  const wfDir = path.join(ROOT, ".github/workflows");
  if (!fs.existsSync(wfDir)) return [];
  const entries: InventoryEntry[] = [];
  for (const file of fs.readdirSync(wfDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
    const rel = `.github/workflows/${file}`;
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const lines = content.split("\n");
    let stepName = "";
    for (let i = 0; i < lines.length; i++) {
      const nameMatch = lines[i]?.match(/^\s*- name:\s*(.+)/);
      if (nameMatch) stepName = nameMatch[1]?.trim() ?? "";
      const runMatch = lines[i]?.match(/^\s*run:\s*(.+)/);
      if (runMatch && stepName) {
        const run = runMatch[1]?.trim() ?? "";
        if (/npm run|npx tsx|playwright/i.test(run)) {
          entries.push({
            kind: "workflow-step",
            id: `${file}::${stepName}`,
            path: rel,
            detail: run.length > 100 ? `${run.slice(0, 97)}...` : run,
          });
        }
        stepName = "";
      }
    }
  }
  return entries;
}

function scanRegressionLists(): { core: InventoryEntry[]; extended: InventoryEntry[] } {
  const listPath = "lib/regression/smoke-regression-lists.ts";
  const full = path.join(ROOT, listPath);
  if (!fs.existsSync(full)) return { core: [], extended: [] };
  const content = fs.readFileSync(full, "utf8");
  const extract = (constName: string): string[] => {
    const marker = `export const ${constName}`;
    const start = content.indexOf(marker);
    if (start < 0) return [];
    const open = content.indexOf("[", start);
    const closeMatch = content.slice(open).match(/\]\s*as const\s*;/);
    const close = closeMatch ? open + (closeMatch.index ?? 0) : content.indexOf("];", open);
    if (open < 0 || close < 0) return [];
    const block = content.slice(open, close);
    const matches = block.match(/"([^"]+\.test\.ts)"/g) ?? [];
    return matches.map((s) => s.replace(/"/g, ""));
  };
  const core = extract("REGRESSION_CORE").map((p) => ({
    kind: "regression-test" as const,
    id: p,
    path: p,
  }));
  const extended = extract("REGRESSION_EXTENDED").map((p) => ({
    kind: "regression-test" as const,
    id: p,
    path: p,
  }));
  return { core, extended };
}

function scanScriptFiles(): InventoryEntry[] {
  return listFiles("scripts", ".ts")
    .filter((p) => /gate|audit|check|smoke|production|control/i.test(p))
    .map((p) => ({
      kind: "script-file" as const,
      id: p,
      path: p,
    }));
}

function scanDocs(): InventoryEntry[] {
  const names = ["gate-matrix.md", "release-gate.md", "audit-release-gate.md", "control-plane/README.md"];
  return names
    .filter((n) => fs.existsSync(path.join(ROOT, "docs", n.replace("control-plane/", "control-plane/"))))
    .map((n) => ({
      kind: "doc" as const,
      id: n,
      path: n.startsWith("control-plane") ? `docs/${n}` : `docs/${n}`,
    }));
}

function buildInventory(): ControlInventory {
  const npmScripts = scanNpmScripts();
  const workflowSteps = scanWorkflowSteps();
  const scriptFiles = scanScriptFiles();
  const { core, extended } = scanRegressionLists();
  const docs = scanDocs();

  return {
    generatedAt: new Date().toISOString(),
    repositoryRoot: ROOT,
    summary: {
      npmScripts: npmScripts.length,
      workflowSteps: workflowSteps.length,
      scriptFiles: scriptFiles.length,
      regressionCore: core.length,
      regressionExtended: extended.length,
      docs: docs.length,
    },
    npmScripts,
    workflowSteps,
    scriptFiles,
    regressionCore: core,
    regressionExtended: extended,
    docs,
  };
}

function main(): void {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outFile = outArg?.slice("--out=".length) ?? DEFAULT_OUT;
  const inventory = buildInventory();
  const outPath = path.join(ROOT, outFile);
  fs.writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outFile}`);
  console.log(JSON.stringify(inventory.summary, null, 2));
}

main();
