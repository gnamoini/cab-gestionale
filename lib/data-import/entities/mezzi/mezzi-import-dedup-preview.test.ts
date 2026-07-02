import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const norm = (s: string) => s.trim().toLowerCase();

function findImportDup(
  r: { targa?: string; matricola?: string },
  existingMezzi: Array<{ id: string; targa?: string | null; matricola?: string | null }>,
  existingAtt: Array<{ id: string; mezzo_id: string; matricola?: string | null }>,
): { id: string } | undefined {
  let dup: { id: string } | undefined;
  if (r.targa) {
    const byTarga = existingMezzi.find((m) => m.targa && norm(m.targa) === norm(r.targa!));
    if (byTarga) dup = { id: byTarga.id };
  }
  if (!dup && r.matricola) {
    const byAttMat = existingAtt.find((a) => a.matricola && norm(a.matricola) === norm(r.matricola!));
    if (byAttMat) dup = { id: byAttMat.mezzo_id };
  }
  return dup;
}

assert.deepEqual(
  findImportDup({ matricola: "M1" }, [], [{ id: "a1", mezzo_id: "mezzo-1", matricola: "M1" }]),
  { id: "mezzo-1" },
);

assert.deepEqual(
  findImportDup({ targa: "AB123" }, [{ id: "m2", targa: "AB123" }], []),
  { id: "m2" },
);

const plugin = fs.readFileSync(
  path.join(process.cwd(), "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts"),
  "utf8",
);
assert.match(plugin, /from\("attrezzature"\)\.select\("id, mezzo_id, matricola"\)/);

console.log("mezzi-import-dedup-preview.test.ts OK");
