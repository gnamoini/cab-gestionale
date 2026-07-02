import assert from "node:assert/strict";

function attrezzaturaPayloadFromImportRow(row: {
  marca?: string;
  modello?: string;
  matricola?: string;
  tipo_attrezzatura?: string;
  anno?: number;
}): { payload: { marca: string; modello: string; matricola: string | null; tipo_attrezzatura: string | null; portata: null; anno: number | null; note: null } } | { error: string } | null {
  const hasAny =
    row.marca?.trim() ||
    row.modello?.trim() ||
    row.matricola?.trim() ||
    row.tipo_attrezzatura?.trim();
  if (!hasAny) return null;
  const marca = row.marca?.trim();
  if (!marca) return { error: "Marca obbligatoria se presenti dati attrezzatura." };
  return {
    payload: {
      marca,
      modello: row.modello?.trim() || "—",
      matricola: row.matricola?.trim() || null,
      tipo_attrezzatura: row.tipo_attrezzatura?.trim() || null,
      portata: null,
      anno: row.anno ?? null,
      note: null,
    },
  };
}

assert.equal(attrezzaturaPayloadFromImportRow({}), null);

const ok = attrezzaturaPayloadFromImportRow({ marca: "Cat", modello: "320", matricola: "M1" });
assert.ok(ok && "payload" in ok);
assert.equal(ok.payload.marca, "Cat");

const err = attrezzaturaPayloadFromImportRow({ modello: "320" });
assert.ok(err && "error" in err);

console.log("mezzi-import-v2.test.ts OK");
