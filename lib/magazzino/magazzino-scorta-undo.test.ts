import assert from "node:assert/strict";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  buildLatestUndoableScortaEntryByRicambioId,
  latestUndoableScortaEntryForRicambio,
  parseScortaChange,
  type MagazzinoUndoScope,
} from "@/lib/magazzino/magazzino-scorta-undo";

function scortaEntry(
  id: string,
  ricambioId: string,
  prima: string,
  dopo: string,
  extra?: Partial<MagazzinoChangeLogEntry>,
): MagazzinoChangeLogEntry {
  return {
    id,
    ricambioId,
    ricambio: ricambioId,
    riepilogo: "test",
    autore: "test",
    tipo: "update",
    at: new Date().toISOString(),
    changes: [{ campo: "Scorta", prima, dopo }],
    annullato: false,
    ...extra,
  };
}

const scope: MagazzinoUndoScope = { userId: "u1", sessionId: "s1" };

function legacyLatestMap(entries: MagazzinoChangeLogEntry[], undoScope: MagazzinoUndoScope | null) {
  const ids = [...new Set(entries.map((e) => e.ricambioId))];
  const map = new Map<string, MagazzinoChangeLogEntry>();
  for (const id of ids) {
    const e = latestUndoableScortaEntryForRicambio(entries, id, undoScope);
    if (e) map.set(id, e);
  }
  return map;
}

// newest-first: only first valid entry per ricambio wins
{
  const entries = [
    scortaEntry("e1", "r1", "1", "2"),
    scortaEntry("e0", "r1", "0", "1"),
  ];
  const map = buildLatestUndoableScortaEntryByRicambioId(entries, null);
  assert.equal(map.get("r1")?.id, "e1");
  assert.deepEqual(map, legacyLatestMap(entries, null));
}

// annullato excluded
{
  const entries = [scortaEntry("e1", "r1", "1", "2", { annullato: true }), scortaEntry("e0", "r1", "0", "1")];
  const map = buildLatestUndoableScortaEntryByRicambioId(entries, null);
  assert.equal(map.get("r1")?.id, "e0");
}

// non-scorta entry skipped
{
  const entries = [
    {
      ...scortaEntry("e1", "r1", "1", "2"),
      changes: [{ campo: "Marca", prima: "A", dopo: "B" }],
    },
    scortaEntry("e0", "r1", "0", "1"),
  ];
  const map = buildLatestUndoableScortaEntryByRicambioId(entries, null);
  assert.equal(map.get("r1")?.id, "e0");
}

// scope filter
{
  const entries = [
    scortaEntry("e1", "r1", "1", "2", { autoreUserId: "u1", undoSessionId: "s1" }),
    scortaEntry("e0", "r1", "0", "1", { autoreUserId: "u2", undoSessionId: "s2" }),
  ];
  const map = buildLatestUndoableScortaEntryByRicambioId(entries, scope);
  assert.equal(map.get("r1")?.id, "e1");
  const noScope = buildLatestUndoableScortaEntryByRicambioId(entries, null);
  assert.equal(noScope.get("r1")?.id, "e1");
}

// index vs legacy on synthetic fixture — single log scan (ponytail: assert loop count via proxy)
{
  const ricambioCount = 2000;
  const logCount = 10_000;
  const ricambioIds = Array.from({ length: ricambioCount }, (_, i) => `r-${i}`);
  const entries: MagazzinoChangeLogEntry[] = [];
  for (let i = 0; i < logCount; i++) {
    const rid = ricambioIds[i % ricambioCount]!;
    entries.push(scortaEntry(`e-${i}`, rid, String(i), String(i + 1)));
  }

  let scanCount = 0;
  const entriesProxy = new Proxy(entries, {
    get(target, prop, receiver) {
      if (prop === "length" || typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      const idx = Number(prop);
      if (!Number.isNaN(idx)) scanCount += 1;
      return Reflect.get(target, prop, receiver);
    },
  });

  const indexed = buildLatestUndoableScortaEntryByRicambioId(entriesProxy as MagazzinoChangeLogEntry[], null);
  assert.equal(scanCount, logCount, "index builder must scan log exactly once");
  assert.equal(indexed.size, ricambioCount);

  const legacy = legacyLatestMap(entries, null);
  assert.equal(indexed.size, legacy.size);
  for (const [rid, entry] of indexed) {
    assert.equal(entry.id, legacy.get(rid)?.id, `mismatch for ${rid}`);
  }
}

// parseScortaChange sanity
{
  const e = scortaEntry("e1", "r1", "3", "5");
  assert.deepEqual(parseScortaChange(e), { prima: 3, dopo: 5 });
}

console.log("magazzino-scorta-undo.test.ts OK");
