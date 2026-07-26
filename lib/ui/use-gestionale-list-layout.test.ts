import assert from "node:assert/strict";
import { gestionaleListLayoutViewportMq } from "./gestionale-list-responsive";

assert.equal(gestionaleListLayoutViewportMq("xl"), "(min-width: 1280px)");
assert.equal(gestionaleListLayoutViewportMq("lg"), "(min-width: 1024px)");
assert.equal(gestionaleListLayoutViewportMq("md"), "(min-width: 768px)");

console.log("use-gestionale-list-layout.test.ts OK");
