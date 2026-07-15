import assert from "node:assert/strict";
import { ingressoBlankSignatureRegionsNormalized } from "@/lib/document-capture/capture-signature-template";
import { getIngressoBlankSignatureBoxesMm } from "@/lib/pdf/schede-blank-layout";

const boxes = getIngressoBlankSignatureBoxesMm();
assert.equal(boxes.richiedente.top, 136);
assert.equal(boxes.addetto.left, 107);

const regions = ingressoBlankSignatureRegionsNormalized();
assert.ok(regions.richiedente.ymin >= 430 && regions.richiedente.ymax <= 560);
assert.ok(regions.addetto.xmin > regions.richiedente.xmax);

console.log("capture-signature-template.test.ts OK");
