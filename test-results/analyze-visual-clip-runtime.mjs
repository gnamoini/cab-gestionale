#!/usr/bin/env node
/**
 * Aggregate visual-clip-runtime.json — parent clippers, bleed, fixed/absolute.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IN = path.join(ROOT, "test-results/visual-clip-runtime.json");
const OUT = path.join(ROOT, "test-results/visual-clip-summary.json");
const data = JSON.parse(fs.readFileSync(IN, "utf8"));

function horizDelta(hit) {
  const ld = hit.layoutDelta ?? {};
  const pd = hit.paintDelta ?? {};
  return Math.max(ld.left ?? 0, ld.right ?? 0, pd.left ?? 0, pd.right ?? 0);
}

function vertDelta(hit) {
  const ld = hit.layoutDelta ?? {};
  const pd = hit.paintDelta ?? {};
  return Math.max(ld.top ?? 0, ld.bottom ?? 0, pd.top ?? 0, pd.bottom ?? 0);
}

function parentKey(hit) {
  const sel = hit.parent?.selector ?? "?";
  const short = sel.split(".").slice(0, 3).join(".");
  return `${short}::${hit.clipKind ?? "?"}`;
}

function summarizeRoute(s) {
  const sess = s.session;
  const root = sess.rootClippers ?? [];
  const horiz = root.filter((h) => horizDelta(h) > 1);
  const vertOnly = root.filter((h) => horizDelta(h) <= 1 && vertDelta(h) > 1);
  const bleed = (sess.visualBleed ?? []).filter((b) => b.clipAncestor);
  const fixedOut = (sess.fixedAbsolute ?? []).filter(
    (f) => f.outsideViewport?.left || f.outsideViewport?.right,
  );

  return {
    route: s.route,
    innerWidth: sess.viewport?.innerWidth,
    shellTier: sess.viewport?.shellTier,
    frameWidth: sess.viewport?.frameWidth,
    rawClipHitCount: sess.rawClipHitCount ?? 0,
    rootClipperCount: root.length,
    horizRootClippers: horiz.map((h) => ({
      parent: h.parent?.selector?.slice(0, 120),
      component: h.parent?.react?.component,
      clipKind: h.clipKind,
      horizPx: horizDelta(h),
      paintPx: h.paintOverflowPx,
      layoutPx: h.layoutOverflowPx,
      promotedFrom: h.promotedFromChild?.slice(0, 80),
      css: h.parent?.css,
    })),
    topVertOnly: vertOnly[0]
      ? {
          parent: vertOnly[0].parent?.selector?.slice(0, 80),
          vertPx: vertDelta(vertOnly[0]),
        }
      : null,
    clippedBleedCount: bleed.length,
    topBleed: bleed.slice(0, 3).map((b) => ({
      selector: b.selector?.slice(0, 100),
      component: b.react?.component,
      decorPx: b.decorativeExtPx,
      clippedBy: b.clipAncestor?.selector?.slice(0, 80),
    })),
    fixedOutsideHoriz: fixedOut.slice(0, 5),
    shellChain: (sess.shellChain ?? []).map((n) => ({
      name: n.name,
      clipContext: n.clipContext,
      overflow: n.css?.overflow,
    })),
  };
}

const routeSummaries = data.sessions.map(summarizeRoute);

// Aggregate horizontal root clippers
const clipAgg = new Map();
for (const s of data.sessions) {
  for (const hit of s.session.rootClippers ?? []) {
    if (horizDelta(hit) <= 1) continue;
    const key = parentKey(hit);
    const e = clipAgg.get(key) ?? {
      parentSelector: hit.parent?.selector?.slice(0, 150),
      component: hit.parent?.react?.component,
      clipKind: hit.clipKind,
      css: hit.parent?.css,
      maxHorizPx: 0,
      maxPaintPx: 0,
      routes: new Set(),
      promotedFrom: new Set(),
    };
    e.maxHorizPx = Math.max(e.maxHorizPx, horizDelta(hit));
    e.maxPaintPx = Math.max(e.maxPaintPx, hit.paintOverflowPx ?? 0);
    e.routes.add(s.route);
    if (hit.promotedFromChild) e.promotedFrom.add(hit.promotedFromChild.slice(0, 80));
    clipAgg.set(key, e);
  }
}

const rankedClippers = [...clipAgg.values()]
  .map((e) => ({
    ...e,
    routes: [...e.routes].sort(),
    routeCount: e.routes.size,
    promotedFrom: [...e.promotedFrom].slice(0, 5),
  }))
  .sort((a, b) => b.routeCount - a.routeCount || b.maxHorizPx - a.maxHorizPx);

// Aggregate visual bleed clipped by ancestor
const bleedAgg = new Map();
for (const s of data.sessions) {
  for (const b of s.session.visualBleed ?? []) {
    if (!b.clipAncestor) continue;
    const key = `${b.clipAncestor?.selector?.split(".").slice(0, 3).join(".")}::${b.react?.component ?? b.selector?.slice(0, 40)}`;
    const e = bleedAgg.get(key) ?? {
      clippedBy: b.clipAncestor?.selector?.slice(0, 120),
      clipKind: b.clipAncestor?.clipKind,
      exampleSelector: b.selector?.slice(0, 100),
      component: b.react?.component,
      maxDecorPx: 0,
      routes: new Set(),
    };
    e.maxDecorPx = Math.max(e.maxDecorPx, b.decorativeExtPx ?? 0);
    e.routes.add(s.route);
    bleedAgg.set(key, e);
  }
}

const rankedBleed = [...bleedAgg.values()]
  .map((e) => ({ ...e, routes: [...e.routes].sort(), routeCount: e.routes.size }))
  .sort((a, b) => b.routeCount - a.routeCount || b.maxDecorPx - a.maxDecorPx);

// Shell clip layers present on all routes (structural, not triggered)
const shellPresent = {
  htmlOverflowHidden: 0,
  bodyOverflowHidden: 0,
  cabAppShellOverflowHidden: 0,
  mainOverflowXHidden: 0,
  gutterMirrorOverflowHidden: 0,
};

for (const s of data.sessions) {
  for (const node of s.session.shellChain ?? []) {
    if (node.name === "documentElement" && node.css?.overflow === "hidden") shellPresent.htmlOverflowHidden++;
    if (node.name === "body" && node.css?.overflow === "hidden") shellPresent.bodyOverflowHidden++;
    if (node.name === "cab-app-shell" && node.css?.overflow === "hidden") shellPresent.cabAppShellOverflowHidden++;
    if (node.name === "main" && node.css?.overflowX === "hidden") shellPresent.mainOverflowXHidden++;
    if (node.name === "gutter-mirror" && node.css?.overflow === "hidden")
      shellPresent.gutterMirrorOverflowHidden++;
  }
}

const payload = {
  analyzedAt: new Date().toISOString(),
  sessionCount: data.sessionCount,
  viewport: data.viewport,
  shellClipLayersPresent: shellPresent,
  globalHorizClippers: rankedClippers.filter((c) => c.routeCount >= 8),
  allHorizClippers: rankedClippers,
  globalClippedBleed: rankedBleed.filter((b) => b.routeCount >= 8),
  allClippedBleed: rankedBleed.slice(0, 20),
  routeSummaries,
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`Global horiz clippers (>=8 routes): ${payload.globalHorizClippers.length}`);
console.log(`All horiz clippers: ${payload.allHorizClippers.length}`);
console.log(`Global clipped bleed (>=8 routes): ${payload.globalClippedBleed.length}`);
