import assert from "node:assert/strict";
import { ingressoBlankFieldRegionsNormalized } from "@/lib/document-capture/capture-template-field-template";
import { ingressoBlankPageSizeMm } from "@/lib/pdf/schede-blank-layout";

const regions = ingressoBlankFieldRegionsNormalized();
assert.ok(regions.length >= 10, "ingresso should expose header + grid fields");

for (const region of regions) {
  const { xmin, ymin, xmax, ymax } = region.bbox;
  assert.ok(xmax > xmin && ymax > ymin, `invalid bbox for ${region.fieldKey}`);
  assert.ok(xmin >= 0 && ymin >= 0, `negative origin for ${region.fieldKey}`);
  assert.ok(xmax <= 1000 && ymax <= 1000, `bbox overflow for ${region.fieldKey}`);
}

const keys = new Set(regions.map((r) => r.fieldKey));
assert.ok(keys.has("data_ingresso"));
assert.ok(keys.has("cliente"));
assert.ok(keys.has("attrezzatura_marca"));

void ingressoBlankPageSizeMm;
console.log("capture-template-field-template.test.ts OK");
