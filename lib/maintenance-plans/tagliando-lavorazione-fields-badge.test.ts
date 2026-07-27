import assert from "node:assert/strict";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  interventionTypeFromTagliandoFields,
  interventionTypeShortBadge,
  lavorazioneRowToTagliandoFields,
  tagliandoFieldsToLavorazionePatch,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";

assert.deepEqual(interventionTypeShortBadge("riparazione"), { code: "R", title: "Riparazione" });
assert.deepEqual(interventionTypeShortBadge("tagliando"), { code: "T", title: "Tagliando" });
assert.deepEqual(interventionTypeShortBadge("riparazione_tagliando"), {
  code: "T",
  title: "Tagliando + riparazione",
});

assert.equal(interventionTypeFromTagliandoFields({ isTagliando: false, repairPresent: false }), "riparazione");
assert.equal(interventionTypeFromTagliandoFields({ isTagliando: true, repairPresent: false }), "tagliando");
assert.equal(
  interventionTypeFromTagliandoFields({ isTagliando: true, repairPresent: true }),
  "riparazione_tagliando",
);

assert.equal(DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS.isGaranzia, false);
assert.equal(lavorazioneRowToTagliandoFields({ is_garanzia: true }).isGaranzia, true);
assert.equal(
  tagliandoFieldsToLavorazionePatch({
    ...DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
    isGaranzia: true,
  }).is_garanzia,
  true,
);

console.log("tagliando-lavorazione-fields-badge.test.ts OK");
