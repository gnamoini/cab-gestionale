import assert from "node:assert/strict";
import { canonicalizeSlug } from "./canonicalize";
import { hashDraftBundle } from "./tkb-snapshot-builder";
import type { TkbDraftBundle } from "./types";

const base: TkbDraftBundle = {
  categorie: [{ slug: "freni", label: "Freni", sortOrder: 2 }],
  componenti: [{ slug: "pinza", label: "Pinza", synonyms: ["caliper"] }],
  sintomi: [],
  procedure: [],
  interventi: [
    {
      slug: "sost_pinza",
      label: "Sostituzione pinza",
      keywords: ["pinza", "freno"],
      attivitaPrincipali: [
        {
          activityId: "act_sost_pinza",
          text: "Sostituzione pinza freno",
          sort: 10,
          required: true,
          activityType: "sostituzione",
        },
      ],
    },
  ],
  ricambiMap: [],
};

const reversed: TkbDraftBundle = {
  ...base,
  categorie: [...base.categorie].reverse(),
  interventi: [
    {
      ...base.interventi[0]!,
      keywords: ["freno", "pinza"],
    },
  ],
};

assert.equal(hashDraftBundle(base), hashDraftBundle(reversed));
assert.equal(canonicalizeSlug("  Pinza  Freno "), "pinza_freno");

console.log("canonicalize.test.ts OK");
