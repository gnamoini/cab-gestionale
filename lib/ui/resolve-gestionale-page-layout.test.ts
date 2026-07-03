import assert from "node:assert/strict";
import {
  gestionalePageLayoutSsrHint,
  resolveGestionalePageLayout,
  type GestionalePageLayoutInput,
} from "./resolve-gestionale-page-layout";

function resolve(partial: Partial<GestionalePageLayoutInput> & Pick<GestionalePageLayoutInput, "ssrHint">) {
  return resolveGestionalePageLayout({
    viewportWidth: 1440,
    containerWidth: 1100,
    shellContentWidth: 1440,
    ...partial,
  });
}

// R1
assert.equal(
  resolve({ shellContentWidth: 0, viewportWidth: 1920, containerWidth: 1200, ssrHint: "unknown" }),
  "mobile",
);

// R2
assert.equal(
  resolve({ shellContentWidth: 1440, ssrHint: "unknown" }),
  "mobile",
);

// R3
assert.equal(
  resolve({ viewportWidth: 1279, containerWidth: 1100, ssrHint: "measured" }),
  "mobile",
);

// R4
assert.equal(
  resolve({ viewportWidth: 1280, containerWidth: 1024, ssrHint: "measured" }),
  "desktop",
);
assert.equal(
  resolve({ viewportWidth: 1440, containerWidth: 1100, ssrHint: "measured" }),
  "desktop",
);

// R5 container precedence
assert.equal(
  resolve({ viewportWidth: 1440, containerWidth: 800, ssrHint: "measured" }),
  "mobile",
);
assert.equal(
  resolve({ viewportWidth: 1280, containerWidth: 1023, ssrHint: "measured" }),
  "mobile",
);

// determinismo
const input = {
  viewportWidth: 1440,
  containerWidth: 1100,
  shellContentWidth: 1440,
  ssrHint: "measured" as const,
};
assert.equal(resolveGestionalePageLayout(input), resolveGestionalePageLayout(input));

assert.equal(gestionalePageLayoutSsrHint(0), "unknown");
assert.equal(gestionalePageLayoutSsrHint(100), "measured");

// lg tier
assert.equal(
  resolveGestionalePageLayout({
    viewportWidth: 1100,
    containerWidth: 900,
    shellContentWidth: 1100,
    ssrHint: "measured",
    listTier: "lg",
  }),
  "desktop",
);

console.log("resolve-gestionale-page-layout.test.ts OK");
