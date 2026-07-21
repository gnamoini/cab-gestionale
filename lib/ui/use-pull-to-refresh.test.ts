import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const hookSrc = readFileSync(join(root, "lib/ui/use-pull-to-refresh.ts"), "utf8");
const contractSrc = readFileSync(join(root, "lib/ui/pull-to-refresh-contract.ts"), "utf8");
const shellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");

assert.match(hookSrc, /canPullToRefreshClaimGesture/);
assert.match(hookSrc, /resolvePullScrollport/);
assert.match(hookSrc, /isBlockingOverlayVisible/);
assert.doesNotMatch(hookSrc, /BODY_LOCK_ATTR/);
assert.match(hookSrc, /e\.preventDefault\(\)/);
assert.match(contractSrc, /data-cab-scrollport/);
assert.match(shellSrc, /enabled:\s*isCompactShell/);

console.log("use-pull-to-refresh.test.ts OK");
