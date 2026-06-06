import assert from "node:assert/strict";
import {
  gestionaleModalWidthStandard,
  gestionaleModalWidthWide,
  resolveGestionaleModalWidth,
} from "@/lib/ui/modal-max-width-class";

assert.match(gestionaleModalWidthStandard, /md:max-w-3xl/);
assert.match(gestionaleModalWidthStandard, /48rem/);
assert.match(gestionaleModalWidthStandard, /max-md:max-w-none/);
assert.equal(gestionaleModalWidthWide, gestionaleModalWidthStandard);

const standard = resolveGestionaleModalWidth("standard");
assert.equal(standard, gestionaleModalWidthStandard);

const wide = resolveGestionaleModalWidth("wide");
assert.equal(wide, gestionaleModalWidthStandard);

console.log("modal-max-width-class.test.ts OK");
