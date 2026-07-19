/**
 * LEVEL 2: PageTransitionLoader in Suspense; PageLayout solo in loading.tsx / view (mai duplicato in page.tsx).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PAGE_TRANSITION_LOADER_ROUTES } from "./loading-transition-fallback-allowlist";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  const violations: string[] = [];

  for (const pageRel of PAGE_TRANSITION_LOADER_ROUTES) {
    const text = read(pageRel);
    if (!/<Suspense/.test(text)) {
      violations.push(`${pageRel}: manca <Suspense`);
      continue;
    }

    if (/<PageLayout/.test(text)) {
      violations.push(`${pageRel}: PageLayout in page.tsx duplica header view/loading`);
    }

    if (!/fallback=\{<PageTransitionLoader\s*\/>\}/.test(text)) {
      violations.push(`${pageRel}: atteso fallback={<PageTransitionLoader />}`);
    }
  }

  assert.equal(violations.length, 0, violations.join("\n"));
  console.log("page-layout-suspense-policy.test.ts: OK");
}

main();
