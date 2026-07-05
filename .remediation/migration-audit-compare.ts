import fs from "node:fs";
import path from "node:path";

type RemoteRow = { version: string; name: string };

const remote: RemoteRow[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), ".remediation/remote-migrations.json"), "utf8"),
);

const migDir = path.join(process.cwd(), "supabase/migrations");
const local = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

const remoteByKey = new Map(remote.map((r) => [`${r.version}_${r.name}`, r]));
const remoteByName = new Map<string, RemoteRow[]>();
for (const r of remote) {
  const arr = remoteByName.get(r.name) ?? [];
  arr.push(r);
  remoteByName.set(r.name, arr);
}

const localParsed = local.map((f) => {
  const m = f.match(/^(\d{14})_(.+)\.sql$/);
  if (!m) return { file: f, version: null as string | null, name: null as string | null, key: null as string | null };
  return { file: f, version: m[1]!, name: m[2]!, key: `${m[1]}_${m[2]}` };
});

const appliedExact: string[] = [];
const pendingPush: string[] = [];
const versionMismatch: Array<{ local: string; remote: string }> = [];

for (const l of localParsed) {
  if (!l.key) {
    pendingPush.push(`${l.file} (INVALID NAME)`);
    continue;
  }
  if (remoteByKey.has(l.key)) {
    appliedExact.push(l.file);
  } else if (l.name && remoteByName.has(l.name)) {
    const rem = remoteByName.get(l.name)!;
    versionMismatch.push({
      local: l.file,
      remote: rem.map((r) => `${r.version}_${r.name}`).join(", "),
    });
  } else {
    pendingPush.push(l.file);
  }
}

const localNames = new Set(localParsed.filter((l) => l.name).map((l) => l.name!));
const remoteOnly = remote.filter((r) => !localNames.has(r.name));

const byTs = new Map<string, string[]>();
for (const l of localParsed) {
  if (!l.version) continue;
  const arr = byTs.get(l.version) ?? [];
  arr.push(l.file);
  byTs.set(l.version, arr);
}
const dupLocalTs = [...byTs.entries()].filter(([, v]) => v.length > 1);

const remoteDupName = [...remoteByName.entries()].filter(([, v]) => v.length > 1);

const out = {
  summary: {
    local_count: local.length,
    remote_count: remote.length,
    applied_exact_match: appliedExact.length,
    applied_by_name_mismatch_version: versionMismatch.length,
    pending_push: pendingPush.length,
    remote_only_not_in_local: remoteOnly.length,
  },
  applied_exact: appliedExact,
  pending_push: pendingPush,
  version_mismatch: versionMismatch,
  remote_only: remoteOnly.map((r) => `${r.version}_${r.name}`),
  duplicate_local_timestamps: Object.fromEntries(dupLocalTs),
  duplicate_remote_names: Object.fromEntries(
    remoteDupName.map(([name, rows]) => [name, rows.map((r) => r.version)]),
  ),
};

fs.writeFileSync(path.join(process.cwd(), ".remediation/migration-audit-result.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.summary, null, 2));
console.log("\nPENDING:", pendingPush.join("\n"));
