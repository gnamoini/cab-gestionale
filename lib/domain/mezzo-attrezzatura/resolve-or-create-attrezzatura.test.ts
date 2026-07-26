import assert from "node:assert/strict";
import {
  findUpgradeCandidateByMissingIdentity,
  isAttrezzaturaEmptyShell,
  normMatricola,
  pickCanonicalAttrezzatura,
} from "@/lib/domain/mezzo-attrezzatura/attrezzatura-identity";
import { mergeAttrezzaturaPatch } from "@/lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch";
import {
  isAttrezzaturaUniqueViolation,
  resolveOrCreateAttrezzatura,
  type ResolveOrCreateAttrezzaturaDeps,
} from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

function row(partial: Partial<AttrezzaturaRow> & Pick<AttrezzaturaRow, "id" | "mezzo_id">): AttrezzaturaRow {
  return {
    id: partial.id,
    mezzo_id: partial.mezzo_id,
    marca: partial.marca ?? "—",
    modello: partial.modello ?? "—",
    tipo_attrezzatura: partial.tipo_attrezzatura ?? null,
    matricola: partial.matricola ?? null,
    portata: partial.portata ?? null,
    anno: partial.anno ?? null,
    note: partial.note ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00.000Z",
    created_by: partial.created_by ?? null,
  };
}

function makeDeps(state: {
  rows: AttrezzaturaRow[];
  createThrowsOnce?: boolean;
}): ResolveOrCreateAttrezzaturaDeps & { logs: { resolved: number; conflicts: number } } {
  const logs = { resolved: 0, conflicts: 0 };
  let createThrows = state.createThrowsOnce ?? false;
  return {
    logs,
    getById: async (id) => state.rows.find((r) => r.id === id) ?? null,
    listByMezzo: async (mezzoId) => state.rows.filter((r) => r.mezzo_id === mezzoId),
    createRaw: async (data) => {
      if (createThrows) {
        createThrows = false;
        const err = new Error("duplicate") as Error & { code: string };
        err.code = "23505";
        throw err;
      }
      const created = row({
        id: `new-${state.rows.length + 1}`,
        mezzo_id: data.mezzo_id,
        marca: data.marca,
        modello: data.modello,
        tipo_attrezzatura: data.tipo_attrezzatura ?? null,
        matricola: data.matricola ?? null,
        created_at: "2026-02-01T00:00:00.000Z",
      });
      state.rows.push(created);
      return created;
    },
    updateRaw: async (id, patch) => {
      const idx = state.rows.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error("not found");
      state.rows[idx] = { ...state.rows[idx]!, ...patch };
      return state.rows[idx]!;
    },
    logResolvedExisting: async () => {
      logs.resolved += 1;
    },
    logConflictKept: async () => {
      logs.conflicts += 1;
    },
  };
}

async function run() {
  assert.equal(normMatricola(" ATT123 "), "att123");

  assert.equal(isAttrezzaturaEmptyShell(row({ id: "1", mezzo_id: "m1" })), true);
  assert.equal(
    isAttrezzaturaEmptyShell(row({ id: "1", mezzo_id: "m1", tipo_attrezzatura: "Gru" })),
    false,
  );

  const upgradeSingle = findUpgradeCandidateByMissingIdentity(
    [row({ id: "a", mezzo_id: "m1" })],
    true,
  );
  assert.equal(upgradeSingle.kind, "candidate");

  const upgradeShell = findUpgradeCandidateByMissingIdentity(
    [
      row({ id: "a", mezzo_id: "m1" }),
      row({ id: "b", mezzo_id: "m1", tipo_attrezzatura: "Gru" }),
    ],
    true,
  );
  assert.equal(upgradeShell.kind, "candidate");
  if (upgradeShell.kind === "candidate") assert.equal(upgradeShell.row.id, "a");

  const upgradeBlocked = findUpgradeCandidateByMissingIdentity(
    [
      row({ id: "a", mezzo_id: "m1", tipo_attrezzatura: "Cassone" }),
      row({ id: "b", mezzo_id: "m1", tipo_attrezzatura: "Gru" }),
    ],
    true,
  );
  assert.equal(upgradeBlocked.kind, "ambiguous");

  const merge1 = mergeAttrezzaturaPatch(
    row({ id: "1", mezzo_id: "m1", tipo_attrezzatura: null }),
    { tipo_attrezzatura: "Spazzatrice" },
  );
  assert.equal(merge1.patch.tipo_attrezzatura, "Spazzatrice");
  assert.equal(merge1.conflicts.length, 0);

  const merge2 = mergeAttrezzaturaPatch(
    row({ id: "1", mezzo_id: "m1", tipo_attrezzatura: "Spazzatrice" }),
    { tipo_attrezzatura: "Compattatore" },
  );
  assert.equal(merge2.patch.tipo_attrezzatura, undefined);
  assert.equal(merge2.conflicts.length, 1);

  const canonical = pickCanonicalAttrezzatura([
    row({ id: "old", mezzo_id: "m1", matricola: "abc", created_at: "2026-01-01T00:00:00.000Z" }),
    row({
      id: "new",
      mezzo_id: "m1",
      matricola: "ABC",
      tipo_attrezzatura: "Spazzatrice",
      created_at: "2026-02-01T00:00:00.000Z",
    }),
  ]);
  assert.equal(canonical.id, "new");

  // Caso 1: tipo NULL → Spazzatrice stessa matricola
  const state1: { rows: AttrezzaturaRow[] } = {
    rows: [row({ id: "a1", mezzo_id: "m1", matricola: "ABC", created_at: "2026-01-01T00:00:00.000Z" })],
  };
  const deps1 = makeDeps(state1);
  const r1 = await resolveOrCreateAttrezzatura(
    {
      mezzoId: "m1",
      incoming: {
        mezzo_id: "m1",
        marca: "X",
        modello: "Y",
        matricola: "ABC",
        tipo_attrezzatura: "Spazzatrice",
      },
    },
    deps1,
  );
  assert.equal(r1.created, false);
  assert.equal(state1.rows.length, 1);
  assert.equal(state1.rows[0]!.tipo_attrezzatura, "Spazzatrice");

  // Caso 5: casing
  const state5: { rows: AttrezzaturaRow[] } = {
    rows: [row({ id: "a1", mezzo_id: "m1", matricola: "ATT123" })],
  };
  const deps5 = makeDeps(state5);
  const r5 = await resolveOrCreateAttrezzatura(
    {
      mezzoId: "m1",
      incoming: { mezzo_id: "m1", marca: "X", modello: "Y", matricola: "att123" },
    },
    deps5,
  );
  assert.equal(r5.created, false);
  assert.equal(state5.rows.length, 1);

  // Caso 7: upgrade NULL matricola
  const state7: { rows: AttrezzaturaRow[] } = {
    rows: [row({ id: "shell", mezzo_id: "m1" })],
  };
  const deps7 = makeDeps(state7);
  const r7 = await resolveOrCreateAttrezzatura(
    {
      mezzoId: "m1",
      incoming: {
        mezzo_id: "m1",
        marca: "X",
        modello: "Y",
        matricola: "ABC",
        tipo_attrezzatura: "Spazzatrice",
      },
    },
    deps7,
  );
  assert.equal(r7.created, false);
  assert.equal(r7.matchedBy, "null_upgrade");
  assert.equal(state7.rows[0]!.matricola, "ABC");
  assert.equal(state7.rows.length, 1);

  // Caso 3: matricole diverse → 2 record
  const state3: { rows: AttrezzaturaRow[] } = {
    rows: [row({ id: "a", mezzo_id: "m1", matricola: "A" })],
  };
  const deps3 = makeDeps(state3);
  const r3 = await resolveOrCreateAttrezzatura(
    {
      mezzoId: "m1",
      incoming: { mezzo_id: "m1", marca: "X", modello: "Y", matricola: "B" },
    },
    deps3,
  );
  assert.equal(r3.created, true);
  assert.equal(state3.rows.length, 2);

  // Caso 9: race recovery
  const state9: { rows: AttrezzaturaRow[] } = { rows: [] };
  let raceThrown = false;
  const deps9: ResolveOrCreateAttrezzaturaDeps = {
    getById: async (id) => state9.rows.find((r) => r.id === id) ?? null,
    listByMezzo: async (mezzoId) => state9.rows.filter((r) => r.mezzo_id === mezzoId),
    createRaw: async (data) => {
      if (!raceThrown) {
        raceThrown = true;
        state9.rows.push(row({ id: "race", mezzo_id: "m1", matricola: "RACE" }));
        const err = new Error("duplicate") as Error & { code: string };
        err.code = "23505";
        throw err;
      }
      const created = row({
        id: "new-race",
        mezzo_id: data.mezzo_id,
        marca: data.marca,
        modello: data.modello,
        matricola: data.matricola ?? null,
      });
      state9.rows.push(created);
      return created;
    },
    updateRaw: async (id, patch) => {
      const idx = state9.rows.findIndex((r) => r.id === id);
      state9.rows[idx] = { ...state9.rows[idx]!, ...patch };
      return state9.rows[idx]!;
    },
  };
  const r9 = await resolveOrCreateAttrezzatura(
    {
      mezzoId: "m1",
      incoming: { mezzo_id: "m1", marca: "X", modello: "Y", matricola: "RACE" },
    },
    deps9,
  );
  assert.equal(r9.matchedBy, "race_recovery");
  assert.equal(state9.rows.length, 1);

  assert.equal(isAttrezzaturaUniqueViolation({ code: "23505" }), true);

  console.log("resolve-or-create-attrezzatura.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
