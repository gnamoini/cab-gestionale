import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const allowlist = [
  path.join(ROOT, "lib/browser/popup-guard.ts"),
  path.join(ROOT, "lib/browser/popup-guard.test.ts"),
];

const offenders: string[] = [];
for (const file of walkTsFiles(ROOT)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  if (allowlist.includes(file)) continue;
  if (file.includes(`${path.sep}node_modules${path.sep}`)) continue;
  const content = read(path.relative(ROOT, file));
  if (/window\.open\s*\(/.test(content)) {
    offenders.push(path.relative(ROOT, file));
  }
}

assert.deepEqual(
  offenders,
  [],
  `window.open must go through popup-guard. Offenders: ${offenders.join(", ")}`,
);

const openUrl = read("lib/pdf/open-url-new-tab.ts");
assert.match(openUrl, /openSafePopup/);
assert.match(openUrl, /openBlankPopupWindow/);

const openPreview = read("lib/pdf/open-pdf-blob-preview.ts");
assert.match(openPreview, /openDeferredPopup/);
assert.match(openPreview, /acquireDeferredHandle/);

const requestArtifact = read("lib/pdf/request-pdf-artifact.ts");
assert.match(requestArtifact, /openDeferredPopup/);
assert.match(requestArtifact, /retryUrl:\s*options\.url/);
assert.match(requestArtifact, /deferred\.close\(\)/);

const providers = read("components/app-providers-core.tsx");
assert.match(providers, /PopupGuardProvider/);

const popupGuard = read("lib/browser/popup-guard.ts");
assert.doesNotMatch(popupGuard, /window\.open\([^)]*noopener/);
assert.doesNotMatch(popupGuard, /<embed\b/);
assert.match(popupGuard, /navigateBlobPdfInPopup/);
assert.match(popupGuard, /location\.replace/);

console.log("popup-guard-policy: OK");
