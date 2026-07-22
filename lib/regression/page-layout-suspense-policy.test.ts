/**
 * Route migrate: PageLayout + prefetch server-side, niente Suspense skeleton.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES } from "./loading-transition-fallback-allowlist";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  const violations: string[] = [];

  for (const pageRel of PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES) {
    const text = read(pageRel);

    if (!/<PageLayout/.test(text)) {
      violations.push(`${pageRel}: PageLayout richiesto`);
    }

    if (/PageTransitionLoader/.test(text)) {
      violations.push(`${pageRel}: PageTransitionLoader vietato`);
    }

    if (/Suspense[^>]*fallback=\{<PageTransitionLoader/.test(text)) {
      violations.push(`${pageRel}: Suspense skeleton fallback vietato`);
    }

    if (!/export default async function/.test(text) && !/async function \w+Page/.test(text)) {
      if (
        pageRel !== "app/(gestionale)/magazzino/carichi/page.tsx" &&
        pageRel !== "app/(gestionale)/sicurezza/production-readiness/page.tsx"
      ) {
        violations.push(`${pageRel}: page async con prefetch atteso`);
      }
    }
  }

  assert.equal(violations.length, 0, violations.join("\n"));
  console.log("page-layout-suspense-policy.test.ts: OK");
}

main();
