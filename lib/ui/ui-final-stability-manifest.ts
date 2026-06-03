/**
 * UI Final Stability manifest — frozen score snapshot for governance regression.
 */
import { createHash } from "node:crypto";
import { FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";
import {
  auditAllUiFinalStability,
  computeGlobalUiFinalHealth,
  uiFinalRouteScoreFingerprint,
  type UiFinalRouteReport,
  type UiFinalRouteStatus,
} from "@/lib/ui/ui-final-stability-audit";

export const UI_FINAL_STABILITY_MANIFEST_PATH = "lib/ui/ui-final-stability-manifest.json";

export const UI_FINAL_STABILITY_UPDATE_ENV = "UI_FINAL_STABILITY_APPROVED";

export type UiFinalStabilityRouteManifest = {
  flexSafety: number;
  overflowSafety: number;
  uiOsCompatibility: number;
  layoutStability: number;
  overall: number;
  status: UiFinalRouteStatus;
};

export type UiFinalStabilityManifest = {
  version: number;
  frozenAt: string;
  absoluteFinalState: true;
  globalScores: {
    flexStability: number;
    uiOsHealth: number;
    overflowRiskScore: number;
    layoutDriftScore: number;
    recommendation: string;
  };
  routeScores: Record<string, UiFinalStabilityRouteManifest>;
  checksum: string;
};

export function isUiFinalStabilityUpdateApproved(): boolean {
  return process.env[UI_FINAL_STABILITY_UPDATE_ENV] === "1";
}

export function computeUiFinalStabilityChecksum(
  routeScores: Record<string, UiFinalStabilityRouteManifest>,
): string {
  const keys = Object.keys(routeScores).sort();
  const payload = keys.map((key) => {
    const s = routeScores[key];
    return `${key}|${s.flexSafety}|${s.overflowSafety}|${s.uiOsCompatibility}|${s.layoutStability}|${s.overall}|${s.status}`;
  }).join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function buildUiFinalStabilityManifest(
  reports: UiFinalRouteReport[] = auditAllUiFinalStability(),
  version = 1,
): UiFinalStabilityManifest {
  const health = computeGlobalUiFinalHealth(reports);
  const routeScores: Record<string, UiFinalStabilityRouteManifest> = {};

  for (const report of reports) {
    routeScores[report.route] = {
      flexSafety: report.scores.flexSafety,
      overflowSafety: report.scores.overflowSafety,
      uiOsCompatibility: report.scores.uiOsCompatibility,
      layoutStability: report.scores.layoutStability,
      overall: report.scores.overall,
      status: report.status,
    };
  }

  const manifest: UiFinalStabilityManifest = {
    version,
    frozenAt: new Date().toISOString().slice(0, 10),
    absoluteFinalState: true,
    globalScores: {
      flexStability: health.globalFlexStability,
      uiOsHealth: health.globalUiOsHealth,
      overflowRiskScore: health.globalOverflowRiskScore,
      layoutDriftScore: health.systemLayoutDriftScore,
      recommendation: health.recommendation,
    },
    routeScores,
    checksum: "",
  };

  manifest.checksum = computeUiFinalStabilityChecksum(routeScores);
  return manifest;
}

export function verifyUiFinalStabilityManifest(
  manifest: UiFinalStabilityManifest,
  reports: UiFinalRouteReport[] = auditAllUiFinalStability(),
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const expected = buildUiFinalStabilityManifest(reports, manifest.version);

  if (!FLEX_SYSTEM_ABSOLUTE_FINAL_STATE) {
    errors.push("FLEX_SYSTEM_ABSOLUTE_FINAL_STATE must be true");
  }

  if (manifest.absoluteFinalState !== true) {
    errors.push("absoluteFinalState must be true");
  }

  if (manifest.checksum !== expected.checksum) {
    errors.push(
      `checksum mismatch: manifest ${manifest.checksum}, expected ${expected.checksum} — run ui:final-stability:manifest:generate with ${UI_FINAL_STABILITY_UPDATE_ENV}=1`,
    );
  }

  if (manifest.globalScores.flexStability !== expected.globalScores.flexStability) {
    errors.push(
      `globalScores.flexStability drift: ${manifest.globalScores.flexStability} → ${expected.globalScores.flexStability}`,
    );
  }

  if (manifest.globalScores.recommendation !== expected.globalScores.recommendation) {
    errors.push(
      `globalScores.recommendation drift: ${manifest.globalScores.recommendation} → ${expected.globalScores.recommendation}`,
    );
  }

  for (const report of reports) {
    const key = report.route;
    const frozen = manifest.routeScores[key];
    const live = expected.routeScores[key];
    if (!frozen) {
      errors.push(`missing routeScores entry for ${key}`);
      continue;
    }
    if (uiFinalRouteScoreFingerprint(report) !== `${key}|${live.flexSafety}|${live.overflowSafety}|${live.uiOsCompatibility}|${live.layoutStability}|${live.overall}|${live.status}`) {
      if (frozen.status !== live.status || frozen.overall !== live.overall) {
        errors.push(`route ${key} score drift: overall ${frozen.overall}→${live.overall}, status ${frozen.status}→${live.status}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
