import assert from "node:assert/strict";
import {
  evaluateMezzoQrAuthorization,
  type MezzoQrAuthzContext,
  type MezzoQrTokenContext,
} from "@/lib/mezzo-labels/qr/authorize-mezzo-qr-access";

const TOKEN_CTX: MezzoQrTokenContext = {
  mezzoId: "mezzo-a",
  token: "CAB-TESTTOKEN1",
  tokenId: "tok-row-1",
};

function authCtx(overrides: Partial<MezzoQrAuthzContext>): MezzoQrAuthzContext {
  return {
    roleKey: "cliente",
    clienteRef: "Rossi Srl",
    mezzo: { id: "mezzo-a", cliente: "Rossi Srl" },
    canWriteLavorazioni: false,
    ...overrides,
  };
}

assert.deepEqual(
  evaluateMezzoQrAuthorization(TOKEN_CTX, authCtx({ roleKey: "cliente" })),
  { ok: true, mezzoId: "mezzo-a", token: "CAB-TESTTOKEN1", tokenId: "tok-row-1", audience: "cliente" },
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({
      roleKey: "cliente",
      clienteRef: "Rossi Srl",
      mezzo: { id: "mezzo-a", cliente: "Altri Spa" },
    }),
  ),
  { ok: false, code: "forbidden" },
  "cliente B con mezzo di cliente A → forbidden",
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({ roleKey: "cliente", mezzo: { id: "mezzo-a", cliente: "Rossi Srl" }, clienteRef: "Altri Spa" }),
  ),
  { ok: false, code: "forbidden" },
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(TOKEN_CTX, authCtx({ roleKey: "cliente", mezzo: null })),
  { ok: false, code: "forbidden" },
  "RLS fail-closed: mezzo row assente → forbidden senza leak",
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({
      roleKey: "cliente",
      mezzo: { id: "mezzo-b", cliente: "Rossi Srl" },
    }),
  ),
  { ok: false, code: "forbidden" },
  "token mezzo_id mismatch con row visibile → forbidden",
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({ roleKey: "operatore", canWriteLavorazioni: true }),
  ),
  { ok: true, mezzoId: "mezzo-a", token: "CAB-TESTTOKEN1", tokenId: "tok-row-1", audience: "operator" },
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({ roleKey: "guest", canWriteLavorazioni: false }),
  ),
  { ok: false, code: "forbidden" },
  "ruolo non-cliente senza write lavorazioni → forbidden",
);

assert.deepEqual(
  evaluateMezzoQrAuthorization(
    TOKEN_CTX,
    authCtx({ roleKey: "magazziniere", canWriteLavorazioni: false }),
  ),
  { ok: false, code: "forbidden" },
  "role !== cliente non basta senza verifyServerPageWrite",
);

console.log("authorize-mezzo-qr-access.test.ts OK");
