import fs from "node:fs";
import path from "node:path";
import { resolveCatalogReference } from "@/lib/control/catalog";
import { CONTROL_REGISTRY } from "@/lib/control/registry";
import { REGRESSION_CORE } from "@/lib/regression/smoke-regression-lists";

export type ReleaseReadyContract = {
  version: string;
  mergeAuthority: string;
  updatedAt: string;
  required: readonly {
    id: string;
    severity: "blocker" | "warning" | "info";
    legacy: readonly string[];
    controlPlane: string;
    reconciliationNote?: string;
  }[];
  intentionalDivergences: readonly {
    id: string;
    legacy: string;
    controlPlane: string;
    reason: string;
  }[];
  criticalSurfaces: readonly {
    id: string;
    coverage: readonly string[];
    tier?: string;
  }[];
};

const CONTRACT_PATH = path.join(process.cwd(), "docs/release-gate-contract.json");
const LEGACY_WORKFLOW = path.join(process.cwd(), ".github/workflows/release-gate.yml");

export function loadReleaseReadyContract(): ReleaseReadyContract {
  const raw = fs.readFileSync(CONTRACT_PATH, "utf8");
  return JSON.parse(raw) as ReleaseReadyContract;
}

function legacyWorkflowText(): string {
  return fs.readFileSync(LEGACY_WORKFLOW, "utf8");
}

function legacyImplementsRef(workflow: string, ref: string): boolean {
  if (ref === "verify-supabase-ci-env") {
    return workflow.includes("scripts/verify-supabase-ci-env.ts");
  }
  if (ref === "release-ready-contract") {
    return workflow.includes("release-ready-contract") || workflow.includes("control:review");
  }
  return workflow.includes(`npm run ${ref}`) || workflow.includes(`run: ${ref}`);
}

function resolveControlPlaneRef(controlId: string): string | undefined {
  const control = CONTROL_REGISTRY.find((c) => c.id === controlId);
  return control?.implementation.reference;
}

export function validateReleaseReadyContract(): string[] {
  const blockers: string[] = [];
  const contract = loadReleaseReadyContract();
  const workflow = legacyWorkflowText();
  const registryById = new Map(CONTROL_REGISTRY.map((c) => [c.id, c]));

  if (contract.mergeAuthority !== "release-gate") {
    blockers.push(`mergeAuthority must be release-gate (got ${contract.mergeAuthority})`);
  }

  for (const req of contract.required) {
    for (const legacyRef of req.legacy) {
      if (!legacyImplementsRef(workflow, legacyRef)) {
        blockers.push(
          `legacy release-gate.yml missing REQUIRED ref "${legacyRef}" for contract id ${req.id}`,
        );
      }
    }

    const cp = registryById.get(req.controlPlane);
    if (!cp) {
      blockers.push(`controlPlane id missing from registry: ${req.controlPlane} (contract ${req.id})`);
      continue;
    }
    if (cp.status !== "active" && cp.status !== "experimental") {
      blockers.push(`controlPlane ${req.controlPlane} not active (status ${cp.status})`);
    }
    if (cp.severity !== req.severity) {
      blockers.push(
        `severity drift: contract ${req.id}=${req.severity} registry ${req.controlPlane}=${cp.severity}`,
      );
    }
    const catalogRef = resolveControlPlaneRef(req.controlPlane);
    if (!catalogRef || !resolveCatalogReference(catalogRef)) {
      blockers.push(`catalog missing for controlPlane ${req.controlPlane} (ref ${catalogRef ?? "?"})`);
    }
  }

  for (const surface of contract.criticalSurfaces) {
    const requiredIds = new Set(contract.required.map((r) => r.id));
    for (const item of surface.coverage) {
      if (item.startsWith("lib/")) {
        if (!fs.existsSync(path.join(process.cwd(), item))) {
          blockers.push(`critical surface ${surface.id}: missing coverage file ${item}`);
          continue;
        }
        if (surface.tier === "cert-extended") continue;
        if (!REGRESSION_CORE.includes(item)) {
          blockers.push(
            `critical surface ${surface.id}: ${item} not in REGRESSION_CORE (wire or update contract)`,
          );
        }
        continue;
      }
      if (!requiredIds.has(item) && !registryById.has(item)) {
        blockers.push(`critical surface ${surface.id}: unknown coverage ref ${item}`);
      }
    }
  }

  return blockers;
}
