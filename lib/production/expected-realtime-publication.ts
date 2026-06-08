import fs from "node:fs";
import path from "node:path";

export const REALTIME_PUBLICATION_NAME = "supabase_realtime";

/** Tabelle rimosse da F5 — non devono comparire in publication live. */
export const DEPRECATED_REALTIME_TABLES = ["segnalazioni", "support_notes"] as const;

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

const ADD_RE =
  /alter\s+publication\s+supabase_realtime\s+add\s+table\s+(?:only\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const DROP_RE =
  /alter\s+publication\s+supabase_realtime\s+drop\s+table\s+(?:only\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;

/** Deriva il set atteso post-migration da file SQL versionati (SSOT repo). */
export function parseExpectedRealtimePublicationTables(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const tables = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    let m: RegExpExecArray | null;

    ADD_RE.lastIndex = 0;
    while ((m = ADD_RE.exec(content)) !== null) {
      tables.add(m[1]!);
    }

    DROP_RE.lastIndex = 0;
    while ((m = DROP_RE.exec(content)) !== null) {
      tables.delete(m[1]!);
    }
  }

  return [...tables].sort();
}

export function diffPublicationSets(expected: string[], actual: string[]): {
  missing: string[];
  extra: string[];
} {
  const exp = new Set(expected);
  const act = new Set(actual);
  const missing = expected.filter((t) => !act.has(t));
  const extra = actual.filter((t) => !exp.has(t));
  return { missing, extra };
}
