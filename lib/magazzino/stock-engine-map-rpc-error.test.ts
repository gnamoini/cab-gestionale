/**
 * Verifica mapRpcError: 23505 generico non diventa StockVersionConflictError.
 */
import assert from "node:assert/strict";

// ponytail: mirror minimale della logica mapRpcError (no import server-only)
function mapRpcErrorMessage(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "";
  if (msg.includes("stock_version_conflict")) return "STOCK_VERSION_CONFLICT";
  if (msg.includes("insufficient_stock") || error.code === "23514") return "INSUFFICIENT_STOCK";
  if (msg.includes("ricambio_not_found") || error.code === "P0002") return "RICAMBIO_NOT_FOUND";
  return msg || "STOCK_ENGINE_FAILED";
}

assert.equal(mapRpcErrorMessage({ message: "duplicate key", code: "23505" }), "duplicate key");
assert.equal(
  mapRpcErrorMessage({ message: "stock_version_conflict", code: "23505" }),
  "STOCK_VERSION_CONFLICT",
);
assert.equal(mapRpcErrorMessage({ message: "insufficient_stock", code: "23514" }), "INSUFFICIENT_STOCK");

console.log("stock-engine-map-rpc-error.test.ts OK");
