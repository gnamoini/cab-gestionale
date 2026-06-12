import { execFileSync } from "node:child_process";

/**
 * Run SQL against linked Supabase project via CLI.
 * @param {string} sql
 * @param {{ cwd?: string }} [opts]
 */
export function runSql(sql, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const raw = execFileSync(`npx supabase db query --linked -o json ${JSON.stringify(sql)}`, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  });
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`No JSON in supabase db query output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start, end + 1));
}

/** Returns false if linked project unavailable. */
export function canRunLinkedDb(cwd = process.cwd()) {
  try {
    runSql("SELECT 1 AS ok", { cwd });
    return true;
  } catch {
    return false;
  }
}
