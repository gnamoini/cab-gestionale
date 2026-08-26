/**
 * Scan migrations for GRANT EXECUTE TO anon (informational history report).
 * Usage: npx tsx scripts/audit-migration-security-patterns.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");
const OUT_PATH = path.join(ROOT, "docs/security/migration-security-history-report.json");

type Finding = {
  file: string;
  line: number;
  lineText: string;
  pattern: "grant_execute_anon" | "grant_to_anon";
};

function main(): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const findings: Finding[] = [];
  const grantExecuteAnonRe =
    /grant\s+execute\s+on\s+function\s+[^;]+to\s+[^;]*\banon\b/i;
  const grantToAnonRe = /grant\s+execute\s+[^;]*\bto\s+anon\b/i;

  for (const file of files) {
    const full = path.join(MIGRATIONS_DIR, file);
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!.trim();
      if (!lineText || lineText.startsWith("--")) continue;
      if (grantExecuteAnonRe.test(lineText) || grantToAnonRe.test(lineText)) {
        findings.push({
          file,
          line: i + 1,
          lineText,
          pattern: grantExecuteAnonRe.test(lineText) ? "grant_execute_anon" : "grant_to_anon",
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    migrationsScanned: files.length,
    grantExecuteAnonCount: findings.length,
    findings,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log(`migration-security-history: ${findings.length} GRANT EXECUTE→anon finding(s) in ${files.length} migrations`);
  console.log(`Report → ${OUT_PATH}`);
}

main();
