import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const authCtx = read("context/auth-context.tsx");
const clearInvalid = read("src/lib/auth/clear-invalid-auth-session.ts");

assert.match(authCtx, /signOut\(\{ scope: "global" \}\)/);
assert.doesNotMatch(authCtx, /signOut\(\{ scope: "local" \}\)/);
assert.match(clearInvalid, /signOut\(\{ scope: "global" \}\)/);
assert.doesNotMatch(clearInvalid, /scope: "local"/);

console.log("auth-logout-global-policy.test.ts OK");
