import assert from "node:assert/strict";
import {
  formatRiferimentoOrdineFromPreventivo,
  normalizePreventivoNumeroForDedup,
} from "@/lib/ordini-fornitori/import/format-riferimento-ordine";

assert.equal(
  formatRiferimentoOrdineFromPreventivo("PRV-42", "2024-03-15"),
  "Rif. PRV-42 (15/03/2024)",
);
assert.equal(formatRiferimentoOrdineFromPreventivo("PRV-42", ""), "Rif. PRV-42");
assert.equal(formatRiferimentoOrdineFromPreventivo("", "2024-03-15"), "Rif. (15/03/2024)");
assert.equal(formatRiferimentoOrdineFromPreventivo("", ""), "");
assert.equal(normalizePreventivoNumeroForDedup("  prev.  ABC-1  "), "ABC-1");

console.log("format-riferimento-ordine.test.ts OK");
