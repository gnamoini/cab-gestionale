/**
 * UI Reliability Layer — policy token + anti-pattern static scan.
 *
 * Complementa flex-containment-policy.test.ts con regole table/modal/mobile/SSR.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (/\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

const globalsCoreCss = read("app/globals-core.css");
const globalsShellCss = read("app/globals-gestionale-shell.css");
const globalTable = read("lib/ui/global-table.ts");
const designSystem = read("lib/ui/design-system.ts");
const modalBody = read("lib/ui/modal-max-width-class.ts");
const pageLayout = read("components/design-system/page-layout.tsx");

// --- Global CSS utilities (split contract) ---
assert.match(globalsShellCss, /html:has\(\.cab-app-shell\)/);
assert.match(globalsShellCss, /html:has\(\.cab-app-shell\)[\s\S]*width:\s*100%/);
assert.doesNotMatch(globalsShellCss, /--cab-host-layout-width/);
assert.match(globalsShellCss, /body:has\(\.cab-app-shell\)[\s\S]*overflow:\s*hidden/);
assert.match(globalsShellCss, /\.gestionale-scroll-y[\s\S]*scrollbar-gutter:\s*stable/);
assert.match(
  globalsShellCss,
  /data-gestionale-shell-tier="desktop"[\s\S]*\.gestionale-scroll-y[\s\S]*scrollbar-gutter:\s*stable/,
);
assert.match(
  globalsCoreCss,
  /main\.gestionale-scroll-y\[data-cab-main-scroll-lock\][\s\S]*scrollbar-gutter:\s*stable/,
);
assert.match(globalsCoreCss, /data-cab-scroll-lock-fixed-compensate/);
assert.match(globalsCoreCss, /--cab-scroll-lock-gap/);
assert.match(
  globalsShellCss,
  /data-mobile-nav-visible[\s\S]*\.cab-page-title-box[\s\S]*position:\s*absolute[\s\S]*left:\s*0[\s\S]*right:\s*0/,
);
assert.doesNotMatch(
  globalsShellCss,
  /data-mobile-nav-visible[\s\S]*\.cab-page-header-top-row[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/,
);

assert.match(globalsCoreCss, /\.flex-safe\s*\{/);
assert.match(globalsCoreCss, /\.flex-fill,\s*\n?\s*\.flex-fill-safe\s*\{/);
assert.match(globalsCoreCss, /\.text-safe\s*\{/);

assert.match(globalsCoreCss, /\.flex-fill-safe\s*\{/);

// --- Scoped min-width containment (NO global flex-wrap) ---
assert.match(globalsShellCss, /gestionale-responsive-core \.flex > \*/);
assert.doesNotMatch(globalsShellCss, /gestionale-responsive-core[\s\S]*flex-wrap:\s*wrap/);

// --- Table layer ---
assert.match(globalTable, /globalTableWrap[\s\S]*min-w-0[\s\S]*overflow-x-auto/);
assert.match(globalTable, /globalTableTdBody[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableTheadClass[\s\S]*min-w-0/);

// --- Modal layer ---
assert.match(designSystem, /dsModalPanel[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(designSystem, /dsLavorazioniModalDialog[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(modalBody, /gestionaleModalBodyFlexClass[\s\S]*min-w-0[\s\S]*flex-col/);

// --- Page layout deterministic (CSS tokens, no window sync) ---
assert.match(pageLayout, /layoutPageRoot/);
assert.match(pageLayout, /dsStackPage/);
assert.doesNotMatch(pageLayout, /useLayoutEffect|window\.innerWidth|matchMedia/);

// --- SSR/hydration: app-shell layout tokens CSS-only (no width sync in render) ---
const appShell = read("components/gestionale/app-shell.tsx");
const appShellMain = read("components/gestionale/app-shell-main.tsx");
const appShellSidebarSrc = read("components/gestionale/app-shell-sidebar.tsx");
const accountMenu = read("components/gestionale/account-menu.tsx");
const profileSheetContext = read("components/profile/profile-sheet-context.tsx");
assert.match(appShellMain, /layoutResponsiveCoreScope/);
assert.match(appShellMain, /gestionale-scroll-y/);
assert.match(appShellMain, /dsGestionaleContentRail/);
assert.match(appShellMain, /dsGestionaleContentMax/);
assert.match(appShellMain, /gestionaleShellContentGutterClass/);
assert.doesNotMatch(appShellMain, /cab-gestionale-scroll-gutter-mirror/);
assert.match(appShellMain, /gestionale-scroll-y gestionale-scrollbar w-full/);
assert.match(
  appShellMain,
  /dsGestionaleContentMax[\s\S]*layoutPageRoot[\s\S]*contentGutter/,
  "main scroll inner wrapper must carry content width + gutter",
);
assert.match(appShellMain, /dsGestionaleScrollEndPadFade/);
assert.match(appShellMain, /suppressGlobalScrollEndPad/);
assert.match(appShell, /useGestionaleScrollEnd/);
assert.match(appShellSidebarSrc, /SidebarSessionPanel/);
assert.match(appShell, /ProfileSheetProvider/);
assert.match(profileSheetContext, /ProfileSheetLazy/);
assert.match(profileSheetContext, /dynamic\s*\(/);
assert.doesNotMatch(profileSheetContext, /open,\s*openProfileSheet/);
assert.match(accountMenu, /toggleProfileSheet/);
assert.doesNotMatch(accountMenu, /<ProfileSheet/);
assert.match(accountMenu, /aria-haspopup="dialog"/);
assert.doesNotMatch(accountMenu, /useGlobalDropdownPortal/);
assert.doesNotMatch(
  designSystem,
  /dsGestionaleContentRail = `[^`]*\bmx-auto/,
  "content rail must not center or cap width (full column scroll)",
);
assert.doesNotMatch(
  designSystem,
  /dsGestionaleContentRail = `[^`]*\bmax-w-/,
  "content rail must not cap max-width",
);
assert.doesNotMatch(
  designSystem,
  /dsGestionaleContentRail = `[^`]*\bpx-/,
  "content rail must not include horizontal padding (scrollbar flush to column edge)",
);
assert.doesNotMatch(
  designSystem,
  /dsGestionaleContentMax = `[^`]*\bmx-auto/,
  "content max token must not center with side bands on desktop",
);

assert.match(designSystem, /dsToastViewport[\s\S]*max-md:top-0/);
assert.match(designSystem, /dsToastViewport[\s\S]*md:bottom-0/);
assert.match(designSystem, /dsToastItem[\s\S]*backdrop-blur-md/);
assert.match(globalsCoreCss, /cab-toast-in-top/);
assert.match(globalsCoreCss, /\.cab-toast-viewport \.cab-toast-item/);
assert.match(globalsCoreCss, /cab-toast-item--dragging/);

const toastContext = read("context/toast-context.tsx");
assert.match(toastContext, /useToastSwipeDismiss/);
assert.match(toastContext, /useToastSwipeEnabled/);

// --- Flex anti-pattern: files with flex-1 must have containment in same line ---
const flex1Violations: string[] = [];
const FLEX1_ALLOWLIST = [
  { file: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx", pattern: /lg:flex-1/ },
];

for (const file of walkTsx(path.join(ROOT, "components"))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bflex-1\b/.test(line) || !/className=/.test(line)) continue;
    if (FLEX1_ALLOWLIST.some((a) => rel === a.file && a.pattern.test(line))) continue;
    const m = line.match(/className=(?:"([^"]*)"|`([^`]*)`|\{[`"']([^`"']*)[`"']\})/);
    const cls = m?.[1] ?? m?.[2] ?? m?.[3] ?? "";
    if (/\bflex-1\b/.test(cls) && !/\bmin-w-0\b|\bflex-fill\b|\bflex-fill-safe\b/.test(cls)) {
      flex1Violations.push(`${rel}:${i + 1}`);
    }
  }
}

assert.equal(flex1Violations.length, 0, `flex-1 without containment: ${flex1Violations.join(", ")}`);

console.log("ui-reliability-policy.test.ts OK");
