/**
 * Export live security catalog baseline (read-only).
 * Usage: npx tsx scripts/export-security-catalog-baseline.ts [--out docs/security/baseline.json]
 *
 * Requires DATABASE_URL or linked Supabase project via `npx supabase db execute`.
 * Falls back to docs/security/baseline-pre-remediation-2026-08-26.json when --offline.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DEFAULT_OUT = path.join(ROOT, "docs/security/baseline-pre-remediation-2026-08-26.json");
const FALLBACK = DEFAULT_OUT;

const EXPORT_SQL = `
SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)::text
FROM (
  SELECT
    p.oid,
    p.proname AS name,
    pg_get_function_identity_arguments(p.oid) AS args,
    r.rolname AS owner,
    p.prosecdef AS security_definer,
    p.proconfig AS config,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_exec,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec,
    (
      pg_get_functiondef(p.oid) ILIKE '%auth.uid()%'
      OR pg_get_functiondef(p.oid) ILIKE '%rbac_%'
    ) AS has_auth_check,
    (
      pg_get_functiondef(p.oid) ~* '\\m(insert|update|delete|truncate)\\M'
      OR pg_get_functiondef(p.oid) ILIKE '%perform net.http%'
      OR pg_get_functiondef(p.oid) ILIKE '%perform pg_notify%'
    ) AS is_mutating
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_roles r ON r.oid = p.proowner
  WHERE n.nspname = 'public' AND p.prosecdef
  ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
) t;
`;

const DEFAULT_ACL_SQL = `
SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)::text
FROM (
  SELECT defaclrole::regrole::text AS grantor, n.nspname AS schema, defaclobjtype,
         defaclacl::text AS defaclacl
  FROM pg_default_acl d
  JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE defaclobjtype = 'f' AND n.nspname IN ('public', 'storage')
  ORDER BY grantor, schema
) t;
`;

function runSql(sql: string): string | null {
  const tmp = path.join(ROOT, ".tmp-security-export.sql");
  fs.writeFileSync(tmp, sql);
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  fs.unlinkSync(tmp);
  if (r.status !== 0) return null;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const jsonMatch = out.match(/\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : null;
}

function main() {
  const args = process.argv.slice(2);
  const offline = args.includes("--offline");
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? path.resolve(args[outIdx + 1]!) : DEFAULT_OUT;

  if (offline || !process.env.DATABASE_URL) {
    if (!fs.existsSync(FALLBACK)) {
      console.error("No linked DB and no fallback baseline at", FALLBACK);
      process.exit(1);
    }
    if (outPath !== FALLBACK) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.copyFileSync(FALLBACK, outPath);
    }
    console.log("offline baseline:", outPath);
    return;
  }

  const fnJson = runSql(EXPORT_SQL);
  const aclJson = runSql(DEFAULT_ACL_SQL);
  if (!fnJson) {
    console.error("Live export failed; use --offline with captured baseline");
    process.exit(1);
  }

  const functions = JSON.parse(fnJson) as unknown[];
  const defaultAcls = aclJson ? (JSON.parse(aclJson) as unknown[]) : [];
  const grantorRoles = [...new Set((defaultAcls as { grantor: string }[]).map((a) => a.grantor))];

  const baseline = {
    generatedAt: new Date().toISOString(),
    source: "live-read-only",
    summary: {
      securityDefinerCount: functions.length,
      anonExecuteCount: (functions as { anon_exec: boolean }[]).filter((f) => f.anon_exec).length,
      publicExecuteCount: (functions as { public_exec: boolean }[]).filter((f) => f.public_exec).length,
      mutatingAnonExecuteCount: (functions as { anon_exec: boolean; is_mutating: boolean }[]).filter(
        (f) => f.anon_exec && f.is_mutating,
      ).length,
    },
    defaultAcls,
    grantorRoles,
    functions: (functions as Record<string, unknown>[]).map((f) => ({
      name: f.name,
      args: f.args,
      owner: f.owner,
      securityDefiner: f.security_definer,
      config: f.config,
      grants: {
        anon: f.anon_exec,
        authenticated: f.authenticated_exec,
        serviceRole: f.service_role_exec,
        public: f.public_exec,
      },
      isMutating: f.is_mutating,
      hasAuthCheck: f.has_auth_check,
    })),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2));
  console.log("exported", functions.length, "definer functions →", outPath);
}

main();
