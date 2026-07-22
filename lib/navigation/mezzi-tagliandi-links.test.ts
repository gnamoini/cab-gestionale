import assert from "node:assert/strict";
import { buildMezziTagliandiHubHref, buildMezziTagliandiPresetsHref } from "@/lib/navigation/mezzi-tagliandi-links";

const hub = buildMezziTagliandiHubHref({ mezzoId: "abc-123", highlight: "cfg-1" });
assert.ok(hub.includes("view=tagliandi"));
assert.ok(hub.includes("hubMezzo=abc-123"));
assert.ok(hub.includes("hubTab=tagliandi"));
assert.ok(hub.includes("highlight=cfg-1"));

const presets = buildMezziTagliandiPresetsHref();
assert.ok(presets.includes("tagliandiSection=preset"));

console.log("mezzi-tagliandi-links.test ok");
