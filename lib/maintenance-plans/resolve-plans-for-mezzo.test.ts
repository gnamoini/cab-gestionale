import assert from "node:assert/strict";
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";

const catalog = [
  { id: "t1", label: "Spazzatrice stradale" },
  { id: "t2", label: "Compattatore rifiuti" },
];

const plans: MaintenancePlanView[] = [
  {
    id: "p1",
    nome: "Tagliando 500h",
    intervalOre: 500,
    isActive: true,
    tipoLabels: ["Spazzatrice stradale"],
    tipoIds: ["t1"],
    parts: [],
  },
  {
    id: "p2",
    nome: "Altro",
    intervalOre: 1000,
    isActive: true,
    tipoLabels: ["Compattatore rifiuti"],
    tipoIds: ["t2"],
    parts: [],
  },
];

const hit = resolvePlansForMezzo({ tipoAttrezzatura: "Spazzatrice stradale", catalog, plans });
assert.equal(hit.length, 1);
assert.equal(hit[0]!.id, "p1");

const miss = resolvePlansForMezzo({ tipoAttrezzatura: "—", catalog, plans });
assert.equal(miss.length, 0);

const shorthand = resolvePlansForMezzo({ tipoAttrezzatura: "Spazzatrice", catalog, plans });
assert.equal(shorthand.length, 0);

console.log("resolve-plans-for-mezzo.test.ts OK");
