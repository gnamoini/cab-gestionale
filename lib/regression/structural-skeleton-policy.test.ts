/**
 * Policy: structural skeleton — header reale, no Context RSC, SkeletonBoundary minimal.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MIGRATED_STRUCTURAL_ROUTES } from "@/lib/ui/migrated-structural-routes";
import { PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES } from "./loading-transition-fallback-allowlist";

const ROOT = process.cwd();

const ROUTE_LOADING: Record<string, string> = {
  magazzino: "app/(gestionale)/magazzino/loading.tsx",
  mezzi: "app/(gestionale)/mezzi/loading.tsx",
  documenti: "app/(gestionale)/documenti/loading.tsx",
  preventivi: "app/(gestionale)/preventivi/loading.tsx",
  dashboard: "app/(gestionale)/dashboard/loading.tsx",
  lavorazioni: "app/(gestionale)/lavorazioni/loading.tsx",
  report: "app/(gestionale)/report/loading.tsx",
  agenda: "app/(gestionale)/agenda/loading.tsx",
  dipendenti: "app/(gestionale)/dipendenti/loading.tsx",
  fatturazione: "app/(gestionale)/fatturazione/loading.tsx",
  impostazioni: "app/(gestionale)/impostazioni/loading.tsx",
  sicurezza: "app/(gestionale)/sicurezza/loading.tsx",
  "production-readiness": "app/(gestionale)/sicurezza/production-readiness/loading.tsx",
  clienti: "app/(gestionale)/lavorazioni-clienti/loading.tsx",
  "client-detail": "app/(gestionale)/lavorazioni-clienti/[id]/loading.tsx",
  login: "app/login/loading.tsx",
};

/** loading.tsx extra fuori MIGRATED_STRUCTURAL_ROUTES ma LEVEL 2 body-only. */
const EXTRA_BODY_ONLY_LOADING = [
  "app/(gestionale)/magazzino/carichi/loading.tsx",
  "app/(gestionale)/lavorazioni-clienti/[id]/loading.tsx",
];

const LOADING_BODY_ONLY = new Set(
  PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES.map((pageRel) => pageRel.replace(/page\.tsx$/, "loading.tsx")),
);

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const loadingDir = read("components/design-system/loading/index.ts");
assert.doesNotMatch(
  loadingDir,
  /SkeletonProvider|createContext/,
  "loading/: vietato SkeletonProvider/Context RSC",
);

const boundary = read("components/design-system/loading/skeleton-boundary.tsx");
assert.doesNotMatch(boundary, /useLoadingClaim|LoadingManager/, "skeleton-boundary deve restare minimal");

for (const route of MIGRATED_STRUCTURAL_ROUTES) {
  const loadingPath = ROUTE_LOADING[route];
  assert.ok(loadingPath, `loading path mancante: ${route}`);
  const src = read(loadingPath);
  if (route === "login") {
    assert.match(src, /LoginPageStructure/, `${loadingPath}: LoginPageStructure richiesto`);
    continue;
  }

  if (LOADING_BODY_ONLY.has(loadingPath) || EXTRA_BODY_ONLY_LOADING.includes(loadingPath)) {
    assert.doesNotMatch(
      src,
      /<PageLayout/,
      `${loadingPath}: PageLayout solo in page.tsx LEVEL 2 (evita doppio header)`,
    );
    assert.match(
      src,
      /mode="skeleton"/,
      `${loadingPath}: structural body skeleton richiesto`,
    );
  } else {
    assert.match(src, /PageLayout/, `${loadingPath}: PageLayout con titolo reale richiesto`);
  }

  assert.doesNotMatch(
    src,
    /LoadingSuspenseFallback|SkeletonBlock.*pageHeader|SKELETON_MIN_HEIGHT\.pageHeader/,
    `${loadingPath}: niente skeleton header pulse`,
  );
}

for (const loadingPath of EXTRA_BODY_ONLY_LOADING) {
  if (LOADING_BODY_ONLY.has(loadingPath)) continue;
  const src = read(loadingPath);
  assert.doesNotMatch(
    src,
    /<PageLayout/,
    `${loadingPath}: PageLayout solo in page.tsx LEVEL 2 (evita doppio header)`,
  );
  assert.match(src, /mode="skeleton"/, `${loadingPath}: structural body skeleton richiesto`);
}

console.log("structural-skeleton-policy.test: OK");
