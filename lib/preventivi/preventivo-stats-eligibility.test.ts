import assert from "node:assert/strict";
import {
  isClosedCustomerDecision,
  isPreventivoCountedInEconomicStats,
  isPreventivoInCommercialFunnel,
} from "@/lib/preventivi/preventivo-stats-eligibility";

assert.equal(isPreventivoCountedInEconomicStats({ statoCliente: "accettato" }), true);
assert.equal(isPreventivoCountedInEconomicStats({ statoCliente: "pending" }), false);
assert.equal(isPreventivoCountedInEconomicStats({ statoCliente: "rifiutato" }), false);
assert.equal(isPreventivoCountedInEconomicStats({ statoCliente: null }), false);

assert.equal(isClosedCustomerDecision({ statoCliente: "accettato" }), true);
assert.equal(isClosedCustomerDecision({ statoCliente: "rifiutato" }), true);
assert.equal(isClosedCustomerDecision({ statoCliente: "pending" }), false);

assert.equal(
  isPreventivoInCommercialFunnel({ statoWorkflow: "inviato", statoCliente: "pending", inviatoAt: "x" }),
  true,
);
assert.equal(
  isPreventivoInCommercialFunnel({ statoWorkflow: "bozza", statoCliente: null, inviatoAt: null }),
  false,
);

console.log("preventivo-stats-eligibility.test.ts OK");
