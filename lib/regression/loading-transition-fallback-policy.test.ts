/**
 * LEVEL 2 transition fallback — deny fallback=null su route lazy con loading.tsx.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED } from "./loading-ownership-exceptions";
import {
  ALLOW_NULL_SUSPENSE_ROUTES,
  FALLBACK_NULL_LEGACY_PENDING_ROUTES,
  PAGE_TRANSITION_LOADER_ROUTES,
  PAGE_TRANSITION_LOADER_VARIANTS,
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
  const loaderSrc = read("components/design-system/loading/page-transition-loader.tsx");
  assert.doesNotMatch(loaderSrc, /"use client"/, "PageTransitionLoader: no use client");
  assert.doesNotMatch(
    loaderSrc,
    /from\s+["']@\/components\/gestionale/,
    "PageTransitionLoader: no import gestionale",
  );
  assert.match(loaderSrc, /data-testid="page-transition-loader"/);
  assert.match(loaderSrc, /StructuralRouteSkeleton/, "PageTransitionLoader: structural skeleton, no spinner");
  assert.doesNotMatch(loaderSrc, /loadingSpinnerRingClass/, "PageTransitionLoader: no spinner ring");

  for (const pageRel of PAGE_TRANSITION_LOADER_ROUTES) {
    const text = read(pageRel);
    const variant = PAGE_TRANSITION_LOADER_VARIANTS[pageRel];
    assert.match(
      text,
      /PageTransitionLoader/,
      `${pageRel}: deve usare PageTransitionLoader`,
    );
    assert.match(
      text,
      new RegExp(`variant="${variant}"`),
      `${pageRel}: variant atteso "${variant}"`,
    );
    assert.doesNotMatch(
      text,
      /Suspense[^>]*fallback=\{null\}/,
      `${pageRel}: fallback=null vietato su rollout LEVEL 2`,
    );
    assert.doesNotMatch(
      text,
      /Suspense[^>]*fallback=\{<LoadingSuspenseFallback/,
      `${pageRel}: no LoadingSuspenseFallback in Suspense`,
    );
  }

  const exempt = new Set<string>([
    ...ALLOW_NULL_SUSPENSE_ROUTES,
    ...FALLBACK_NULL_LEGACY_PENDING_ROUTES,
    ...PAGE_TRANSITION_LOADER_ROUTES,
    ...LOADING_OWNERSHIP_SUSPENSE_FALLBACK_ALLOWED,
  ]);
  const pages: string[] = [];
  walkPages(GESTIONALE_APP, pages);
  const violations: string[] = [];

  for (const pageRel of pages) {
    if (exempt.has(pageRel)) continue;
    if (!hasRouteLoading(pageRel)) continue;

    const text = read(pageRel);
    if (!usesLazyView(text)) continue;
    if (!/Suspense/.test(text)) continue;

    if (/Suspense[^>]*fallback=\{null\}/.test(text)) {
      violations.push(
        `${pageRel}: fallback=null su route lazy+loading — usare PageTransitionLoader o aggiungere eccezione`,
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
