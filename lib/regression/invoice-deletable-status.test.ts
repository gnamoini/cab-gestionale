import assert from "node:assert/strict";
import { invoiceIsDeletable, INVOICE_DELETABLE_STATUSES } from "@/src/services/invoices.service";

assert.equal(INVOICE_DELETABLE_STATUSES.size, 2);
assert.equal(invoiceIsDeletable("bozza"), true);
assert.equal(invoiceIsDeletable("da_verificare"), true);
assert.equal(invoiceIsDeletable("emessa"), false);
assert.equal(invoiceIsDeletable("pagata"), false);

console.log("invoice-deletable-status.test.ts OK");
