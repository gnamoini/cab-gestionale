/**
 * Policy: content reveal transitions — token CSS, gate anti-annidamento, no refetch re-animate contract.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CONTENT_REVEAL_BROWSER_MATRIX,
  CONTENT_REVEAL_PAGE_ROUTES,
  SKELETON_BOUNDARY_PAGE_ROUTES,
  SKELETON_BOUNDARY_VIEW_FILES,
} from "./content-reveal-allowlist";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  const globals = read("app/globals-core.css");

  // 1. Token CSS
  assert.match(globals, /--transition-content-duration:\s*150ms/, "missing --transition-content-duration");
  assert.match(globals, /--transition-content-easing:\s*ease-out/, "missing --transition-content-easing");

  // 2. Solo opacity — no transition:all, blur, will-change globale
  const revealBlock = globals.slice(
    globals.indexOf(".cab-content-reveal"),
    globals.indexOf("@keyframes cab-spinner-spin"),
  );
  assert.doesNotMatch(revealBlock, /transition:\s*all/, "cab-content-reveal must not use transition: all");
  assert.doesNotMatch(revealBlock, /will-change/, "cab-content-reveal must not set will-change");
  assert.doesNotMatch(revealBlock, /blur|backdrop-filter/, "cab-content-reveal must not use blur");
  assert.match(revealBlock, /opacity/, "cab-content-reveal must animate opacity");

  // 3. prefers-reduced-motion
  assert.match(
    globals,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.cab-content-reveal[\s\S]*?opacity:\s*1/,
    "reduced motion must force opacity 1 on .cab-content-reveal",
  );

  // 4. Fallback keyframes
  assert.match(globals, /@keyframes\s+cab-content-reveal-in/, "missing fallback keyframes");

  // 5. SkeletonBoundary wraps ContentReveal
  const skeletonBoundary = read("components/design-system/loading/skeleton-boundary.tsx");
  assert.match(
    skeletonBoundary,
    /ContentReveal[\s\S]*data-testid="content-reveal"/,
    "SkeletonBoundary must wrap ContentReveal when not loading",
  );
  assert.match(
    skeletonBoundary,
    /if\s*\(!loading\)[\s\S]*ContentReveal/,
    "ContentReveal only when loading=false",
  );

  // 6. PageContent no reveal by default
  const pageContent = read("components/design-system/layout/page-content.tsx");
  assert.match(pageContent, /contentReveal\s*=\s*false/, "PageContent contentReveal default false");
  assert.match(pageContent, /contentRevealClass/, "PageContent uses contentRevealClass when enabled");

  // 7. PageSection contentReveal default false
  const pageSection = read("components/design-system/layout/page-section.tsx");
  assert.match(pageSection, /contentReveal\s*=\s*false/, "PageSection contentReveal default false");

  // 8. No reveal on route loading.tsx
  const loadingFiles = fs
    .readdirSync(path.join(ROOT, "app"), { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith("loading.tsx"));
  for (const rel of loadingFiles.map((f) => `app/${f.replace(/\\/g, "/")}`)) {
    const text = read(rel);
    assert.doesNotMatch(
      text,
      /cab-content-reveal|ContentReveal/,
      `${rel}: L1 loading must not use content reveal`,
    );
  }

  // 9. Barrel export
  const barrel = read("components/design-system/loading/index.ts");
  assert.match(barrel, /contentRevealClass/, "barrel must export contentRevealClass");
  assert.match(barrel, /ContentReveal/, "barrel must export ContentReveal");

  // 10. No nested reveal: SkeletonBoundary pages must not enable PageLayout contentReveal
  for (const rel of SKELETON_BOUNDARY_PAGE_ROUTES) {
    const text = read(rel);
    assert.doesNotMatch(
      text,
      /contentReveal(?:\s*=|\s*\})/,
      `${rel}: must not use PageLayout contentReveal (SkeletonBoundary owns L3)`,
    );
  }
  for (const rel of CONTENT_REVEAL_PAGE_ROUTES) {
    const text = read(rel);
    assert.match(text, /contentReveal/, `${rel}: must enable contentReveal on PageLayout`);
  }

  // PageSection under SkeletonBoundary views — no contentReveal prop passed to PageSection
  for (const rel of SKELETON_BOUNDARY_VIEW_FILES) {
    const text = read(rel);
    assert.doesNotMatch(
      text,
      /PageSection[\s\S]{0,120}contentReveal\s*=\s*\{?\s*true/,
      `${rel}: PageSection must not set contentReveal under SkeletonBoundary`,
    );
  }

  // 11. ContentReveal is a neutral wrapper div
  const contentReveal = read("components/design-system/loading/content-reveal.tsx");
  assert.doesNotMatch(contentReveal, /"use client"/, "ContentReveal should be server-renderable");
  assert.match(contentReveal, /<div className=\{merged\}/, "ContentReveal uses single div wrapper");
  assert.doesNotMatch(contentReveal, /pointer-events-none/, "ContentReveal must not block interaction");

  // 12. Interactivity during reveal (no pointer-events-none on wrapper)
  assert.doesNotMatch(revealBlock, /pointer-events:\s*none/, "reveal CSS must not disable pointer events");

  // 13. Allowlist mutual exclusion documented
  for (const page of SKELETON_BOUNDARY_PAGE_ROUTES) {
    assert.ok(
      !CONTENT_REVEAL_PAGE_ROUTES.includes(page as (typeof CONTENT_REVEAL_PAGE_ROUTES)[number]),
      `route in both allowlists: ${page}`,
    );
  }

  // 14. Browser matrix documented
  assert.ok(CONTENT_REVEAL_BROWSER_MATRIX.length >= 3, "browser matrix must list Chrome, iOS, Android");
  const policyDoc = read("docs/performance/loading-policy.md");
  assert.match(policyDoc, /Content reveal|content reveal/i, "loading-policy must document content reveal");
  assert.match(policyDoc, /anti-annidamento|annidat/i, "loading-policy must document nesting rule");

  // E2E smoke spec exists
  assert.ok(
    fs.existsSync(path.join(ROOT, "e2e/smoke/content-reveal.spec.ts")),
    "missing e2e/smoke/content-reveal.spec.ts",
  );

  console.log("content-reveal-policy.test.ts: OK");
}

main();
