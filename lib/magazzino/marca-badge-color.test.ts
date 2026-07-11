import assert from "node:assert/strict";
import {
  getMarcaBadgeColorHex,
  MAGAZZINO_MARCA_BADGE_GRAY,
  magazzinoMarcaBadgeStyle,
  setMarcaBadgeColor,
} from "@/lib/magazzino/marca-badge-color";

const empty = { marche: [], categorie: [], mezziCompatibili: [], fornitori: [], produttori: [] };

const gray = magazzinoMarcaBadgeStyle("BTE", empty);
const colored = magazzinoMarcaBadgeStyle(
  "BTE",
  setMarcaBadgeColor(empty, "BTE", "#2563eb"),
);
assert.notEqual(gray.backgroundColor, colored.backgroundColor);
assert.equal(gray.backgroundColor, magazzinoMarcaBadgeStyle("BTE").backgroundColor);
assert.equal(getMarcaBadgeColorHex(setMarcaBadgeColor(empty, "BTE", "#2563eb"), "bte"), "#2563eb");
assert.equal(MAGAZZINO_MARCA_BADGE_GRAY, "#71717a");

console.log("marca-badge-color.test.ts OK");
