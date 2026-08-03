import assert from "node:assert/strict";
import {
  installServiceWorkerControllerChangeReload,
  markPwaUpdateApplyRequested,
} from "@/lib/pwa/sw-client";

const values = new Map<string, string>();
const listeners = new Set<() => void>();
let reloads = 0;

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { reload: () => reloads++ } },
});

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    serviceWorker: {
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    },
  },
});

const remove = installServiceWorkerControllerChangeReload();
for (const listener of listeners) listener();
assert.equal(reloads, 0, "initial controller acquisition must not reload");

markPwaUpdateApplyRequested();
for (const listener of listeners) listener();
assert.equal(reloads, 1, "explicit update must reload once");

for (const listener of listeners) listener();
assert.equal(reloads, 1, "controllerchange must not create a reload loop");

remove();
console.log("sw-client.test.ts OK");
