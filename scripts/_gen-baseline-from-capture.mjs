import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const capturePath =
  process.argv[2] ??
  "C:/Users/gnamo/.cursor/projects/f-Projects-gestionale-cab/agent-tools/4a4632b2-e7ae-45a5-a653-fc2124ae849a.txt";

const raw = fs.readFileSync(capturePath, "utf8");
let functions;
if (raw.trimStart().startsWith("{")) {
  const outer = JSON.parse(raw);
  const inner = outer.result ?? "";
  const m =
    inner.match(/<untrusted-data-[^>]+>\n(\[[\s\S]*?\])\n<\/untrusted-data/) ??
    inner.match(/<untrusted-data-[^>]+>\\n(\[[\s\S]*?\])\\n<\/untrusted-data/);
  if (!m) throw new Error("parse fail (wrapped)");
  functions = JSON.parse(m[1]);
} else {
  const m = raw.match(/<untrusted-data-[^>]+>\n(\[[\s\S]*?\])\n<\/untrusted-data/);
  if (!m) throw new Error("parse fail");
  functions = JSON.parse(m[1]);
}
const baseline = {
  generatedAt: "2026-08-26T00:00:00.000Z",
  projectRef: "oxmnuovsgenqkuwfolqh",
  source: "live-read-only-supabase-mcp",
  summary: {
    securityDefinerCount: functions.length,
    anonExecuteCount: functions.filter((f) => f.anon_exec).length,
    authenticatedExecuteCount: functions.filter((f) => f.authenticated_exec).length,
    serviceRoleExecuteCount: functions.filter((f) => f.service_role_exec).length,
    withoutAuthCheckCount: functions.filter(
      (f) => !f.has_auth_check && !f.name.startsWith("trg_"),
    ).length,
  },
  defaultAcls: [
    {
      grantor: "postgres",
      schema: "public",
      defaclobjtype: "f",
      defaclacl:
        "{postgres=X/postgres,supabase_admin=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    },
    {
      grantor: "supabase_admin",
      schema: "public",
      defaclobjtype: "f",
      defaclacl:
        "{postgres=X/supabase_admin,supabase_admin=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}",
    },
    {
      grantor: "postgres",
      schema: "storage",
      defaclobjtype: "f",
      defaclacl:
        "{postgres=X/postgres,supabase_admin=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    },
    {
      grantor: "supabase_admin",
      schema: "storage",
      defaclobjtype: "f",
      defaclacl:
        "{postgres=X/supabase_admin,supabase_admin=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}",
    },
  ],
  grantorRoles: ["postgres", "supabase_admin"],
  functions: functions.map((f) => ({
    name: f.name,
    args: f.args,
    owner: f.owner,
    securityDefiner: f.security_definer,
    config: f.config,
    grants: {
      anon: f.anon_exec,
      authenticated: f.authenticated_exec,
      serviceRole: f.service_role_exec,
    },
    hasAuthCheck: f.has_auth_check,
  })),
  policySnapshot: {
    operative_history_cases: ["ohc_read_authenticated USING(true)"],
    operative_history_signals: ["ohs_read_authenticated USING(true)"],
    tkb_draft_store: [
      "tkb_draft_read_authenticated USING(true)",
      "tkb_draft_insert_authenticated",
      "tkb_draft_update_authenticated",
    ],
    tkb_published_snapshots: ["tkb_snapshots_insert_security"],
    health_score_runs: ["health_score_runs_select_auth"],
    organizations: ["legacy org helpers dropped in 20260910120005"],
  },
};

const outDir = path.join(ROOT, "docs/security");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "baseline-pre-remediation-2026-08-26.json"),
  JSON.stringify(baseline, null, 2),
);
console.log(
  "baseline written:",
  functions.length,
  "definer",
  baseline.summary.anonExecuteCount,
  "anon",
);
