import assert from "node:assert/strict";
import process from "node:process";

process.env.RESEND_FROM = "CAB Test <service@autocompattatori.it>";

import {
  assertAllowedSender,
  resolveSupplierOrderAllowedSenders,
  resolveSupplierOrderDefaultSender,
  SUPPLIER_ORDER_DEFAULT_FROM_EMAIL,
} from "@/lib/communications/senders/allowed-senders";
import { DEFAULT_COMMUNICATION_SETTINGS } from "@/lib/communications/settings/communication-settings";

const settings = {
  ...DEFAULT_COMMUNICATION_SETTINGS,
  supplierOrderSender: {
    displayName: "C.A.B.",
    fromEmail: SUPPLIER_ORDER_DEFAULT_FROM_EMAIL,
    replyToEmail: SUPPLIER_ORDER_DEFAULT_FROM_EMAIL,
  },
};

const allowed = resolveSupplierOrderAllowedSenders(settings, []);
assert.ok(allowed.some((s) => s.email === SUPPLIER_ORDER_DEFAULT_FROM_EMAIL));

const defaultSender = resolveSupplierOrderDefaultSender(settings, []);
assert.equal(defaultSender?.email, SUPPLIER_ORDER_DEFAULT_FROM_EMAIL);

assert.throws(() => assertAllowedSender({ email: "evil@other.com", displayName: "X" }, allowed));

const ok = assertAllowedSender(
  { email: SUPPLIER_ORDER_DEFAULT_FROM_EMAIL, displayName: "Override" },
  allowed,
);
assert.equal(ok.email, SUPPLIER_ORDER_DEFAULT_FROM_EMAIL);

console.log("allowed-senders.test.ts OK");
