#!/usr/bin/env npx tsx
/**
 * Production certification bundle (GitHub Artifact primary storage).
 * npm run control:certify [-- --dry-run] [-- --out=dir]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONTROL_CONTRACT_VERSION, CONTROL_REGISTRY_VERSION } from "@/lib/control/contract";
import { runTier } from "@/lib/control/executor";

function sha256Content(content: string | Buffer): string {
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

function sha256File(filePath: string): string {
  return sha256Content(fs.readFileSync(filePath));
}

function hashSuiteFiles(): string {
  const suiteDir = path.join(process.cwd(), "lib/control/suites");
  const files = fs
    .readdirSync(suiteDir)
    .filter((f) => f.endsWith(".ts"))
    .sort();
  const concat = files.map((f) => fs.readFileSync(path.join(suiteDir, f), "utf8")).join("\n");
  return sha256Content(concat);
}

function hashCatalog(): string {
  const catalogPath = path.join(process.cwd(), "lib/control/catalog.ts");
  const content = fs.readFileSync(catalogPath, "utf8");
  const keys = [...content.matchAll(/"([^"]+)":\s*\{\s*resolve/g)].map((m) => m[1]).sort();
  return sha256Content(keys.join("\n"));
}

function hashRegistry(): string {
  const registryPath = path.join(process.cwd(), "lib/control/registry.ts");
  return sha256Content(fs.readFileSync(registryPath, "utf8"));
}

function controlsHashFromReport(results: { controlId: string; outcome: string }[]): string {
  const sorted = [...results].sort((a, b) => a.controlId.localeCompare(b.controlId));
  const payload = sorted.map((r) => `${r.controlId}:${r.outcome}`).join("\n");
  return sha256Content(payload);
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  const runId = process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  const outDir = outArg ?? path.join(process.cwd(), "control-certification", runId);

  if (dryRun) {
    console.log("control:certify — dry-run PASS");
    console.log(
      JSON.stringify(
        {
          controlContractVersion: CONTROL_CONTRACT_VERSION,
          controlRegistryVersion: CONTROL_REGISTRY_VERSION,
          note: "full cert bundle skipped in dry-run",
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const report = runTier("cert", { runId });
  const commit = process.env.GITHUB_SHA ?? "local";
  const generatedAt = new Date().toISOString();

  const certification = {
    version: "1.0",
    controlContractVersion: CONTROL_CONTRACT_VERSION,
    controlRegistryVersion: CONTROL_REGISTRY_VERSION,
    commit,
    timestamp: generatedAt,
    tier: "cert",
    controls: Object.fromEntries(report.results.map((r) => [r.controlId, r.outcome])),
    blockers: report.blockers,
    warnings: report.summary.warning,
    residueOperative: null,
  };

  const certPath = path.join(outDir, "certification.json");
  const reportPath = path.join(outDir, "control-report.json");
  const envPath = path.join(outDir, "environment.json");
  const commitPath = path.join(outDir, "commit.txt");
  const checksumsPath = path.join(outDir, "checksums.json");
  const manifestPath = path.join(outDir, "manifest.json");

  const environment = {
    tier: "cert",
    environment: "production",
    node: process.version,
    ci: process.env.CI === "true",
  };

  fs.writeFileSync(certPath, `${JSON.stringify(certification, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(envPath, `${JSON.stringify(environment, null, 2)}\n`);
  fs.writeFileSync(commitPath, `${commit}\n`);

  const bundleFiles = [
    "certification.json",
    "control-report.json",
    "environment.json",
    "commit.txt",
  ] as const;

  const checksums = Object.fromEntries(bundleFiles.map((f) => [f, sha256File(path.join(outDir, f))]));
  fs.writeFileSync(checksumsPath, `${JSON.stringify(checksums, null, 2)}\n`);

  const manifest = {
    artifactVersion: "1.0",
    controlContractVersion: CONTROL_CONTRACT_VERSION,
    controlRegistryVersion: CONTROL_REGISTRY_VERSION,
    commit,
    environment: "production",
    tier: "cert",
    generatedBy: "control-certify",
    generatedAt,
    controlsHash: controlsHashFromReport(report.results),
    registryHash: hashRegistry(),
    catalogHash: hashCatalog(),
    suiteHash: hashSuiteFiles(),
    files: [...bundleFiles, "checksums.json", "manifest.json"],
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Certification bundle: ${outDir}`);
  console.log(`manifest controlsHash=${manifest.controlsHash.slice(0, 19)}…`);
  console.log(`blockers=${report.blockers}`);
  process.exit(report.blockers > 0 ? 1 : 0);
}

main();
