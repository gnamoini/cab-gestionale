import {
  pickPreventivoWritePayload,
  PREVENTIVO_WRITABLE_KEYS,
} from "@/lib/validation/services/preventivi-payload";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const picked = pickPreventivoWritePayload({
  mezzo_id: "abc",
  cliente: "  Cliente Test  ",
  created_at: "2020-01-01",
  id: "evil",
  dettagli: { righe: [] },
});

assert(picked.mezzo_id === "abc", "mezzo_id picked");
assert(picked.cliente === "Cliente Test", "cliente trimmed");
assert(!("created_at" in picked), "created_at stripped");
assert(!("id" in picked), "non-uuid id stripped");
assert(Array.isArray((picked.dettagli as { righe?: unknown }).righe), "dettagli kept");
assert(PREVENTIVO_WRITABLE_KEYS.length === 6, "writable keys count");

const withUuid = pickPreventivoWritePayload({
  id: VALID_UUID,
  mezzo_id: "abc",
  cliente: "Cliente",
  totale: 100,
  dettagli: {},
});
assert(withUuid.id === VALID_UUID, "valid uuid id preserved");

console.log("preventivi-payload.test.ts OK");
