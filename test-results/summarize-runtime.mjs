import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("test-results/overflow-runtime-final.json", "utf8"));
const summary = {
  sessionCount: d.sessionCount,
  routes: d.sessions.map((s) => ({
    route: s.route,
    tier: s.session.shellTier,
    docOverflow: s.session.document.hasOverflow,
    docSw: s.session.document.scrollWidth,
    iw: s.session.innerWidth,
    culprits: s.session.audit.rootCulprits.length,
    mainClipCulprits: s.session.audit.rootCulprits.filter(
      (c) => c.mainClipPx > 0 || c.kind === "main-clip",
    ).length,
    viewportCulprits: s.session.audit.rootCulprits.filter(
      (c) => c.viewportOverflowPx > 0 || c.kind === "viewport",
    ).length,
    topCulprit: s.session.audit.rootCulprits[0] ?? null,
  })),
};
fs.writeFileSync("test-results/overflow-runtime-summary.json", JSON.stringify(summary, null, 2));
console.log("ok");
