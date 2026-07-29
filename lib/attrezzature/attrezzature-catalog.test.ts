import assert from "node:assert/strict";
import { mergeAttrezzatureMarcheTrees, resolveMezziListeWithFleetCatalog } from "@/lib/attrezzature/attrezzature-catalog";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const fleet = [{ id: "fleet-marca-28", nome: "Schmidt", modelli: [{ id: "fleet-mod-28-0", nome: "Cleango 400" }] }];
const prefs = createMezziListePrefsDefault();
const prefsWithSchmidt = {
  ...prefs,
  attrezzature: [
    {
      id: "mig-marca-schmidt-4",
      nome: "Schmidt",
      modelli: [{ id: "mod-cleango-500", nome: "Cleango 500 E6C" }],
    },
  ],
};

const merged = resolveMezziListeWithFleetCatalog(prefsWithSchmidt, fleet);
const schmidt = (merged.attrezzature ?? []).find((m) => m.nome === "Schmidt");
assert.ok(schmidt, "Schmidt presente nel merge");
assert.equal(schmidt!.id, "mig-marca-schmidt-4", "prefs ID stabile vince su fleet-marca-N");
assert.ok(
  schmidt!.modelli.some((m) => m.nome === "Cleango 400"),
  "modelli flotta aggiunti sotto ID prefs",
);
assert.ok(
  schmidt!.modelli.some((m) => m.id === "mod-cleango-500"),
  "modelli prefs conservati",
);

const fleetOnly = [{ id: "f1", nome: "FleetMarca", modelli: [{ id: "fm1", nome: "FM1" }] }];
const mergedFleetOnly = resolveMezziListeWithFleetCatalog(prefs, fleetOnly);
assert.ok((mergedFleetOnly.attrezzature ?? []).some((m) => m.nome === "FleetMarca"));

const both = mergeAttrezzatureMarcheTrees(fleetOnly, prefs.attrezzature ?? []);
assert.ok(both.length >= 1);

console.log("attrezzature-catalog.test.ts OK");
