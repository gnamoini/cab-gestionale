import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IN = path.join(ROOT, "test-results/overflow-runtime-final.json");
const data = JSON.parse(fs.readFileSync(IN, "utf8"));

function summarizeSession(s) {
  const sess = s.session;
  const audit = sess.audit ?? {};
  const top = audit.rootCulprits?.[0] ?? null;
  const ext = sess.extendedRootCulprit ?? null;
  return {
    route: s.route,
    shellTier: sess.shellTier,
    docOverflow: sess.document?.hasOverflow,
    docScroll: sess.document?.scrollWidth,
    bodyScroll: sess.body?.scrollWidth,
    innerWidth: sess.innerWidth,
    auditCulprits: audit.rootCulprits?.length ?? 0,
    topAudit: top
      ? {
          selector: top.selector,
          kind: top.kind,
          overflowPx: top.overflowPx,
          mainClipPx: top.mainClipPx,
          component: top.react?.component,
          file: top.react?.file,
          css: top.css,
          explain: top.explain,
        }
      : null,
    extended: ext
      ? {
          selector: ext.selector,
          overflowPx: Math.max(ext.viewportOverflowPx, ext.mainClipPx),
          viewportOverflowPx: ext.viewportOverflowPx,
          mainClipPx: ext.mainClipPx,
          component: ext.react?.component,
          file: ext.react?.file,
          css: ext.css,
          className: ext.className?.slice(0, 120),
        }
      : null,
    chainOverflow: (sess.chain ?? []).filter((c) => c.overflowPx > 0 || c.mainClipPx > 0),
    headerMirror: sess.headerMirrorProbe,
    portalHits: (sess.portalsAndFixed ?? []).filter((p) => p.overflowPx > 0),
  };
}

const summaries = data.sessions.map(summarizeSession);

// Aggregate culprits by file+selector pattern
const agg = new Map();
for (const s of data.sessions) {
  const culprits = s.session.audit?.rootCulprits ?? [];
  for (const c of culprits) {
    const key = `${c.react?.file ?? "?"}::${c.react?.component ?? c.selector}::${c.css?.minWidth ?? ""}::${c.kind}`;
    const e = agg.get(key) ?? {
      file: c.react?.file,
      component: c.react?.component,
      selector: c.selector,
      kind: c.kind,
      css: c.css,
      maxOverflowPx: 0,
      routes: new Set(),
    };
    e.maxOverflowPx = Math.max(e.maxOverflowPx, c.overflowPx ?? 0);
    e.routes.add(s.route);
    agg.set(key, e);
  }
}

const ranked = [...agg.values()]
  .map((e) => ({ ...e, routes: [...e.routes].sort(), routeCount: e.routes.size }))
  .sort((a, b) => b.routeCount - a.routeCount || b.maxOverflowPx - a.maxOverflowPx);

console.log(JSON.stringify({ summaries, ranked: ranked.slice(0, 30) }, null, 2));
