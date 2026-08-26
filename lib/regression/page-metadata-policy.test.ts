import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_NAME, PWA_SHORT_NAME } from "@/lib/pwa/pwa-config";
import {
  assertReportHubMetadataCoverage,
  GESTIONALE_ROUTE_TITLES,
  PAGE_METADATA_COVERAGE_EXEMPT,
  type AppPageRoutePath,
} from "@/lib/site/app-page-metadata";
import { siteMetadata } from "@/lib/site/site-metadata";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");

const DYNAMIC_METADATA_PAGE_SUFFIXES = [
  `${path.sep}lavorazioni-clienti${path.sep}[id]${path.sep}page.tsx`,
  `${path.sep}documenti${path.sep}[token]${path.sep}page.tsx`,
  `${path.sep}documenti${path.sep}preventivo${path.sep}[id]${path.sep}preview${path.sep}page.tsx`,
  `${path.sep}documenti${path.sep}ddt${path.sep}[id]${path.sep}preview${path.sep}page.tsx`,
] as const;

const BANNED_TITLE_SEPARATORS = ["|", "—", " - ", "–"] as const;
const BANNED_TITLE_VALUES = new Set(["page", "undefined", "null", "app"]);

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      walkPageFiles(abs, acc);
      continue;
    }
    if (entry.isFile() && entry.name === "page.tsx") acc.push(abs);
  }
  return acc;
}

function toPosixRel(absPath: string): string {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

function pageFileToRoutePath(relPageFile: string): string | null {
  if (!relPageFile.startsWith("app/") || !relPageFile.endsWith("/page.tsx")) return null;
  const segments = relPageFile.slice("app/".length, -"/page.tsx".length).split("/");
  const urlSegments: string[] = [];
  for (const segment of segments) {
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (segment.startsWith("[") && segment.endsWith("]")) return null;
    urlSegments.push(segment);
  }
  return `/${urlSegments.join("/")}`;
}

function isDynamicMetadataPage(relPageFile: string): boolean {
  const normalized = relPageFile.split("/").join(path.sep);
  return DYNAMIC_METADATA_PAGE_SUFFIXES.some((suffix) => normalized.endsWith(suffix.split("/").join(path.sep)));
}

function fileHasResolvableMetadata(relFile: string): boolean {
  const source = read(relFile);
  if (/export\s+(async\s+)?function\s+generateMetadata\b/.test(source)) return true;
  if (/export\s+const\s+metadata\b/.test(source)) return true;
  if (/export\s*\{[^}]*\bas\s+metadata\b[^}]*\}\s*from\s+["']@\/lib\/site\/app-page-metadata["']/.test(source)) {
    return true;
  }
  return false;
}

function pageOrLayoutHasResolvableMetadata(relPageFile: string): boolean {
  if (fileHasResolvableMetadata(relPageFile)) return true;
  const layoutFile = relPageFile.replace(/\/page\.tsx$/, "/layout.tsx");
  if (fs.existsSync(path.join(ROOT, layoutFile))) {
    return fileHasResolvableMetadata(layoutFile);
  }
  return false;
}

const pageFiles = walkPageFiles(APP_DIR).map(toPosixRel).sort();
const exemptSet = new Set<string>(PAGE_METADATA_COVERAGE_EXEMPT);

for (const rel of pageFiles) {
  if (exemptSet.has(rel)) continue;
  if (isDynamicMetadataPage(rel)) {
    assert.ok(pageOrLayoutHasResolvableMetadata(rel), `route dinamica senza metadata: ${rel}`);
    continue;
  }
  assert.ok(pageOrLayoutHasResolvableMetadata(rel), `page senza metadata: ${rel}`);
}

const staticRoutesFromFilesystem = pageFiles
  .filter((rel) => !exemptSet.has(rel) && !isDynamicMetadataPage(rel))
  .map(pageFileToRoutePath)
  .filter((route): route is string => route != null)
  .sort();

const registryPaths = Object.keys(GESTIONALE_ROUTE_TITLES).sort();

for (const route of staticRoutesFromFilesystem) {
  assert.ok(
    route in GESTIONALE_ROUTE_TITLES,
    `registry GESTIONALE_ROUTE_TITLES manca route statica: ${route}`,
  );
}

for (const route of registryPaths) {
  const config = GESTIONALE_ROUTE_TITLES[route as AppPageRoutePath];
  const title = config.title.trim();
  assert.ok(title.length > 0, `titolo vuoto per ${route}`);
  assert.ok(!title.includes(CAB_APP_PRODUCT_NAME), `brand nel titolo registry: ${route}`);
  for (const sep of BANNED_TITLE_SEPARATORS) {
    assert.ok(!title.includes(sep), `separatore vietato "${sep}" in ${route}: ${title}`);
  }
  assert.ok(!BANNED_TITLE_VALUES.has(title.toLowerCase()), `titolo vietato per ${route}: ${title}`);
}

assertReportHubMetadataCoverage();

assert.equal(PWA_NAME, CAB_APP_PRODUCT_NAME);
assert.equal(PWA_SHORT_NAME, "C.A.B.");

const titleConfig = siteMetadata.title;
assert.ok(titleConfig && typeof titleConfig === "object" && !Array.isArray(titleConfig));
const titleObject = titleConfig as { default?: string; template?: string };
assert.equal(titleObject.default, CAB_APP_PRODUCT_NAME);
assert.ok(
  typeof titleObject.template === "string" && titleObject.template.includes(CAB_APP_PRODUCT_NAME),
  "siteMetadata.title.template deve includere il brand",
);
assert.ok(
  typeof titleObject.template === "string" && titleObject.template.includes("·"),
  "siteMetadata.title.template deve usare il separatore ·",
);

console.log("page-metadata-policy: ok");
