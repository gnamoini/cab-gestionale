import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const deny = [
  "use-pull-to-refresh",
  "usePullToRefresh",
  "PullToRefreshIndicator",
  "pull-to-refresh-contract",
  "pull-to-refresh-indicator",
  "canPullToRefreshClaimGesture",
];

for (const pattern of deny) {
  assert.doesNotMatch(read("components/gestionale/app-shell.tsx"), new RegExp(pattern));
  assert.doesNotMatch(read("components/gestionale/app-shell-main.tsx"), new RegExp(pattern));
}

assert.equal(fs.existsSync(path.join(ROOT, "lib/ui/use-pull-to-refresh.ts")), false);
assert.equal(fs.existsSync(path.join(ROOT, "components/gestionale/pull-to-refresh-indicator.tsx")), false);

console.log("pull-to-refresh-removal-audit.test.ts OK");
