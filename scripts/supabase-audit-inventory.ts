/**
 * Inventario statico Supabase: migration, oggetti SQL, cross-ref frontend.
 * Uso: npx tsx scripts/supabase-audit-inventory.ts [--json]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const RBAC_CORE = path.join(ROOT, "supabase", "rbac_core.sql");
const CONFIG_TOML = path.join(ROOT, "supabase", "config.toml");

const SCAN_DIRS = [
  path.join(ROOT, "src"),
  path.join(ROOT, "lib"),
  path.join(ROOT, "components"),
];

type MigrationRecord = {
  file: string;
  timestamp: string;
  slug: string;
  tags: string[];
  tables: string[];
  policies: string[];
  functions: string[];
  triggers: string[];
  views: string[];
  indexes: string[];
  publications: string[];
  buckets: string[];
};

type Inventory = {
  generatedAt: string;
  migrationCount: number;
  migrations: MigrationRecord[];
  aggregates: {
    tables: string[];
    policies: string[];
    functions: string[];
    triggers: string[];
    views: string[];
    indexes: string[];
    publications: string[];
    buckets: string[];
    repairChains: { name: string; files: string[] }[];
  };
  config: {
    seedPaths: string[];
    seedFilesExist: { path: string; exists: boolean }[];
    edgeFunctionsDir: boolean;
    postgresMajor: string | null;
  };
  frontend: {
    serviceTables: string[];
    allTables: string[];
    rpcs: string[];
    storageBuckets: string[];
    realtimeTables: string[];
    typeTables: string[];
  };
  gaps: {
    serviceTablesWithoutRlsInMigrations: string[];
    migrationTablesWithoutFrontendRef: string[];
    frontendTablesWithoutMigration: string[];
    rpcsInDbNotInFrontend: string[];
    rpcsInFrontendNotInMigrations: string[];
  };
};

const TAG_PATTERNS: { tag: string; re: RegExp }[] = [
  { tag: "rbac", re: /\b(rbac_|user_effective_can|user_permissions)\b/i },
  { tag: "storage", re: /\b(storage\.|storage_|bucket)\b/i },
  { tag: "soft_delete", re: /\b(soft_delete|deleted_at)\b/i },
  { tag: "repair", re: /\b(_fix|_ensure|consolidation|hardening|purge)\b/i },
  { tag: "deprecated", re: /\b(DEPRECATED|deprecate)\b/i },
  { tag: "realtime", re: /\b(realtime|publication)\b/i },
  { tag: "auth", re: /\b(auth_|handle_new_user|profiles)\b/i },
];

const TABLE_RE = /\.from\(\s*["']([a-z_][a-z0-9_]*)["']/g;

const REPAIR_CHAINS: { name: string; match: RegExp }[] = [
  { name: "schema_core_duplicate", match: /officina_gestionale_(core|schema)/ },
  { name: "rbac_has_capability", match: /rbac_(capabilities|has_capability|operator|user_permissions)/ },
  { name: "soft_delete_lavorazioni", match: /lavorazioni_(soft_delete|deleted_at)/ },
  { name: "mezzo_delete_rpc", match: /mezzo_delete/ },
  { name: "lavorazioni_clienti_view", match: /lavorazioni_(stati_text|client)/ },
  { name: "supporto_deprecated", match: /(segnalazioni|support_notes|deprecate_supporto)/ },
  { name: "realtime_publication", match: /(gestionale_realtime|sync_realtime)/ },
  { name: "schema_consolidation", match: /schema_consolidation/ },
];

function readDirRecursive(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...readDirRecursive(full, ext));
    } else if (entry.name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function parseMigrationFile(file: string): MigrationRecord {
  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  const base = file.replace(/\.sql$/, "");
  const timestamp = base.slice(0, 14);
  const slug = base.slice(15);

  const tables = uniqueSorted(
    [
      ...content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi),
      ...content.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi),
    ].map((m) => m[1]),
  );

  const policies = uniqueSorted(
    [...content.matchAll(/create\s+policy\s+["']?([a-z_][a-z0-9_]*)["']?/gi)].map((m) => m[1]),
  );

  const functions = uniqueSorted(
    [
      ...content.matchAll(
        /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi,
      ),
    ].map((m) => m[1]),
  );

  const triggers = uniqueSorted(
    [...content.matchAll(/create\s+trigger\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]),
  );

  const views = uniqueSorted(
    [...content.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map(
      (m) => m[1],
    ),
  );

  const indexes = uniqueSorted(
    [...content.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)].map(
      (m) => m[1],
    ),
  );

  const publications = uniqueSorted(
    [
      ...content.matchAll(/alter\s+publication\s+([a-z_][a-z0-9_]*)/gi),
      ...content.matchAll(/publication\s+([a-z_][a-z0-9_]*)\s+add\s+table/gi),
    ].map((m) => m[1]),
  );

  const buckets = uniqueSorted(
    [
      ...content.matchAll(/insert\s+into\s+storage\.buckets[^)]*'([a-z_][a-z0-9_]*)'/gi),
      ...content.matchAll(/update\s+storage\.buckets\s+set[^;]*where\s+id\s*=\s*'([a-z_][a-z0-9_]*)'/gi),
    ].map((m) => m[1]),
  );

  const tags = TAG_PATTERNS.filter(({ re }) => re.test(content)).map(({ tag }) => tag);

  return { file, timestamp, slug, tags, tables, policies, functions, triggers, views, indexes, publications, buckets };
}

function collectServiceTables(): Set<string> {
  const tables = new Set<string>();
  const servicesDir = path.join(ROOT, "src", "services");
  if (!fs.existsSync(servicesDir)) return tables;
  for (const file of fs.readdirSync(servicesDir).filter((f) => f.endsWith(".service.ts"))) {
    const content = fs.readFileSync(path.join(servicesDir, file), "utf8");
    let m: RegExpExecArray | null;
    TABLE_RE.lastIndex = 0;
    while ((m = TABLE_RE.exec(content)) !== null) {
      tables.add(m[1]);
    }
    const constTable = content.match(/const\s+TABLE\s*=\s*["']([a-z_][a-z0-9_]*)["']/);
    if (constTable) tables.add(constTable[1]);
  }
  return tables;
}

function collectFromSource(re: RegExp, dirs: string[]): string[] {
  const found = new Set<string>();
  for (const dir of dirs) {
    for (const file of readDirRecursive(dir, ".ts")) {
      if (file.endsWith(".test.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        found.add(m[1]);
      }
    }
    for (const file of readDirRecursive(dir, ".tsx")) {
      const content = fs.readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        found.add(m[1]);
      }
    }
  }
  return uniqueSorted(found);
}

function parseConfigToml(): Inventory["config"] {
  const config = fs.existsSync(CONFIG_TOML) ? fs.readFileSync(CONFIG_TOML, "utf8") : "";
  const seedMatch = config.match(/sql_paths\s*=\s*\[([^\]]+)\]/);
  const seedPaths = seedMatch
    ? [...seedMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  const pgMatch = config.match(/major_version\s*=\s*(\d+)/);
  const seedsResolved = seedPaths.map((p) => {
    const rel = p.startsWith("./") ? p.slice(2) : p;
    const abs = path.join(ROOT, "supabase", rel);
    const globDir = rel.includes("*") ? path.dirname(abs) : null;
    let exists = false;
    if (globDir && fs.existsSync(globDir)) {
      exists = fs.readdirSync(globDir).some((f) => f.endsWith(".sql"));
    } else {
      exists = fs.existsSync(abs);
    }
    return { path: p, exists };
  });

  return {
    seedPaths,
    seedFilesExist: seedsResolved,
    edgeFunctionsDir: fs.existsSync(path.join(ROOT, "supabase", "functions")),
    postgresMajor: pgMatch?.[1] ?? null,
  };
}

function extractTypeTables(): string[] {
  const typesFile = path.join(ROOT, "src", "types", "supabase-tables.ts");
  if (!fs.existsSync(typesFile)) return [];
  const content = fs.readFileSync(typesFile, "utf8");
  return uniqueSorted(
    [...content.matchAll(/Tabella\s+`([a-z_][a-z0-9_]*)`/gi)].map((m) => m[1]),
  );
}

function extractRealtimeTables(): string[] {
  const targets = path.join(ROOT, "src", "lib", "react-query", "invalidate-targets.ts");
  if (!fs.existsSync(targets)) return [];
  const content = fs.readFileSync(targets, "utf8");
  const block = content.match(/GESTIONALE_TABLE_QUERY_KEYS[^=]*=\s*\{([\s\S]+?)\}/);
  if (!block) return [];
  return uniqueSorted([...block[1].matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gm)].map((m) => m[1]));
}

function buildInventory(): Inventory {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const migrations = migrationFiles.map(parseMigrationFile);

  const allTables = uniqueSorted(migrations.flatMap((m) => m.tables));
  const allPolicies = uniqueSorted(migrations.flatMap((m) => m.policies));
  const allFunctions = uniqueSorted(migrations.flatMap((m) => m.functions));
  if (fs.existsSync(RBAC_CORE)) {
    const rbacContent = fs.readFileSync(RBAC_CORE, "utf8");
    for (const m of rbacContent.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi)) {
      allFunctions.push(m[1]);
    }
  }

  const repairChains = REPAIR_CHAINS.map(({ name, match }) => ({
    name,
    files: migrations.filter((m) => match.test(m.file)).map((m) => m.file),
  })).filter((c) => c.files.length > 0);

  const serviceTables = uniqueSorted(collectServiceTables());
  const allFrontendTables = collectFromSource(/\.from\(\s*["']([a-z_][a-z0-9_]*)["']/g, SCAN_DIRS);
  const rpcs = collectFromSource(/\.rpc\(\s*["']([a-z_][a-z0-9_]*)["']/g, SCAN_DIRS);
  const storageBuckets = collectFromSource(/\.from\(\s*["']([a-z_][a-z0-9_]*)["']/g, SCAN_DIRS).filter((b) =>
    ["images", "documenti"].includes(b),
  );
  // storage uses .storage.from('bucket')
  const storageFrom = collectFromSource(/\.storage\.from\(\s*["']([a-z_][a-z0-9_]*)["']/g, SCAN_DIRS);
  const buckets = uniqueSorted([...storageBuckets, ...storageFrom]);

  const rlsTables = new Set<string>();
  for (const m of migrations) {
    for (const t of m.tables) rlsTables.add(t);
    for (const p of m.policies) {
      /* policies reference tables via ON public.table — re-scan raw */
    }
  }
  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const m of content.matchAll(/on\s+public\.([a-z_][a-z0-9_]*)/gi)) {
      rlsTables.add(m[1]);
    }
    for (const m of content.matchAll(/alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi)) {
      rlsTables.add(m[1]);
    }
  }

  const migrationTables = new Set(allTables);
  const allFunctionsUnique = uniqueSorted(allFunctions);

  const internalOnlyTables = new Set([
    "lavorazioni_codice_counters",
    "preventivi_lavorazione_numero_counters",
    "preventivi_manuali_numero_counters",
  ]);

  return {
    generatedAt: new Date().toISOString(),
    migrationCount: migrations.length,
    migrations,
    aggregates: {
      tables: allTables,
      policies: allPolicies,
      functions: allFunctionsUnique,
      triggers: uniqueSorted(migrations.flatMap((m) => m.triggers)),
      views: uniqueSorted(migrations.flatMap((m) => m.views)),
      indexes: uniqueSorted(migrations.flatMap((m) => m.indexes)),
      publications: uniqueSorted(migrations.flatMap((m) => m.publications)),
      buckets: uniqueSorted(migrations.flatMap((m) => m.buckets)),
      repairChains,
    },
    config: parseConfigToml(),
    frontend: {
      serviceTables,
      allTables: allFrontendTables,
      rpcs,
      storageBuckets: buckets,
      realtimeTables: extractRealtimeTables(),
      typeTables: extractTypeTables(),
    },
    gaps: {
      serviceTablesWithoutRlsInMigrations: serviceTables.filter((t) => !rlsTables.has(t)),
      migrationTablesWithoutFrontendRef: allTables.filter(
        (t) =>
          !allFrontendTables.includes(t) &&
          !serviceTables.includes(t) &&
          !internalOnlyTables.has(t),
      ),
      frontendTablesWithoutMigration: allFrontendTables.filter((t) => !migrationTables.has(t) && !rlsTables.has(t)),
      rpcsInDbNotInFrontend: allFunctionsUnique.filter(
        (f) =>
          !rpcs.includes(f) &&
          [
            "bulk_upsert_app_settings",
            "soft_delete_lavorazione",
            "soft_delete_dashboard_promemoria",
            "count_mezzo_dependencies",
            "delete_mezzo",
            "check_username_available",
            "resolve_auth_email_for_login",
            "archive_lavorazione_client_portal",
            "current_profile_role",
          ].includes(f) === false &&
          !f.startsWith("rbac_") &&
          !f.startsWith("set_") &&
          !f.startsWith("log_app_settings") &&
          f !== "handle_new_user",
      ),
      rpcsInFrontendNotInMigrations: rpcs.filter((r) => !allFunctionsUnique.includes(r)),
    },
  };
}

function printSummary(inv: Inventory): void {
  console.log("=== Supabase Audit Inventory ===\n");
  console.log(`Generated: ${inv.generatedAt}`);
  console.log(`Migrations: ${inv.migrationCount}`);
  console.log(`Tables (migration refs): ${inv.aggregates.tables.length}`);
  console.log(`Policies: ${inv.aggregates.policies.length}`);
  console.log(`Functions: ${inv.aggregates.functions.length}`);
  console.log(`Triggers: ${inv.aggregates.triggers.length}`);
  console.log(`Views: ${inv.aggregates.views.join(", ") || "(none)"}`);
  console.log(`Storage buckets: ${inv.aggregates.buckets.join(", ")}`);
  console.log(`Publications: ${inv.aggregates.publications.join(", ")}`);

  console.log("\n--- Config ---");
  console.log(`Postgres major: ${inv.config.postgresMajor ?? "?"}`);
  console.log(`Edge functions dir: ${inv.config.edgeFunctionsDir ? "yes" : "no"}`);
  for (const s of inv.config.seedFilesExist) {
    console.log(`Seed ${s.path}: ${s.exists ? "OK" : "MISSING"}`);
  }

  console.log("\n--- Frontend ---");
  console.log(`Service tables (${inv.frontend.serviceTables.length}): ${inv.frontend.serviceTables.join(", ")}`);
  console.log(`RPCs (${inv.frontend.rpcs.length}): ${inv.frontend.rpcs.join(", ")}`);
  console.log(`Realtime tables: ${inv.frontend.realtimeTables.join(", ")}`);

  console.log("\n--- Repair chains ---");
  for (const c of inv.aggregates.repairChains) {
    console.log(`  ${c.name}: ${c.files.length} migration(s)`);
  }

  console.log("\n--- Gaps ---");
  if (inv.gaps.serviceTablesWithoutRlsInMigrations.length === 0) {
    console.log("OK: all service tables have RLS refs in migrations");
  } else {
    console.log(`Service tables missing RLS in migrations: ${inv.gaps.serviceTablesWithoutRlsInMigrations.join(", ")}`);
  }
  if (inv.gaps.rpcsInFrontendNotInMigrations.length > 0) {
    console.log(`RPCs in frontend not in migrations: ${inv.gaps.rpcsInFrontendNotInMigrations.join(", ")}`);
  }
  console.log(
    `Migration tables without frontend ref (${inv.gaps.migrationTablesWithoutFrontendRef.length}): ${inv.gaps.migrationTablesWithoutFrontendRef.slice(0, 15).join(", ")}${inv.gaps.migrationTablesWithoutFrontendRef.length > 15 ? "…" : ""}`,
  );

  const hasErrors =
    inv.gaps.serviceTablesWithoutRlsInMigrations.length > 0 ||
    inv.gaps.rpcsInFrontendNotInMigrations.length > 0 ||
    inv.config.seedFilesExist.some((s) => !s.exists);

  process.exit(hasErrors ? 1 : 0);
}

function main(): void {
  const inv = buildInventory();
  const jsonMode = process.argv.includes("--json");
  if (jsonMode) {
    const outPath = path.join(ROOT, "docs", ".supabase-audit-inventory.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(inv, null, 2), "utf8");
    console.log(`Wrote ${outPath}`);
    process.exit(0);
  }
  printSummary(inv);
}

main();
