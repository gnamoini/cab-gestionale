import assert from "node:assert/strict";
import { precedenceForSource } from "./source-precedence";
import { mergeFragments } from "./merge-engine";
import type { TkbSourceFragment } from "../types";

assert.ok(precedenceForSource("description_generation") > precedenceForSource("seed"));

const fragments: TkbSourceFragment[] = [
  {
    sourceId: "seed",
    precedence: 10,
    entityKind: "componente",
    entityKey: "pinza",
    payload: { slug: "pinza", label: "Pinza seed" },
    provenance: { origin: "seed" },
  },
  {
    sourceId: "ricambi",
    precedence: 40,
    entityKind: "componente",
    entityKey: "pinza",
    payload: { slug: "pinza", label: "Pinza ricambi", synonyms: ["freno"] },
    provenance: { origin: "ricambi", updatedAt: "2026-01-01" },
  },
];

const merged = mergeFragments(fragments);
assert.equal(merged.bundle.componenti[0]?.label, "Pinza ricambi");
assert.equal(merged.bundle.componenti[0]?.synonyms?.includes("freno"), true);

console.log("merge-engine.test.ts OK");
