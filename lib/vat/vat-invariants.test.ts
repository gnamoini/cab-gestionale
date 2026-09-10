import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateVatLine } from "@/lib/vat/vat-calculation";
import { validateConfigurationCombo, validateInvoiceVatForEInvoiceRow } from "@/lib/vat/vat-validation.server";
import { resolveEsigibilitaIva } from "@/lib/vat/vat-einvoice-context";
import { vatAmountsConsistent } from "@/lib/vat/vat-rounding";
import type { VatConfiguration } from "@/lib/vat/types";

const ROOT = process.cwd();

const SCHEMA_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270211120000_fase7_vat_engine_schema.sql"),
  "utf8",
);
const RPC_SQL = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270211120100_fase7_vat_engine_rpc.sql"),
  "utf8",
);

assert.match(SCHEMA_SQL, /vat_code_configurations_no_overlap/);
assert.match(SCHEMA_SQL, /direction with =/);
assert.match(SCHEMA_SQL, /vat_snapshot_version/);
assert.match(RPC_SQL, /vat_validate_configuration_combo/);
assert.match(RPC_SQL, /vat_resolve_configuration/);

const imponibileCfg: VatConfiguration = {
  configuration_id: "1",
  vat_code_id: "1",
  vat_code: "IVA22",
  description: "IVA 22%",
  rate: 22,
  nature_code: null,
  operation_type_code: "IMPONIBILE",
  direction: "sales",
  deductibility_rate: 0,
  vat_account_id: null,
  vat_register_id: null,
  valid_from: "2026-01-01",
  valid_to: null,
  normative_reference: null,
};

{
  const line = calculateVatLine({ configuration: imponibileCfg, quantita: 1, prezzo_unitario: 100 });
  assert.equal(line.taxable_amount, 100);
  assert.equal(line.vat_amount, 22);
  assert.ok(vatAmountsConsistent(100, 22, 22));
}

{
  const err = validateConfigurationCombo({ operation_type_code: "IMPONIBILE", nature_code: "N4", rate: 22 });
  assert.equal(err?.code, "VAT_NATURE_NOT_ALLOWED");
}

{
  const err = validateConfigurationCombo({ operation_type_code: "ESENTE", nature_code: null, rate: 0 });
  assert.equal(err?.code, "VAT_NATURE_REQUIRED");
}

{
  const err = validateInvoiceVatForEInvoiceRow({
    imponibile: 100,
    iva: 20,
    vat_rate: 22,
    vat_nature: null,
    vat_operation_type: "IMPONIBILE",
    vat_snapshot: { snapshot_version: 1 },
  });
  assert.equal(err?.code, "VAT_AMOUNT_MISMATCH");
}

assert.equal(resolveEsigibilitaIva(imponibileCfg, { split_payment: true }), "S");
assert.equal(resolveEsigibilitaIva(imponibileCfg, {}), "I");

console.log("vat-invariants.test.ts OK");
