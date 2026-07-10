import fs from "node:fs";
import path from "node:path";
import { CONTROL_MODE_SCHEMA_VERSION } from "@/lib/control/contract";
import type { ControlMode } from "@/lib/control/types";

export type StrictLabelValidation = {
  approved: boolean;
  strictEnabled: boolean;
  labelPresent: boolean;
  fork: boolean;
  labelAppliedBy?: string;
  labelAppliedByPermission?: string;
  currentActor?: string;
  currentActorPermission?: string;
  reason: string;
};

const VALIDATION_FILE = process.env.STRICT_LABEL_VALIDATION_PATH ?? "strict-label-validation.json";
const STRICT_LABEL = "control-plane-strict";
const MAINTAIN_PLUS = new Set(["admin", "maintain"]);

export function defaultControlMode(): ControlMode {
  return {
    schemaVersion: CONTROL_MODE_SCHEMA_VERSION,
    shadow: "advisory",
    coverage: "warning",
    trigger: "default",
    strictLabelApproved: false,
  };
}

export function loadStrictLabelValidation(): StrictLabelValidation | undefined {
  const p = path.isAbsolute(VALIDATION_FILE) ? VALIDATION_FILE : path.join(process.cwd(), VALIDATION_FILE);
  if (!fs.existsSync(p)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as StrictLabelValidation;
  } catch {
    return undefined;
  }
}

function hasStrictLabelFromEvent(): boolean {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return false;
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8")) as {
      pull_request?: { labels?: { name: string }[] };
    };
    return (event.pull_request?.labels ?? []).some((l) => l.name === STRICT_LABEL);
  } catch {
    return false;
  }
}

export function resolveControlMode(): ControlMode {
  const validation = loadStrictLabelValidation();
  const repoPolicy =
    process.env.CONTROL_SHADOW_STRICT === "1" || process.env.CONTROL_COVERAGE_STRICT === "1";

  if (validation) {
    const strict = validation.approved && validation.strictEnabled;
    return {
      schemaVersion: CONTROL_MODE_SCHEMA_VERSION,
      shadow: strict ? "strict" : "advisory",
      coverage: strict ? "strict" : "warning",
      trigger: validation.labelPresent ? "label" : repoPolicy ? "repository-policy" : "default",
      strictLabelApproved: validation.approved,
      strictLabelAppliedBy: validation.labelAppliedBy,
      strictCurrentActor: validation.currentActor,
    };
  }

  if (repoPolicy) {
    return {
      schemaVersion: CONTROL_MODE_SCHEMA_VERSION,
      shadow: process.env.CONTROL_SHADOW_STRICT === "1" ? "strict" : "advisory",
      coverage: process.env.CONTROL_COVERAGE_STRICT === "1" ? "strict" : "warning",
      trigger: "repository-policy",
      strictLabelApproved: false,
    };
  }

  if (hasStrictLabelFromEvent()) {
    return {
      schemaVersion: CONTROL_MODE_SCHEMA_VERSION,
      shadow: "advisory",
      coverage: "warning",
      trigger: "label",
      strictLabelApproved: false,
      reason: "label present but validation file missing — advisory fallback",
    };
  }

  return defaultControlMode();
}

export function isMaintainPlus(permission: string | undefined): boolean {
  return permission !== undefined && MAINTAIN_PLUS.has(permission);
}

export function formatControlModeLines(mode: ControlMode): string[] {
  return [
    "CONTROL MODE",
    "",
    `shadow: ${mode.shadow}`,
    `coverage: ${mode.coverage}`,
    `trigger: ${mode.trigger}`,
    `strictLabelApproved: ${mode.strictLabelApproved}`,
    ...(mode.strictLabelAppliedBy ? [`strictLabelAppliedBy: ${mode.strictLabelAppliedBy}`] : []),
    ...(mode.strictCurrentActor ? [`strictCurrentActor: ${mode.strictCurrentActor}`] : []),
    ...(mode.reason ? [`reason: ${mode.reason}`] : []),
  ];
}
