/**
 * Route migrate — deny PageTransitionLoader e Suspense skeleton se esiste loading.tsx.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED } from "./loading-ownership-exceptions";
import {
  ALLOW_NULL_SUSPENSE_ROUTES,
  FALLBACK_NULL_LEGACY_PENDING_ROUTES,
  MIGRATED_LOADING_OWNER_ROUTES,
} from "./loading-transition-fallback-allowlist";

const ROOT = process.cwd();
const GESTIONALE_APP = path.join(ROOT, "app/(gestionale)");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function posix(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function walkPages(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPages(abs, out);
    else if (ent.name === "page.tsx") out.push(posix(path.relative(ROOT, abs)));
  }
}

function hasRouteLoading(pageRel: string): boolean {
  const dir = path.dirname(pageRel);
  return fs.existsSync(path.join(ROOT, dir, "loading.tsx"));
}

function usesLazyView(text: string): boolean {
  return /lazy-route-views|ViewLazy/.test(text);
}

function main(): void {
  const violations: string[] = [];

  for (const pageRel of MIGRATED_LOADING_OWNER_ROUTES) {
    const text = read(pageRel);
    if (/PageTransitionLoader/.test(text)) {
      violations.push(`${pageRel}: PageTransitionLoader vietato — loading.tsx è l'unico owner`);
    }
    if (/Suspense[^>]*fallback=\{<PageTransitionLoader/.test(text)) {
      violations.push(`${pageRel}: Suspense+PageTransitionLoader vietato`);
    }
    if (/Suspense[^>]*fallback=\{<LoadingSuspenseFallback/.test(text)) {
      violations.push(`${pageRel}: LoadingSuspenseFallback in Suspense vietato con loading.tsx`);
    }
    if (!/prefetchGestionalePage|prefetch\w+Page|fetchClientPortalDetailDTOServer/.test(text)) {
      if (
        pageRel !== "app/(gestionale)/magazzino/carichi/page.tsx" &&
        pageRel !== "app/(gestionale)/magazzino/carichi/nuovo/page.tsx" &&
        pageRel !== "app/(gestionale)/sicurezza/production-readiness/page.tsx"
      ) {
        violations.push(`${pageRel}: atteso prefetch server-side o fetch critico nel page async`);
      }
    }
  }

  const exempt = new Set<string>([
    ...ALLOW_NULL_SUSPENSE_ROUTES,
    ...FALLBACK_NULL_LEGACY_PENDING_ROUTES,
    ...MIGRATED_LOADING_OWNER_ROUTES,
    ...LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED,
  ]);
  const pages: string[] = [];
  walkPages(GESTIONALE_APP, pages);

  for (const pageRel of pages) {
    if (exempt.has(pageRel)) continue;
    if (!hasRouteLoading(pageRel)) continue;

    const text = read(pageRel);
    if (!usesLazyView(text)) continue;
    if (!/Suspense/.test(text)) continue;

    if (/Suspense[^>]*fallback=\{null\}/.test(text)) {
      violations.push(
        `${pageRel}: fallback=null su route lazy+loading — aggiungere eccezione o rimuovere Suspense`,
      );
    }
  }

  assert.equal(
    violations.length,
    0,
    `loading-transition-fallback violations:\n${violations.join("\n")}`,
  );

  console.log("loading-transition-fallback-policy.test.ts: OK");
}

main();
