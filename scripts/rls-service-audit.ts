/**
 * Audit RLS: confronta tabelle usate in src/services/*.service.ts con policy RLS nelle migration.
 * Uso: npx tsx scripts/rls-service-audit.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVICES_DIR = path.join(ROOT, "src", "services");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const TABLE_RE = /\.from\(\s*["']([a-z_][a-z0-9_]*)["']/g;

function collectServiceTables(): Set<string> {
  const tables = new Set<string>();
  const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith(".service.ts"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(SERVICES_DIR, file), "utf8");
    let m: RegExpExecArray | null;
    TABLE_RE.lastIndex = 0;
    while ((m = TABLE_RE.exec(content)) !== null) {
      tables.add(m[1]);
    }
  }
  return tables;
}

function collectRlsTables(): Set<string> {
  const tables = new Set<string>();
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const policyMatches = content.matchAll(/on\s+public\.([a-z_][a-z0-9_]*)/gi);
    for (const m of policyMatches) tables.add(m[1]);
    const enableMatches = content.matchAll(/alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi);
    for (const m of enableMatches) tables.add(m[1]);
  }
  return tables;
}

function main(): void {
  const serviceTables = collectServiceTables();
  const rlsTables = collectRlsTables();

  const missingRls: string[] = [];
  for (const t of [...serviceTables].sort()) {
    if (!rlsTables.has(t)) missingRls.push(t);
  }

  console.log("=== RLS Service Audit ===\n");
  console.log(`Tabelle in services (${serviceTables.size}): ${[...serviceTables].sort().join(", ")}`);
  console.log(`\nTabelle con RLS in migrations (${rlsTables.size}): ${[...rlsTables].sort().join(", ")}`);

  if (missingRls.length === 0) {
    console.log("\nOK: tutte le tabelle usate dai services hanno riferimenti RLS nelle migration.");
    process.exit(0);
  }

  console.log(`\nATTENZIONE: ${missingRls.length} tabella/e senza policy RLS rilevata nelle migration:`);
  for (const t of missingRls) console.log(`  - ${t}`);
  process.exit(1);
}

main();
