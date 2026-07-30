import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const layout = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
const script = fs.readFileSync(
  path.join(process.cwd(), "lib/theme/turbopack-css-hmr-recovery-inline-script.ts"),
  "utf8",
);

assert.match(layout, /turbopack-css-hmr-recovery/, "root layout deve caricare lo shim dev Turbopack CSS HMR");
assert.match(script, /No link element found for chunk/, "shim deve intercettare l'errore Turbopack CSS HMR");
assert.match(script, /root-of-the-server/, "shim deve intercettare anche chunk root-of-the-server css");
assert.match(script, /stopImmediatePropagation/, "shim deve bloccare propagazione verso overlay dev");
assert.match(script, /unhandledrejection/, "shim deve usare unhandledrejection");
assert.match(script, /addEventListener\("error"/, "shim deve intercettare anche error sincroni");
assert.match(script, /,true\)/, "shim deve registrarsi in capture phase");

console.log("turbopack-css-hmr-recovery-policy.test.ts OK");
