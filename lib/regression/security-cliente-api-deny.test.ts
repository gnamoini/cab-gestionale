import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const src = fs.readFileSync(path.join(ROOT, "src/middleware/proxy-handler.ts"), "utf8");
const allowlist = fs.readFileSync(path.join(ROOT, "lib/auth/staff-api-allowlist.ts"), "utf8");

assert.match(src, /isStaffOnlyApiPath/);
assert.match(src, /isClienteRole\(activeUser\).*403/s);
assert.match(allowlist, /CLIENTE_API_ALLOWLIST/);

console.log("security-cliente-api-deny.test: OK");
