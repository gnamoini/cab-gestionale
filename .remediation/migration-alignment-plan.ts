import fs from "node:fs";
import path from "node:path";

type RemoteRow = { version: string; name: string };

const remote: RemoteRow[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), ".remediation/remote-migrations.json"), "utf8"),
);

const migDir = path.join(process.cwd(), "supabase/migrations");
const localFiles = fs.readdirSync(migDir).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();

const localVersions = localFiles
  .map((f) => f.match(/^(\d{14})_/)?.[1])
  .filter((v): v is string => !!v);

const localByVersion = new Map<string, { file: string; name: string }>();
const duplicateLocalVersions: Record<string, string[]> = {};
for (const f of localFiles) {
  const m = f.match(/^(\d{14})_(.+)\.sql$/);
  if (!m) continue;
  const version = m[1]!;
  const entry = { file: f, name: m[2]! };
  if (localByVersion.has(version)) {
    const arr = duplicateLocalVersions[version] ?? [localByVersion.get(version)!.file];
    arr.push(f);
    duplicateLocalVersions[version] = arr;
  }
  localByVersion.set(version, entry);
}

const localVersionSet = new Set(localVersions);
const remoteByVersion = new Map(remote.map((r) => [r.version, r]));

// Versions on remote without a local file (MCP ghosts blocking db push)
const revertVersions = remote
  .map((r) => r.version)
  .filter((v) => !localVersionSet.has(v))
  .sort();

// After reverting ghosts, local versions missing from remote need repair applied
// except true pending (never applied to DB)
const TRUE_PENDING = new Set(["20260704130100"]);

// Name mismatches at same version (anomaly report)
const versionNameMismatch = [...localByVersion.entries()]
  .filter(([v, l]) => {
    const r = remoteByVersion.get(v);
    return r && r.name !== l.name;
  })
  .map(([v, l]) => ({
    version: v,
    local_name: l.name,
    remote_name: remoteByVersion.get(v)!.name,
  }));

// Force-revert same-version wrong remote name (login_resolve at 20260603120000)
const forceRevertSameVersion = versionNameMismatch
  .filter((m) => m.remote_name !== m.local_name)
  .map((m) => m.version);

const revertAll = [...new Set([...revertVersions, ...forceRevertSameVersion])].sort();

// Recompute applied after force reverts
const remoteAfter = new Set(
  remote.map((r) => r.version).filter((v) => !revertAll.includes(v)),
);
const appliedAll = localVersions
  .filter((v) => !remoteAfter.has(v) && !TRUE_PENDING.has(v))
  .sort();

const plan = {
  summary: {
    local_valid: localFiles.length,
    remote_total: remote.length,
    revert_count: revertAll.length,
    applied_repair_count: appliedAll.length,
    true_pending_push: [...TRUE_PENDING],
  },
  kept_local_migrations: localFiles,
  revert_versions: revertAll,
  repair_applied_versions: appliedAll,
  true_pending_push: localFiles.filter((f) => f.startsWith("20260704130100_")),
  version_name_mismatch: versionNameMismatch,
  duplicate_local_timestamps: duplicateLocalVersions,
  recent_local_gte_20260704120000: localFiles.filter((f) => f >= "20260704120000"),
};

fs.writeFileSync(
  path.join(process.cwd(), ".remediation/migration-alignment-plan.json"),
  JSON.stringify(plan, null, 2),
);

console.log(JSON.stringify(plan.summary, null, 2));
console.log("\nREVERT", revertAll.length);
console.log("APPLIED REPAIR", appliedAll.length);
console.log("PENDING PUSH", plan.true_pending_push);
