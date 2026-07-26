import assert from "node:assert/strict";
import { LAVORAZIONI_LIST_DESKTOP_VIEWPORT_MQ } from "./use-lavorazioni-list-layout";

assert.equal(LAVORAZIONI_LIST_DESKTOP_VIEWPORT_MQ, "(min-width: 1280px)");

console.log("use-lavorazioni-list-layout.test.ts OK");
