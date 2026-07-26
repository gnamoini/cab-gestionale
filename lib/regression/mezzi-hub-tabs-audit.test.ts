import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MEZZI_HUB_TAB_ORDER, normalizeMezziHubTabId } from "@/components/gestionale/mezzi/mezzi-hub-ui";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(!MEZZI_HUB_TAB_ORDER.includes("log" as never), "log tab must be removed from MEZZI_HUB_TAB_ORDER");
assert.equal(normalizeMezziHubTabId("log"), "timeline", "hubTab=log maps to timeline");
assert.equal(normalizeMezziHubTabId("attrezzature"), "panoramica", "hubTab=attrezzature maps to panoramica");
assert.equal(normalizeMezziHubTabId("foto"), "panoramica", "hubTab=foto maps to panoramica");

const detailModal = read("components/gestionale/mezzi/mezzi-hub-detail-modal.tsx");
assert.doesNotMatch(detailModal, /tab === "log"/);
assert.doesNotMatch(detailModal, /tab === "attrezzature"/);
assert.doesNotMatch(detailModal, /tab === "foto"/);
assert.match(detailModal, /title="Anagrafica"/);
assert.match(detailModal, /MezziHubPanoramicaAttrezzaturaSection/);
const attrezzPanel = read("components/gestionale/mezzi/mezzi-hub-attrezzature-panel.tsx");
assert.match(attrezzPanel, /attrezzaturaMirrorsMezzo/);
assert.doesNotMatch(attrezzPanel, /label="Portata"/i);
assert.doesNotMatch(attrezzPanel, /label="Anno"/i);
assert.match(detailModal, /hubCardLayout/);
assert.match(detailModal, /hubCardShowTitle/);
assert.doesNotMatch(detailModal, /MezziHubLavorazioniPanel/);
assert.doesNotMatch(detailModal, /MezziHubLogPanel/);

const mezziView = read("components/gestionale/mezzi/mezzi-view.tsx");
assert.match(mezziView, /normalizeMezziHubTabId/);

const legacyPanel = path.join(ROOT, "components/gestionale/mezzi/mezzi-hub-lavorazioni-panel.tsx");
const legacyTimeline = path.join(ROOT, "components/gestionale/mezzi/mezzi-hub-lavorazioni-timeline.tsx");
assert.equal(fs.existsSync(legacyPanel), false, "legacy lavorazioni panel removed");
assert.equal(fs.existsSync(legacyTimeline), false, "legacy lavorazioni timeline removed");

console.log("mezzi-hub-tabs-audit.test.ts OK");
