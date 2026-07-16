import assert from "node:assert/strict";
import { isGestionaleForegroundOverlayActive } from "@/lib/ui/use-gestionale-foreground-overlay";

assert.equal(isGestionaleForegroundOverlayActive(), false);

console.log("use-gestionale-foreground-overlay.test.ts OK");
