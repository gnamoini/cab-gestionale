import assert from "node:assert/strict";
import {
  evaluateRicambioCodeIntent,
  getRicambioCodeIntentScore,
  isLikelyRicambioCodice,
  RICAMBIO_CODE_INTENT_SEED_THRESHOLD,
} from "@/lib/magazzino/ricambio-code-intent";

function assertLikely(value: string) {
  assert.ok(
    isLikelyRicambioCodice(value),
    `expected likely: ${JSON.stringify(value)} score=${getRicambioCodeIntentScore(value)}`,
  );
}

function assertNotLikely(value: string) {
  assert.ok(
    !isLikelyRicambioCodice(value),
    `expected not likely: ${JSON.stringify(value)} score=${getRicambioCodeIntentScore(value)}`,
  );
}

assert.equal(RICAMBIO_CODE_INTENT_SEED_THRESHOLD, 60);

assertLikely("8ESNS030000001");
assert.ok(getRicambioCodeIntentScore("8ESNS030000001") >= 80);

assertLikely("095532148-0");
assert.ok(getRicambioCodeIntentScore("095532148-0") >= 65);

assertLikely("095532148 - 0");
assert.ok(getRicambioCodeIntentScore("095532148 - 0") >= 60);

assertLikely("45732000056");
assert.ok(getRicambioCodeIntentScore("45732000056") >= 60);

assertLikely("CF60SLA");
assert.ok(getRicambioCodeIntentScore("CF60SLA") >= 70);

assertLikely("CF60 SLA");
assert.ok(getRicambioCodeIntentScore("CF60 SLA") >= 60);

assertLikely("CLEANGOSLM");
assert.ok(getRicambioCodeIntentScore("CLEANGOSLM") >= 60);

assertLikely("cleangoslm");
assert.equal(
  getRicambioCodeIntentScore("cleangoslm"),
  getRicambioCodeIntentScore("CLEANGOSLM") - 5,
);

assertNotLikely("filtro olio");
assert.ok(getRicambioCodeIntentScore("filtro olio") < 20);

assertNotLikely("pompa acqua");
assert.ok(getRicambioCodeIntentScore("pompa acqua") < 20);

assertNotLikely("123456");
assert.ok(getRicambioCodeIntentScore("123456") < 60);

assertLikely("123456789");
assert.ok(getRicambioCodeIntentScore("123456789") >= 60);

assertNotLikely("000000000");
assertNotLikely("abc");
assertNotLikely("123");
assertNotLikely("");
assertNotLikely("   ");

assertNotLikely("KIT FRIZIONE 12345");
assert.ok(getRicambioCodeIntentScore("KIT FRIZIONE 12345") < 40);

const mixed = evaluateRicambioCodeIntent("8ESNS030000001");
assert.ok(mixed.reasons.includes("contains_digits"));
assert.ok(mixed.reasons.includes("mixed_alpha_numeric"));

const letters = evaluateRicambioCodeIntent("CLEANGOSLM");
assert.ok(letters.reasons.includes("letters_only_code"));
assert.ok(letters.reasons.includes("all_uppercase"));

const zeros = evaluateRicambioCodeIntent("000000000");
assert.ok(zeros.reasons.includes("all_zeros"));

console.log("ricambio-code-intent.test.ts OK");
