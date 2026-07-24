/**
 * Regression guard: vietata qualsiasi seconda rappresentazione persistente delle note lavorazione.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["src", "components", "lib"] as const;

const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".next", "dist"]);

const EXCLUDE_FILE_PATTERNS = [
  /lavorazioni-note-ssot-guard\.test\.ts$/,
  /migrate-note-ssot-audit\.ts$/,
  /display-audit\.test\.ts$/,
];

const FORBIDDEN_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "noteIntervento", regex: /\bnoteIntervento\b/ },
  { name: "noteOperative", regex: /\bnoteOperative\b/ },
  { name: "lavorazioneNoteOperative", regex: /\blavorazioneNoteOperative\b/ },
  { name: "operationalNotes", regex: /\boperationalNotes\b/ },
  { name: "noteInterne", regex: /\bnoteInterne\b/ },
  { name: "operative_notes", regex: /\boperative_notes\b/ },
  { name: "note_interne", regex: /\bnote_interne\b/ },
];

function shouldScanFile(rel: string): boolean {
  if (rel.startsWith(`supabase${path.sep}`) || rel.startsWith(`docs${path.sep}`)) return false;
  return !EXCLUDE_FILE_PATTERNS.some((re) => re.test(rel));
}

function walk(dir: string, out: string[]): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_NAMES.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(ent.name)) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (shouldScanFile(rel)) out.push(rel);
  }
}

const files: string[] = [];
for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) walk(abs, files);
}

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(
      src,
      regex,
      `${rel}: pattern vietato per note SSOT: ${name}`,
    );
  }
}

console.log(`lavorazioni-note-ssot-guard: OK (${files.length} file)`);
