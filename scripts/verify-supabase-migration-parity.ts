/**
 * Verifica allineamento migration locali ↔ remote (progetto linkato).
 * Fallisce se esistono versioni solo-remote (causa tipica di `db push` bloccato).
 *
 * Uso: npx tsx scripts/verify-supabase-migration-parity.ts
 * Richiede: `npx supabase login` + progetto linkato (`supabase link`).
 */
import { execSync } from "node:child_process";

type MigrationRow = { local?: string; remote?: string; time?: string };

function parseMigrationList(stdout: string): MigrationRow[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as { migrations?: MigrationRow[] };
    if (Array.isArray(parsed.migrations)) return parsed.migrations;
  } catch {
    /* CLI older shape: single JSON object with migrations array inline */
  }
  const match = trimmed.match(/\{"migrations":\[/);
  if (match) {
    const start = trimmed.indexOf('{"migrations":');
    const parsed = JSON.parse(trimmed.slice(start)) as { migrations: MigrationRow[] };
    return parsed.migrations ?? [];
  }
  return [];
}

function main(): void {
  let raw = "";
  try {
    raw = execSync("npx supabase migration list --linked -o json", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    console.error("verify-supabase-migration-parity: impossibile leggere migration list.");
    console.error(err.stderr ?? err.message ?? e);
    console.error("Esegui: npx supabase login && npx supabase link");
    process.exit(1);
  }

  const rows = parseMigrationList(raw);
  const remoteOnly = rows.filter((r) => !r.local?.trim() && r.remote?.trim()).map((r) => r.remote!);
  const localOnly = rows.filter((r) => r.local?.trim() && !r.remote?.trim()).map((r) => r.local!);

  if (remoteOnly.length === 0 && localOnly.length === 0) {
    console.log("verify-supabase-migration-parity: OK (local ↔ remote allineati)");
    return;
  }

  if (remoteOnly.length > 0) {
    console.error("Migration SOLO su remote (mancano in supabase/migrations/):");
    for (const v of remoteOnly) console.error(`  - ${v}`);
    console.error(
      "Ripara con: npx supabase migration repair --status reverted <version>",
    );
    console.error("Poi verifica che lo schema sia coperto da migration locali prima del repair.");
  }

  if (localOnly.length > 0) {
    console.error("Migration SOLO locali (non ancora su remote — eseguire db push):");
    for (const v of localOnly) console.error(`  - ${v}`);
  }

  process.exit(1);
}

main();
