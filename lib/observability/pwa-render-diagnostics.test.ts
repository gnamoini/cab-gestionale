import assert from "node:assert/strict";
import { resolvePwaDisplayMode } from "@/lib/pwa/pwa-display-mode";

assert.equal(
  resolvePwaDisplayMode({
    matchMedia: (q) => ({ matches: q === "(display-mode: standalone)" }),
  }),
  "standalone",
);

assert.equal(
  resolvePwaDisplayMode({
    matchMedia: () => ({ matches: false }),
    navigatorStandalone: false,
  }),
  "browser",
);

console.log("pwa-render-diagnostics.test.ts OK");
