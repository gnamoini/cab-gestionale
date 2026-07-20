/**
 * LEVEL 2: PageLayout fuori Suspense + PageTransitionLoader structural skeleton in fallback.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES,
  PAGE_TRANSITION_LOADER_ROUTES,
  PAGE_TRANSITION_LOADER_VARIANTS,
} from "./loading-transition-fallback-allowlist";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  const violations: string[] = [];

  for (const pageRel of PAGE_TRANSITION_LOADER_ROUTES) {
    const text = read(pageRel);
    const variant = PAGE_TRANSITION_LOADER_VARIANTS[pageRel];

    if (!/<Suspense/.test(text)) {
      violations.push(`${pageRel}: manca <Suspense`);
      continue;
    }

    if (!new RegExp(`fallback=\\{<PageTransitionLoader\\s+variant="${variant}"\\s*/>\\}`).test(text)) {
      violations.push(`${pageRel}: atteso fallback={<PageTransitionLoader variant="${variant}" />}`);
    }

    if (PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES.includes(pageRel as (typeof PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES)[number])) {
      if (!/<PageLayout/.test(text)) {
        violations.push(`${pageRel}: PageLayout fuori Suspense richiesto per continuità header`);
      }
    }
  }

  assert.equal(violations.length, 0, violations.join("\n"));
  console.log("page-layout-suspense-policy.test.ts: OK");
}

main();
