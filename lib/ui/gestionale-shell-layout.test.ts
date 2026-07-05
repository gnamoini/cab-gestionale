import assert from "node:assert/strict";
import {
  resolveGestionaleShellContentWidth,
  resolveGestionaleShellTier,
  resolveHostLayoutWidth,
} from "./gestionale-shell-layout";

assert.equal(resolveGestionaleShellTier(767), "mobile");
assert.equal(resolveGestionaleShellTier(768), "tablet");
assert.equal(resolveGestionaleShellTier(1023), "tablet");
assert.equal(resolveGestionaleShellTier(1024), "tablet");
assert.equal(resolveGestionaleShellTier(1362), "tablet");
assert.equal(resolveGestionaleShellTier(1399), "tablet");
assert.equal(resolveGestionaleShellTier(1400), "desktop");
assert.equal(resolveGestionaleShellTier(1440), "desktop");

// Con sidebar desktop il main è ~68px più stretto del viewport: tier deve usare host, non content.
assert.equal(resolveGestionaleShellTier(1332), "tablet");
assert.equal(resolveGestionaleShellTier(1400), "desktop");

// min tra shell, colonna, main, viewport
assert.equal(
  resolveGestionaleShellContentWidth({
    shellEl: { clientWidth: 1400, getBoundingClientRect: () => ({ width: 1400 }) } as HTMLElement,
    shellColEl: { clientWidth: 360, getBoundingClientRect: () => ({ width: 360 }) } as HTMLElement,
    mainEl: { clientWidth: 350, getBoundingClientRect: () => ({ width: 350 }) } as HTMLElement,
  }),
  350,
);

assert.equal(
  resolveGestionaleShellContentWidth({
    shellEl: { clientWidth: 390, getBoundingClientRect: () => ({ width: 390 }) } as HTMLElement,
    shellColEl: { clientWidth: 390, getBoundingClientRect: () => ({ width: 390 }) } as HTMLElement,
    mainEl: { clientWidth: 390, getBoundingClientRect: () => ({ width: 390 }) } as HTMLElement,
  }),
  390,
);

assert.equal(resolveHostLayoutWidth(), 0);

console.log("gestionale-shell-layout.test.ts OK");
