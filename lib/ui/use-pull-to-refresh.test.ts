import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const hookSrc = readFileSync(join(root, "lib/ui/use-pull-to-refresh.ts"), "utf8");

assert.match(hookSrc, /canPullToRefreshClaimGesture/);
assert.doesNotMatch(hookSrc, /resolveGestureOwner/);
assert.match(hookSrc, /e\.preventDefault\(\)/);

console.log("use-pull-to-refresh.test.ts OK");
