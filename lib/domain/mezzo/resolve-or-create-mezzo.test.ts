import assert from "node:assert/strict";
import {
  findUpgradeCandidateByPartialIdentity,
  isMezzoEmptyShell,
  normalizeTarga,
  pickCanonicalMezzo,
} from "@/lib/domain/mezzo/mezzo-identity";
import { mergeMezzoPatch } from "@/lib/domain/mezzo/merge-mezzo-patch";
import {
  isMezzoUniqueViolation,
  resolveOrCreateMezzo,
  type ResolveOrCreateMezzoDeps,
} from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import type { MezzoRow } from "@/src/types/supabase-tables";

function mezzoRow(partial: Partial<MezzoRow> & Pick<MezzoRow, "id">): MezzoRow {
  return {
    id: partial.id,
    cliente: partial.cliente ?? "",
    utilizzatore: partial.utilizzatore ?? null,
    targa: partial.targa ?? null,
    numero_scuderia: partial.numero_scuderia ?? null,
    anno: partial.anno ?? null,
    meta: partial.meta ?? {},
    marca_telaio: partial.marca_telaio ?? null,
    modello_telaio: partial.modello_telaio ?? null,
    tipo_telaio: partial.tipo_telaio ?? null,
    telaio_num: partial.telaio_num ?? null,
    km: partial.km ?? null,
    note: partial.note ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function makeDeps(state: {
  rows: MezzoRow[];
  createThrowsOnce?: boolean;
}): ResolveOrCreateMezzoDeps & { logs: { resolved: number; conflicts: number; prevented: number } } {
  const logs = { resolved: 0, conflicts: 0, prevented: 0 };
  let createThrows = state.createThrowsOnce ?? false;
  return {
    logs,
    getById: async (id) => state.rows.find((r) => r.id === id) ?? null,
    findByVinNorm: async (vin) =>
      state.rows.filter((r) => r.telaio_num?.toUpperCase() === vin.toUpperCase()),
    findByTargaNorm: async (targa) =>
      state.rows.filter((r) => normalizeTarga(r.targa) === normalizeTarga(targa)),
    listPartialIdentityCandidates: async ({ cliente, numero_scuderia, tipo_telaio }) =>
      state.rows.filter((r) => {
        if (cliente && r.cliente.toLowerCase() !== cliente.trim().toLowerCase()) return false;
        if (numero_scuderia && r.numero_scuderia !== numero_scuderia) return false;
        if (tipo_telaio && r.tipo_telaio !== tipo_telaio) return false;
        return true;
      }),
    createRaw: async (data) => {
      if (createThrows) {
        createThrows = false;
        const err = new Error("duplicate") as Error & { code: string };
        err.code = "23505";
        throw err;
      }
      const created = mezzoRow({
        id: `new-${state.rows.length + 1}`,
        cliente: data.cliente,
        targa: data.targa ?? null,
        telaio_num: data.telaio_num ?? null,
        tipo_telaio: data.tipo_telaio ?? null,
        numero_scuderia: data.numero_scuderia ?? null,
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
    logDuplicatePrevented: async () => {
      logs.prevented += 1;
    },
  };
}

async function run() {
  assert.equal(normalizeTarga(" ab-123 cd "), "AB123CD");
  assert.equal(isMezzoEmptyShell(mezzoRow({ id: "s1" })), true);
  assert.equal(
    isMezzoEmptyShell(mezzoRow({ id: "s2", cliente: "AMIU", tipo_telaio: "Cassone", numero_scuderia: "500" })),
    false,
  );

  const upgrade = findUpgradeCandidateByPartialIdentity(
    [
      mezzoRow({ id: "u1", cliente: "AMIU", numero_scuderia: "55", tipo_telaio: "Compattatore" }),
      mezzoRow({ id: "u2", cliente: "AMIU", numero_scuderia: "55", tipo_telaio: "Compattatore" }),
    ],
    { cliente: "AMIU", numero_scuderia: "55", tipo_telaio: "Compattatore" },
  );
  assert.equal(upgrade.kind, "ambiguous");

  // 1: stessa targa, dati aggiuntivi
  const s1 = { rows: [mezzoRow({ id: "m1", targa: "AB123CD" })] };
  const d1 = makeDeps(s1);
  const r1 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "AB123CD",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: "FIAT",
        modello_telaio: null,
        tipo_telaio: "Furgone",
        telaio_num: "VIN001",
        km: null,
        note: null,
      },
    },
    d1,
  );
  assert.equal(r1.created, false);
  assert.equal(r1.row.id, "m1");
  assert.equal(r1.row.tipo_telaio, "Furgone");

  // 2: targa case-insensitive
  const s2 = { rows: [mezzoRow({ id: "m2", targa: "AB123CD" })] };
  const r2 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "ab123cd",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: null,
        km: null,
        note: null,
      },
    },
    makeDeps(s2),
  );
  assert.equal(r2.row.id, "m2");

  // 3: stesso VIN
  const s3 = { rows: [mezzoRow({ id: "m3", telaio_num: "VINX" })] };
  const r3 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "NEWPLATE",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: "VINX",
        km: null,
        note: null,
      },
    },
    makeDeps(s3),
  );
  assert.equal(r3.row.id, "m3");

  // 4: targa diversa → nuovo mezzo
  const s4 = { rows: [] as MezzoRow[] };
  const r4 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "ZZ999ZZ",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: null,
        km: null,
        note: null,
      },
    },
    makeDeps(s4),
  );
  assert.equal(r4.created, true);

  // 5: conflitto tipo
  const s5 = { rows: [mezzoRow({ id: "m5", targa: "AA111BB", tipo_telaio: "Cassone" })] };
  const d5 = makeDeps(s5);
  const r5 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "AA111BB",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: "Compattatore",
        telaio_num: null,
        km: null,
        note: null,
      },
    },
    d5,
  );
  assert.equal(r5.row.tipo_telaio, "Cassone");
  assert.equal(d5.logs.conflicts, 1);

  // 6: upgrade shell
  const s6 = {
    rows: [
      mezzoRow({
        id: "m6",
        cliente: "AMIU",
        numero_scuderia: "55",
        tipo_telaio: "Compattatore",
      }),
    ],
  };
  const r6 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "AMIU",
        utilizzatore: null,
        targa: "AB123CD",
        numero_scuderia: "55",
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: "Compattatore",
        telaio_num: "VIN6",
        km: null,
        note: null,
      },
    },
    makeDeps(s6),
  );
  assert.equal(r6.row.id, "m6");
  assert.equal(r6.matchedBy, "partial_upgrade");

  // 7: duplicato pre-esistente
  const s7 = { rows: [mezzoRow({ id: "m7", targa: "DUP001" })] };
  const r7 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "DUP001",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: null,
        km: null,
        note: null,
      },
    },
    makeDeps(s7),
  );
  assert.equal(r7.created, false);
  assert.equal(s7.rows.length, 1);

  // 8: race recovery
  const s8 = { rows: [] as MezzoRow[], createThrowsOnce: true };
  const d8 = makeDeps(s8);
  const origCreate = d8.createRaw;
  d8.createRaw = async (data) => {
    if (s8.createThrowsOnce) {
      s8.createThrowsOnce = false;
      s8.rows.push(mezzoRow({ id: "m8", targa: data.targa ?? null }));
      const err = new Error("duplicate") as Error & { code: string };
      err.code = "23505";
      throw err;
    }
    return origCreate(data);
  };
  const r8 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "RACE01",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: null,
        km: null,
        note: null,
      },
    },
    d8,
  );
  assert.equal(r8.matchedBy, "race_recovery");
  assert.equal(d8.logs.prevented, 1);

  // 9: import + scheda stesso mezzo (VIN)
  const s9 = { rows: [mezzoRow({ id: "m9", telaio_num: "IMPVIN" })] };
  const r9a = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "IMP001",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: "IMPVIN",
        km: null,
        note: null,
      },
    },
    makeDeps(s9),
  );
  const r9b = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "IMP002",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: "IMPVIN",
        km: null,
        note: null,
      },
    },
    makeDeps(s9),
  );
  assert.equal(r9a.row.id, r9b.row.id);

  // 10: stesso VIN, targa diversa → conflitto targa
  const s10 = { rows: [mezzoRow({ id: "m10", telaio_num: "VIN10", targa: "AB123CD" })] };
  const d10 = makeDeps(s10);
  const r10 = await resolveOrCreateMezzo(
    {
      incoming: {
        cliente: "C",
        utilizzatore: null,
        targa: "XY987ZT",
        numero_scuderia: null,
        anno: 2024,
        meta: {},
        entity_key: null,
        marca_telaio: null,
        modello_telaio: null,
        tipo_telaio: null,
        telaio_num: "VIN10",
        km: null,
        note: null,
      },
    },
    d10,
  );
  assert.equal(r10.row.id, "m10");
  assert.equal(r10.row.targa, "AB123CD");
  assert.ok(d10.logs.conflicts >= 1);

  const canonical = pickCanonicalMezzo([
    mezzoRow({ id: "old", targa: "A", created_at: "2026-01-01T00:00:00.000Z" }),
    mezzoRow({ id: "new", targa: "A", telaio_num: "VIN", created_at: "2026-02-01T00:00:00.000Z" }),
  ]);
  assert.equal(canonical.id, "new");

  assert.equal(isMezzoUniqueViolation({ code: "23505" }), true);

  console.log("resolve-or-create-mezzo.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
