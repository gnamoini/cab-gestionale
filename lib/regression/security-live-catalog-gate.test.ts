/**
 * Live catalog dual gate (offline manifest + baseline snapshot).
 * Run with LIVE_SECURITY_BASELINE env for production gate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");
const BASELINE_PATH =
  process.env.LIVE_SECURITY_BASELINE ??
  path.join(ROOT, "docs/security/baseline-post-remediation-2026-08-26.json");

const PUBLIC_SAFE_ALLOWLIST = new Set<string>([]);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  entries: Record<string, { classification: string; grants: string[] }>;
};

type BaselineFn = {
  name: string;
  args: string;
  grants: { anon?: boolean; authenticated?: boolean; public?: boolean };
  isMutating?: boolean;
};

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as {
  functions: BaselineFn[];
  summary?: Record<string, number>;
};

function fnKey(f: BaselineFn): string {
  return f.args ? `${f.name}(${f.args})` : f.name;
}

const violations: string[] = [];
let anonExecTotal = 0;
let publicExecTotal = 0;
let mutatingClientViolations = 0;

for (const fn of baseline.functions) {
  if (fn.grants.anon) anonExecTotal += 1;
  if (fn.grants.public) publicExecTotal += 1;

  const key = fnKey(fn);
  const entry = manifest.entries[key];
  const clientExec = fn.grants.anon || fn.grants.public || fn.grants.authenticated;
  const isMutating = fn.isMutating === true;

  if (fn.grants.anon && !PUBLIC_SAFE_ALLOWLIST.has(fn.name)) {
    violations.push(`${key}: anon EXECUTE not in PUBLIC_SAFE allowlist`);
  }

  if (isMutating && clientExec) {
    const allowed =
      entry?.classification === "PUBLIC_SAFE" ||
      (entry?.classification === "AUTHENTICATED_CLIENT_CALLABLE" && entry.grants.includes("authenticated")) ||
      (entry?.classification === "PORTALE_CLIENT_CALLABLE" && entry.grants.includes("authenticated"));
    if (!allowed) {
      mutatingClientViolations += 1;
      violations.push(`${key}: mutating definer with client EXECUTE outside manifest policy`);
    }
  }
}

console.log(
  JSON.stringify({
    anon_exec_definer_total: anonExecTotal,
    public_exec_definer_total: publicExecTotal,
    mutating_definer_client_execute_violations: mutatingClientViolations,
  }),
);

if (process.env.ENFORCE_LIVE_P0_GATE === "1") {
  assert.equal(violations.length, 0, violations.join("\n"));
}

console.log("security-live-catalog-gate.test: OK");
