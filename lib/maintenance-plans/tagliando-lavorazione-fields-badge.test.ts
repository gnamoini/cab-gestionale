import assert from "node:assert/strict";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  interventionLabelFromTagliandoFields,
  interventionLabelsFromTagliandoFields,
  interventionTypeFromTagliandoFields,
  interventionTypeShortBadge,
  lavorazioneRowToTagliandoFields,
  tagliandoFieldsFromInterventionType,
  tagliandoFieldsToLavorazionePatch,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";

assert.deepEqual(interventionTypeShortBadge("riparazione"), { code: "R", title: "Riparazione" });
assert.deepEqual(interventionTypeShortBadge("tagliando"), { code: "T", title: "Tagliando" });
assert.deepEqual(interventionTypeShortBadge("riparazione_tagliando"), {
  code: "T",
  title: "Tagliando + riparazione",
});

assert.equal(interventionTypeFromTagliandoFields({ isTagliando: false, repairPresent: false }), "riparazione");
assert.equal(interventionTypeFromTagliandoFields({ isTagliando: false, repairPresent: true }), "riparazione");
assert.equal(interventionTypeFromTagliandoFields({ isTagliando: true, repairPresent: false }), "tagliando");
assert.equal(
  interventionTypeFromTagliandoFields({ isTagliando: true, repairPresent: true }),
  "riparazione_tagliando",
);

assert.deepEqual(tagliandoFieldsFromInterventionType("riparazione"), {
  isTagliando: false,
  repairPresent: true,
});

assert.equal(DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS.isGaranzia, false);
assert.equal(DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS.isRecidivo, false);
assert.equal(DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS.repairPresent, true);
assert.equal(lavorazioneRowToTagliandoFields({ is_garanzia: true }).isGaranzia, true);
assert.equal(lavorazioneRowToTagliandoFields({ is_recidivo: true }).isRecidivo, true);

const repairOnlyPatch = tagliandoFieldsToLavorazionePatch({
  ...DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  repairPresent: true,
});
assert.equal(repairOnlyPatch.repair_present, true);
assert.equal(repairOnlyPatch.is_tagliando, false);

const allFlagsPatch = tagliandoFieldsToLavorazionePatch({
  ...DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  repairPresent: true,
  isTagliando: true,
  isGaranzia: true,
  isRecidivo: true,
});
assert.equal(allFlagsPatch.repair_present, true);
assert.equal(allFlagsPatch.is_tagliando, true);
assert.equal(allFlagsPatch.is_garanzia, true);
assert.equal(allFlagsPatch.is_recidivo, true);

assert.deepEqual(
  interventionLabelsFromTagliandoFields({
    repairPresent: true,
    isTagliando: true,
    isGaranzia: false,
    isRecidivo: true,
  }),
  ["Riparazione", "Tagliando", "Recidivo"],
);
assert.equal(
  interventionLabelFromTagliandoFields({
    repairPresent: false,
    isTagliando: false,
    isGaranzia: false,
    isRecidivo: false,
  }),
  null,
);

console.log("tagliando-lavorazione-fields-badge.test.ts OK");
