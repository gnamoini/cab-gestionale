import assert from "node:assert/strict";
import { buildAgingSummary, scadenziarioDebitItems } from "./aging-analytics";
import { openItemAbsRemaining, openItemAgingBucket, openItemDaysOverdue } from "./open-items";
import type { CustomerOpenItemRow } from "@/src/types/supabase-tables";

const item = (partial: Partial<CustomerOpenItemRow>): CustomerOpenItemRow => ({
  id: "1",
  customer_id: null,
  source_type: "invoice",
  source_id: null,
  invoice_id: "inv-1",
  document_number: "2026/1",
  currency: "EUR",
  amount_signed: -1000,
  remaining_signed: -500,
  due_date: "2026-01-01",
  status: "partial",
  opened_at: null,
  closed_at: null,
  created_at: "",
  updated_at: "",
  ...partial,
});

assert.equal(openItemAbsRemaining(item({ remaining_signed: -500 })), 500);
assert.equal(openItemAgingBucket("2026-06-01", new Date("2026-07-08")), "31-60");
assert.equal(openItemDaysOverdue("2026-01-01", new Date("2026-07-08")), 187);

const debits = scadenziarioDebitItems([
  item({ remaining_signed: -100 }),
  item({ remaining_signed: 200, status: "open" }),
  item({ remaining_signed: -50, status: "closed" }),
]);
assert.equal(debits.length, 1);

const aging = buildAgingSummary([item({ remaining_signed: -100, due_date: "2026-06-01" })], new Date("2026-07-08"));
assert.equal(aging["31-60"].count, 1);

console.log("open-items-aging.test.ts OK");
