/**
 * Static audit: full-page loading ownership — una sola surface skeleton per route.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED } from "./loading-ownership-exceptions";

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

function main(): void {
  const lazy = read("components/gestionale/lazy-route-views.tsx");
  assert.doesNotMatch(
    lazy,
    /loading:\s*\(\)\s*=>\s*<LoadingSuspenseFallback/,
    "lazy-route-views: dynamic loading fallback duplica loading.tsx",
  );

  const rbac = read("components/gestionale/rbac-page-guard.tsx");
  assert.doesNotMatch(
    rbac,
    /LoadingSuspenseFallback/,
    "rbac-page-guard: usare spinner minimale, non skeleton full-page",
  );
  assert.match(rbac, /LoadingSpinner/, "rbac-page-guard: spinner minimale atteso");

  const pages: string[] = [];
  walkPages(GESTIONALE_APP, pages);

  const violations: string[] = [];
  for (const pageRel of pages) {
    const text = read(pageRel);
    const hasSuspenseSkeleton = /Suspense[^>]*fallback=\{<LoadingSuspenseFallback/.test(text);
    if (!hasSuspenseSkeleton) continue;

    if (LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED.includes(pageRel)) continue;
    if (hasRouteLoading(pageRel)) {
      violations.push(`${pageRel}: Suspense skeleton duplica loading.tsx`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Loading ownership violations:\n${violations.join("\n")}`,
  );

  for (const allowed of LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED) {
    assert.ok(fs.existsSync(path.join(ROOT, allowed)), `eccezione inesistente: ${allowed}`);
  }

  console.log("loading-ownership-policy.test.ts: OK");
}

main();
