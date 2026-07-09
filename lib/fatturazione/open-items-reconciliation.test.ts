import assert from "node:assert/strict";
import {
  customerAccountingBalance,
  invoiceResidualMatchesOpenItem,
  invoiceTotalMatchesPaidPlusResidual,
} from "@/lib/fatturazione/open-items-reconciliation";

assert.ok(invoiceTotalMatchesPaidPlusResidual(1000, 400, 600));
assert.ok(invoiceResidualMatchesOpenItem(600, -600));
assert.ok(invoiceResidualMatchesOpenItem(0, 0));

// Eccedenza pagamento: fattura pagata (residuo 0), credito cliente su open item positivo
assert.ok(!invoiceResidualMatchesOpenItem(0, 50));

assert.equal(customerAccountingBalance(-1000, 200, 100), -700);

console.log("open-items-reconciliation.test.ts OK");
