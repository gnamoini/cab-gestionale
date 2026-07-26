import assert from "node:assert/strict";
import {
  buildMezziAnagraficaHubHref,
  buildMezziTagliandiHubHref,
  buildMezziTagliandiPresetsHref,
} from "@/lib/navigation/mezzi-tagliandi-links";

const anagrafica = buildMezziAnagraficaHubHref({ mezzoId: "abc-123" });
assert.ok(anagrafica.includes("view=anagrafica"));
assert.ok(anagrafica.includes("hubMezzo=abc-123"));
assert.ok(anagrafica.includes("hubTab=panoramica"));

const hub = buildMezziTagliandiHubHref({ mezzoId: "abc-123", highlight: "cfg-1" });
assert.ok(hub.includes("view=tagliandi"));
assert.ok(hub.includes("hubMezzo=abc-123"));
assert.ok(hub.includes("hubTab=tagliandi"));
assert.ok(hub.includes("highlight=cfg-1"));

const presets = buildMezziTagliandiPresetsHref();
assert.ok(presets.includes("tagliandiSection=preset"));

console.log("mezzi-tagliandi-links.test ok");
