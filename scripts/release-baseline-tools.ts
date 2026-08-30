/**
 * ponytail: Release baseline candidate / promote / check / drift + certification completeness.
 */
import { execSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DATE = process.env.RELEASE_BASELINE_DATE ?? "2026-08-30";
const AUDIT = join(ROOT, "docs/audit");
const CONTRACT_PATH = join(ROOT, "docs/release-gate-contract.json");
const RC_JSON = join(AUDIT, `release-candidate-${DATE}.json`);
const MATRIX_MD = join(AUDIT, `full-regression-matrix-${DATE}.md`);
const INVENTORY_JSON = join(AUDIT, `phase4-failure-inventory-${DATE}.json`);
const CANDIDATE_DIR = join(ROOT, `docs/release-baseline-candidates/${DATE}`);
const OFFICIAL_DIR = join(ROOT, `docs/release-baseline/${DATE}`);
const CI_CERT_DIR = join(AUDIT, `ci-certification-${DATE}`);

export type GateStatus = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "SKIP";
export type CertificationStatus =
  | "LOCAL_VERIFIED"
  | "CI_PENDING"
  | "CERTIFIED"
  | "NOT_CERTIFIED";
export type RegressionLevel = "PASS" | "FAIL";
export type CiCertLevel = "PENDING" | "PASS" | "FAIL" | "BLOCKED";

type ContractGate = {
  id: string;
  severity: string;
  legacy: string[];
  controlPlane?: string;
};

type ContractDoc = {
  version: string;
  required: ContractGate[];
};

type GateEvidence = {
  command: string;
  commit: string;
  timestamp: string;
  logRef?: string;
  source?: string;
};

type GateResultEntry = {
  contractId: string;
  legacy: string[];
  status: GateStatus;
  evidence: GateEvidence;
  tier?: string;
  note?: string;
};

type GateResultsDoc = {
  generatedAt: string;
  commit: string;
  contractVersion: string;
  gates: Record<string, GateResultEntry>;
};

type ReleaseBaselineDoc = {
  date: string;
  status: "CANDIDATE" | "OFFICIAL";
  commit: string;
  generatedAt: string;
  contractVersion: string;
  certificationStatus: CertificationStatus;
  releaseReady: boolean;
  localFullRegression: RegressionLevel;
  ciReleaseCertification: CiCertLevel;
  paths: {
    gateResults: string;
    markdown: string;
    environment: string;
    promotionManifest?: string;
    promotedFrom?: string;
  };
};

const LIVE_GATE_IDS = new Set([
  "data.supabase.connection",
  "data.production.readiness",
  "data.publication.sanity",
  "runtime.e2e.smoke",
  "runtime.smoke.cleanup",
]);

const LOCAL_GATE_IDS = new Set([
  "security.typescript.compile",
  "build.production",
  "security.rbac.matrix",
  "security.rbac.hardening",
  "security.remediation",
  "design.ux.enforce",
  "design.ui.consistency",
  "design.mobile.gate",
  "design.ios.static",
  "design.structural.smoke",
  "runtime.regression.core",
  "design.flex.eslint",
  "design.flex.freeze",
  "governance.release.contract",
]);

export function sh(cmd: string): string {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", maxBuffer: 80 * 1024 * 1024 }).trim();
}

export function hasSupabaseSecrets(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function smokePlaywrightSkip(): boolean {
  if (process.env.SMOKE_SKIP === "1") return true;
  return !(
    process.env.SMOKE_ADMIN_EMAIL?.trim() &&
    process.env.SMOKE_ADMIN_PASSWORD?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function loadContract(): ContractDoc {
  return JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as ContractDoc;
}

export function legacyKey(legacy: string): string {
  return legacy.replace(/^npm run /, "");
}

export function legacyRunCommand(legacy: string): string {
  const key = legacyKey(legacy);
  if (key === "verify-supabase-ci-env") return "npx tsx scripts/verify-supabase-ci-env.ts";
  if (key === "release-ready-contract")
    return "npx tsx lib/control/release-ready-contract.test.ts";
  if (legacy.startsWith("npm run ")) return legacy;
  return `npm run ${key}`;
}

export function runGate(cmd: string): { status: GateStatus; output: string } {
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: "utf8" });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status === 0) return { status: "PASS", output };
  return { status: "FAIL", output };
}

function rel(p: string): string {
  return p.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", "");
}

export function gateSkipReason(contractId: string, legacy: string): string | null {
  const key = legacyKey(legacy);
  if (
    (key === "verify-supabase-ci-env" ||
      key === "production:check" ||
      key === "ci:supabase:publication") &&
    !hasSupabaseSecrets()
  ) {
    return "Supabase secrets absent";
  }
  if (key === "smoke:playwright" && smokePlaywrightSkip()) {
    return "Smoke credentials absent or SMOKE_SKIP=1";
  }
  if (contractId === "runtime.smoke.cleanup" && smokePlaywrightSkip()) {
    return "Smoke cleanup requires smoke session";
  }
  return null;
}

function runContractGate(
  gate: ContractGate,
  commit: string,
  timestamp: string,
): GateResultEntry {
  const legacy = gate.legacy[0] ?? gate.id;
  const skip = gateSkipReason(gate.id, legacy);
  if (skip) {
    return {
      contractId: gate.id,
      legacy: gate.legacy.map(legacyKey),
      status: "BLOCKED",
      evidence: {
        command: legacyRunCommand(legacy),
        commit,
        timestamp,
        source: "environment-blocked",
        logRef: skip,
      },
      tier: LIVE_GATE_IDS.has(gate.id) ? "live" : "static",
      note: skip,
    };
  }
  const cmd = legacyRunCommand(legacy);
  const result = runGate(cmd);
  return {
    contractId: gate.id,
    legacy: gate.legacy.map(legacyKey),
    status: result.status,
    evidence: {
      command: cmd,
      commit,
      timestamp,
      source: "release-baseline-tools",
    },
    tier: LIVE_GATE_IDS.has(gate.id) ? "live" : "static",
  };
}

function readInventoryGates(): Record<string, GateStatus> | null {
  if (!existsSync(INVENTORY_JSON)) return null;
  const inv = JSON.parse(readFileSync(INVENTORY_JSON, "utf8")) as { gates?: Record<string, GateStatus> };
  return inv.gates ?? null;
}

function inventoryStatusForGate(gate: ContractGate, inventory: Record<string, GateStatus> | null): GateStatus | null {
  if (!inventory) return null;
  for (const legacy of gate.legacy) {
    const key = legacyKey(legacy);
    if (inventory[key]) return inventory[key];
  }
  return null;
}

function buildGateResults(useInventory = true): GateResultsDoc {
  const contract = loadContract();
  const commit = sh("git rev-parse HEAD");
  const timestamp = new Date().toISOString();
  const inventory = useInventory ? readInventoryGates() : null;
  const gates: Record<string, GateResultEntry> = {};

  for (const gate of contract.required) {
    const invStatus = inventoryStatusForGate(gate, inventory);
    if (invStatus && invStatus !== "NOT_RUN") {
      const legacy = gate.legacy[0] ?? gate.id;
      gates[gate.id] = {
        contractId: gate.id,
        legacy: gate.legacy.map(legacyKey),
        status: invStatus,
        evidence: {
          command: legacyRunCommand(legacy),
          commit,
          timestamp,
          source: rel(INVENTORY_JSON),
        },
        tier: LIVE_GATE_IDS.has(gate.id) ? "live" : "static",
      };
      continue;
    }
    gates[gate.id] = runContractGate(gate, commit, timestamp);
  }

  return {
    generatedAt: timestamp,
    commit,
    contractVersion: contract.version,
    gates,
  };
}

function summarizeRegression(gateResults: GateResultsDoc): {
  localFullRegression: RegressionLevel;
  ciReleaseCertification: CiCertLevel;
} {
  let localFail = false;
  let ciFail = false;
  let ciBlocked = false;
  let ciPending = false;

  for (const [id, entry] of Object.entries(gateResults.gates)) {
    if (LOCAL_GATE_IDS.has(id)) {
      if (entry.status === "FAIL") localFail = true;
      if (entry.status === "BLOCKED" || entry.status === "NOT_RUN") localFail = true;
    }
    if (LIVE_GATE_IDS.has(id)) {
      if (entry.status === "FAIL") ciFail = true;
      if (entry.status === "BLOCKED" || entry.status === "NOT_RUN") {
        ciBlocked = true;
        ciPending = true;
      }
    }
  }

  const ciEvidence = existsSync(CI_CERT_DIR) && readdirSync(CI_CERT_DIR).length > 0;
  if (ciEvidence && !ciFail && !ciBlocked) {
    return { localFullRegression: localFail ? "FAIL" : "PASS", ciReleaseCertification: "PASS" };
  }
  if (ciFail) {
    return { localFullRegression: localFail ? "FAIL" : "PASS", ciReleaseCertification: "FAIL" };
  }
  if (ciBlocked || ciPending) {
    return {
      localFullRegression: localFail ? "FAIL" : "PASS",
      ciReleaseCertification: ciEvidence ? "PENDING" : "BLOCKED",
    };
  }
  return {
    localFullRegression: localFail ? "FAIL" : "PASS",
    ciReleaseCertification: "PASS",
  };
}

function deriveCertificationStatus(
  localFullRegression: RegressionLevel,
  ciReleaseCertification: CiCertLevel,
): CertificationStatus {
  if (localFullRegression === "FAIL" || ciReleaseCertification === "FAIL") return "NOT_CERTIFIED";
  if (ciReleaseCertification === "PASS") return "CERTIFIED";
  if (ciReleaseCertification === "PENDING") return "CI_PENDING";
  if (ciReleaseCertification === "BLOCKED" && localFullRegression === "PASS") return "LOCAL_VERIFIED";
  return "NOT_CERTIFIED";
}

function readRcSnapshot(): Record<string, unknown> | null {
  if (!existsSync(RC_JSON)) return null;
  return JSON.parse(readFileSync(RC_JSON, "utf8")) as Record<string, unknown>;
}

function buildEnvironmentMd(commit: string): string {
  const lines = [
    `# Release environment — ${DATE}`,
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- commit: ${commit}`,
    `- node: ${process.version}`,
    `- npm: ${sh("npm -v")}`,
    `- RELEASE_BASELINE_DATE: ${DATE}`,
    "",
    "## Secret presence (values not recorded)",
    "",
    `- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "present" : "absent"}`,
    `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ? "present" : "absent"}`,
    `- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "present" : "absent"}`,
    `- SMOKE_ADMIN_EMAIL: ${process.env.SMOKE_ADMIN_EMAIL?.trim() ? "present" : "absent"}`,
    `- SMOKE_ADMIN_PASSWORD: ${process.env.SMOKE_ADMIN_PASSWORD?.trim() ? "present" : "absent"}`,
    `- SMOKE_SKIP: ${process.env.SMOKE_SKIP ?? "unset"}`,
    `- VERCEL_GIT_COMMIT_SHA: ${process.env.VERCEL_GIT_COMMIT_SHA ?? "unset"}`,
    "",
    "## CI certification artifacts",
    "",
    `- path: ${rel(CI_CERT_DIR)}`,
    `- present: ${existsSync(CI_CERT_DIR) && readdirSync(CI_CERT_DIR).length > 0 ? "yes" : "no"}`,
  ];
  return lines.join("\n") + "\n";
}

function buildReleaseBaselineMd(
  baseline: ReleaseBaselineDoc,
  gateResults: GateResultsDoc,
): string {
  const rows = Object.values(gateResults.gates)
    .map(
      (g) =>
        `| ${g.contractId} | ${g.legacy.join(", ")} | ${g.tier ?? "—"} | **${g.status}** | ${g.note ?? "—"} |`,
    )
    .join("\n");
  return [
    `# Release baseline — ${DATE}`,
    "",
    `- status: **${baseline.status}**`,
    `- certificationStatus: **${baseline.certificationStatus}**`,
    `- releaseReady: **${baseline.releaseReady}**`,
    `- localFullRegression: **${baseline.localFullRegression}**`,
    `- ciReleaseCertification: **${baseline.ciReleaseCertification}**`,
    `- commit: \`${baseline.commit}\``,
    `- contractVersion: ${baseline.contractVersion}`,
    "",
    "## Gate results",
    "",
    "| Contract ID | Legacy | Tier | Status | Notes |",
    "|-------------|--------|------|--------|-------|",
    rows,
    "",
    `RC snapshot: ${existsSync(RC_JSON) ? rel(RC_JSON) : "missing"}`,
    `Matrix: ${existsSync(MATRIX_MD) ? rel(MATRIX_MD) : "missing"}`,
    "",
  ].join("\n");
}

function writeCandidateArtifacts(gateResults: GateResultsDoc): ReleaseBaselineDoc {
  mkdirSync(CANDIDATE_DIR, { recursive: true });
  const { localFullRegression, ciReleaseCertification } = summarizeRegression(gateResults);
  const certificationStatus = deriveCertificationStatus(localFullRegression, ciReleaseCertification);
  const releaseReady =
    certificationStatus === "CERTIFIED" &&
    localFullRegression === "PASS" &&
    ciReleaseCertification === "PASS";

  const baseline: ReleaseBaselineDoc = {
    date: DATE,
    status: "CANDIDATE",
    commit: gateResults.commit,
    generatedAt: gateResults.generatedAt,
    contractVersion: gateResults.contractVersion,
    certificationStatus,
    releaseReady,
    localFullRegression,
    ciReleaseCertification,
    paths: {
      gateResults: "gate-results.json",
      markdown: "release-baseline.md",
      environment: "environment.md",
      promotionManifest: "promotion-manifest.json",
    },
  };

  writeFileSync(join(CANDIDATE_DIR, "gate-results.json"), JSON.stringify(gateResults, null, 2));
  writeFileSync(join(CANDIDATE_DIR, "release-baseline.json"), JSON.stringify(baseline, null, 2));
  writeFileSync(join(CANDIDATE_DIR, "release-baseline.md"), buildReleaseBaselineMd(baseline, gateResults));
  writeFileSync(join(CANDIDATE_DIR, "environment.md"), buildEnvironmentMd(gateResults.commit));

  const promotionManifest = {
    candidateCreatedAt: gateResults.generatedAt,
    commit: gateResults.commit,
    certificationStatus,
    releaseReady,
    localFullRegression,
    ciReleaseCertification,
    ciRunUrl: null as string | null,
    promotionEligible:
      certificationStatus === "CERTIFIED" &&
      ciReleaseCertification === "PASS" &&
      localFullRegression === "PASS",
    candidatePath: rel(CANDIDATE_DIR),
  };
  writeFileSync(
    join(CANDIDATE_DIR, "promotion-manifest.json"),
    JSON.stringify(promotionManifest, null, 2),
  );

  return baseline;
}

function commandToLegacyKey(command: string): string {
  if (command.startsWith("npm run ")) return command.replace(/^npm run /, "");
  if (command.includes("release-ready-contract")) return "release-ready-contract";
  if (command.includes("verify-supabase-ci-env")) return "verify-supabase-ci-env";
  return command;
}

type MatrixRow = {
  contractId: string;
  status?: string;
  command?: string;
  legacyKey?: string;
};

function parseMatrixMd(): MatrixRow[] {
  if (!existsSync(MATRIX_MD)) return [];
  const rows: MatrixRow[] = [];
  for (const line of readFileSync(MATRIX_MD, "utf8").split("\n")) {
    if (!line.startsWith("|") || line.includes("Gate ID")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    const contractId = cells[0] === "—" ? "" : cells[0];
    const command = cells[1]?.replace(/`/g, "").trim() ?? "";
    const legacyKey = commandToLegacyKey(command);
    const statusMatch = cells[3]?.match(/\*\*([A-Z_]+)\*\*/);
    const status = statusMatch?.[1];
    rows.push({ contractId, command, legacyKey, status });
  }
  return rows;
}

function matrixCoversContract(req: ContractGate, matrixRows: MatrixRow[]): boolean {
  const legacyKeys = new Set(req.legacy.map(legacyKey));
  for (const row of matrixRows) {
    if (row.contractId === req.id) return true;
    if (row.legacyKey && legacyKeys.has(row.legacyKey)) return true;
    if (row.command) {
      const cmdKey = row.command.replace(/^npm run /, "");
      if (legacyKeys.has(cmdKey)) return true;
    }
  }
  return false;
}

function loadGateResultsFromPath(dir: string): GateResultsDoc | null {
  const path = join(dir, "gate-results.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as GateResultsDoc;
}

function loadBaselineFromPath(dir: string): ReleaseBaselineDoc | null {
  const path = join(dir, "release-baseline.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ReleaseBaselineDoc;
}

function completenessCheck(opts: {
  baseline?: ReleaseBaselineDoc | null;
  gateResults?: GateResultsDoc | null;
  matrixRows?: MatrixRow[];
}): { ok: boolean; failures: string[] } {
  const contract = loadContract();
  const failures: string[] = [];
  const gateResults =
    opts.gateResults ??
    loadGateResultsFromPath(CANDIDATE_DIR) ??
    loadGateResultsFromPath(OFFICIAL_DIR) ??
    buildGateResults(true);
  const baseline =
    opts.baseline ??
    loadBaselineFromPath(CANDIDATE_DIR) ??
    loadBaselineFromPath(OFFICIAL_DIR);
  const matrixRows = opts.matrixRows ?? parseMatrixMd();

  for (const req of contract.required) {
    const entry = gateResults.gates[req.id];
    if (!entry) {
      failures.push(`required gate missing from gate-results: ${req.id}`);
      continue;
    }
    if (!entry.status) {
      failures.push(`required gate without status: ${req.id}`);
    }
    if (!entry.evidence?.command || !entry.evidence?.commit || !entry.evidence?.timestamp) {
      failures.push(`required gate without evidence: ${req.id}`);
    }
    if (!matrixCoversContract(req, matrixRows)) {
      failures.push(`required gate absent from regression matrix: ${req.id}`);
    }
  }

  if (baseline) {
    if (baseline.releaseReady) {
      for (const req of contract.required) {
        const entry = gateResults.gates[req.id];
        if (entry?.status === "BLOCKED" && !existsSync(CI_CERT_DIR)) {
          failures.push(`releaseReady=true but ${req.id} BLOCKED without CI evidence`);
        }
        if (LIVE_GATE_IDS.has(req.id) && entry?.status !== "PASS" && !existsSync(CI_CERT_DIR)) {
          failures.push(`releaseReady=true but live gate ${req.id} lacks CI evidence`);
        }
      }
    }
    if (baseline.certificationStatus === "CERTIFIED" && baseline.ciReleaseCertification !== "PASS") {
      failures.push("certificationStatus=CERTIFIED but ciReleaseCertification != PASS");
    }
    if (
      baseline.certificationStatus === "CERTIFIED" &&
      existsSync(OFFICIAL_DIR) &&
      !existsSync(join(OFFICIAL_DIR, "promoted-from.json"))
    ) {
      failures.push(
        "certificationStatus=CERTIFIED with official baseline but missing promoted-from.json",
      );
    }
  }

  const rc = readRcSnapshot();
  if (rc) {
    const rcCommit = rc.commit as string | undefined;
    if (rcCommit && rcCommit !== gateResults.commit) {
      failures.push(`RC snapshot commit mismatch: rc=${rcCommit} gates=${gateResults.commit}`);
    }
    if (rc.certifiableTree === false) {
      failures.push("RC snapshot certifiableTree coherence failure");
    }
    const wt = rc.workingTree as { unknownChanges?: number; untrackedUnknown?: number } | undefined;
    if (wt && ((wt.unknownChanges ?? 0) > 0 || (wt.untrackedUnknown ?? 0) > 0)) {
      failures.push("RC snapshot workingTree has unknown/untracked changes");
    }
  }

  return { ok: failures.length === 0, failures };
}

function cmdCompleteness() {
  const result = completenessCheck({});
  if (result.ok) {
    console.log("release:certification:completeness — PASS");
    return;
  }
  console.error("release:certification:completeness — FAIL");
  for (const f of result.failures) console.error(`- ${f}`);
  process.exit(1);
}

function cmdCandidate() {
  const gateResults = buildGateResults(true);
  const baseline = writeCandidateArtifacts(gateResults);
  console.log("release:baseline:candidate written", {
    path: rel(CANDIDATE_DIR),
    certificationStatus: baseline.certificationStatus,
    releaseReady: baseline.releaseReady,
    localFullRegression: baseline.localFullRegression,
    ciReleaseCertification: baseline.ciReleaseCertification,
  });
}

function copyCandidateToOfficial(baseline: ReleaseBaselineDoc, gateResults: GateResultsDoc) {
  mkdirSync(OFFICIAL_DIR, { recursive: true });
  for (const name of [
    "gate-results.json",
    "release-baseline.json",
    "release-baseline.md",
    "environment.md",
    "promotion-manifest.json",
  ]) {
    copyFileSync(join(CANDIDATE_DIR, name), join(OFFICIAL_DIR, name));
  }
  const official: ReleaseBaselineDoc = {
    ...baseline,
    status: "OFFICIAL",
    releaseReady: true,
    certificationStatus: "CERTIFIED",
    localFullRegression: "PASS",
    ciReleaseCertification: "PASS",
    paths: {
      gateResults: "gate-results.json",
      markdown: "release-baseline.md",
      environment: "environment.md",
      promotedFrom: "promoted-from.json",
    },
  };
  writeFileSync(join(OFFICIAL_DIR, "release-baseline.json"), JSON.stringify(official, null, 2));
  writeFileSync(
    join(OFFICIAL_DIR, "release-baseline.md"),
    buildReleaseBaselineMd(official, gateResults),
  );
  const manifestPath = join(CANDIDATE_DIR, "promotion-manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
  writeFileSync(
    join(OFFICIAL_DIR, "promoted-from.json"),
    JSON.stringify(
      {
        promotedAt: new Date().toISOString(),
        candidatePath: rel(CANDIDATE_DIR),
        candidateCommit: gateResults.commit,
        promotionManifest: manifest,
        ciCertificationPath: rel(CI_CERT_DIR),
      },
      null,
      2,
    ),
  );
}

function cmdPromote() {
  const candidateBaseline = loadBaselineFromPath(CANDIDATE_DIR);
  const gateResults = loadGateResultsFromPath(CANDIDATE_DIR);
  if (!candidateBaseline || !gateResults) {
    console.error("Missing candidate baseline — run release:baseline:candidate first");
    process.exit(1);
  }
  if (candidateBaseline.certificationStatus !== "CERTIFIED") {
    console.error(
      `Promote blocked: certificationStatus=${candidateBaseline.certificationStatus} (need CERTIFIED)`,
    );
    process.exit(1);
  }
  if (candidateBaseline.ciReleaseCertification !== "PASS") {
    console.error(
      `Promote blocked: ciReleaseCertification=${candidateBaseline.ciReleaseCertification} (need PASS)`,
    );
    process.exit(1);
  }
  const complete = completenessCheck({ baseline: candidateBaseline, gateResults });
  if (!complete.ok) {
    console.error("Promote blocked: completeness check failed");
    for (const f of complete.failures) console.error(`- ${f}`);
    process.exit(1);
  }
  copyCandidateToOfficial(candidateBaseline, gateResults);
  console.log("release:baseline:promote — OFFICIAL baseline written", rel(OFFICIAL_DIR));
}

function cmdCheck() {
  const target = process.argv[3] ?? (existsSync(OFFICIAL_DIR) ? "official" : "candidate");
  const dir = target === "official" ? OFFICIAL_DIR : CANDIDATE_DIR;
  const label = target === "official" ? "official" : "candidate";
  if (!existsSync(dir)) {
    console.error(`Missing ${label} baseline at ${rel(dir)}`);
    process.exit(1);
  }
  const baseline = loadBaselineFromPath(dir);
  const gateResults = loadGateResultsFromPath(dir);
  const failures: string[] = [];
  if (!baseline) failures.push("release-baseline.json missing or invalid");
  if (!gateResults) failures.push("gate-results.json missing or invalid");
  if (!existsSync(join(dir, "environment.md"))) failures.push("environment.md missing");
  if (baseline) {
    const requiredFields: Array<keyof ReleaseBaselineDoc> = [
      "certificationStatus",
      "releaseReady",
      "localFullRegression",
      "ciReleaseCertification",
    ];
    for (const field of requiredFields) {
      if (baseline[field] === undefined || baseline[field] === null) {
        failures.push(`release-baseline.json missing field: ${field}`);
      }
    }
    if (baseline.releaseReady && baseline.certificationStatus !== "CERTIFIED") {
      failures.push("releaseReady=true but certificationStatus != CERTIFIED");
    }
    if (baseline.status === "OFFICIAL" && !existsSync(join(dir, "promoted-from.json"))) {
      failures.push("OFFICIAL baseline missing promoted-from.json");
    }
  }
  const complete = completenessCheck({ baseline, gateResults });
  failures.push(...complete.failures);

  const secretPattern = /(service_role|password|secret|api_key)\s*[:=]\s*['"][^'"]+['"]/i;
  for (const name of readdirSync(dir)) {
    const content = readFileSync(join(dir, name), "utf8");
    if (secretPattern.test(content)) failures.push(`${name} may contain secret values`);
  }

  if (failures.length === 0) {
    console.log(`release:baseline:check — PASS (${label})`, {
      certificationStatus: baseline?.certificationStatus,
      releaseReady: baseline?.releaseReady,
    });
    return;
  }
  console.error(`release:baseline:check — FAIL (${label})`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

function cmdDrift() {
  if (!existsSync(OFFICIAL_DIR)) {
    console.error("No official baseline — drift requires docs/release-baseline/" + DATE);
    process.exit(1);
  }
  const official = loadGateResultsFromPath(OFFICIAL_DIR);
  if (!official) {
    console.error("Official gate-results.json missing");
    process.exit(1);
  }
  const current = buildGateResults(true);
  const contract = loadContract();
  console.log("=== Release baseline drift ===\n");
  console.log(`Official: ${rel(OFFICIAL_DIR)}`);
  console.log(`Current commit: ${current.commit}`);
  console.log(`Official commit: ${official.commit}\n`);

  let driftCount = 0;
  for (const req of contract.required) {
    const before = official.gates[req.id];
    const after = current.gates[req.id];
    if (!before || !after) continue;
    if (before.status !== after.status) {
      driftCount++;
      console.log(`${req.id}: ${before.status} → ${after.status}`);
    }
  }
  if (driftCount === 0) {
    console.log("No gate status drift vs official baseline.");
  } else {
    console.log(`\nTotal drifted gates: ${driftCount}`);
    process.exit(1);
  }
}

const isDirectRun = Boolean(
  process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release-baseline-tools.ts"),
);

if (isDirectRun) {
  const cmd = process.argv[2] ?? "help";
  if (cmd === "completeness") cmdCompleteness();
  else if (cmd === "candidate") cmdCandidate();
  else if (cmd === "promote") cmdPromote();
  else if (cmd === "check") cmdCheck();
  else if (cmd === "drift") cmdDrift();
  else {
    console.log(
      "Usage: completeness | candidate | promote | check [candidate|official] | drift",
    );
    process.exit(cmd === "help" ? 0 : 1);
  }
}
