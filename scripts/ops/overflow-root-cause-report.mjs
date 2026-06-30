#!/usr/bin/env node
/**
 * Build P0/P1/P2 overflow root-cause report from collect JSON.
 *
 * Usage: node scripts/ops/overflow-root-cause-report.mjs [inputJson]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IN_FILE = path.resolve(ROOT, process.argv[2] ?? "test-results/overflow-root-cause-audit.json");
const OUT_FILE = path.join(ROOT, "docs/investigation/overflow-root-cause-report.md");

const MOBILE_VIEWPORTS = new Set(["390", "724"]);

function readComponentIndex() {
  const index = new Map();
  const dirs = [
    path.join(ROOT, "components"),
    path.join(ROOT, "app"),
  ];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(ent.name)) continue;
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      const content = fs.readFileSync(full, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fnMatch = line.match(/export\s+(?:default\s+)?function\s+(\w+)/);
        const constMatch = line.match(/export\s+(?:default\s+)?(?:const|function)\s+(\w+)/);
        const name = fnMatch?.[1] ?? constMatch?.[1];
        if (name && !index.has(name)) {
          index.set(name, { file: rel, lineApprox: i + 1 });
        }
      }
    }
  }

  for (const d of dirs) walk(d);
  return index;
}

function resolveSource(culprit, componentIndex) {
  if (culprit.react?.file) {
    return {
      component: culprit.react.component ?? "unknown",
      file: culprit.react.file,
      lineApprox: culprit.react.lineApprox,
    };
  }
  const name = culprit.react?.component;
  if (name && componentIndex.has(name)) {
    const hit = componentIndex.get(name);
    return { component: name, file: hit.file, lineApprox: hit.lineApprox };
  }
  return {
    component: name ?? culprit.selector,
    file: "(unresolved)",
    lineApprox: null,
  };
}

function aggregateCulprits(sessions) {
  /** @type {Map<string, { component: string, file: string, lineApprox: number | null, maxOverflowPx: number, routeSet: Set<string>, viewportSet: Set<string>, kinds: Set<string>, samples: object[] }>} */
  const map = new Map();

  for (const session of sessions) {
    if (session.error || session.audit?.error) continue;
    const culprits = session.audit?.rootCulprits ?? [];
    for (const c of culprits) {
      const key = `${c.react?.component ?? c.selector}::${c.path.split(" > ").slice(-3).join(" > ")}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          component: c.react?.component ?? c.selector,
          file: c.react?.file ?? "(unresolved)",
          lineApprox: c.react?.lineApprox ?? null,
          maxOverflowPx: 0,
          routeSet: new Set(),
          viewportSet: new Set(),
          kinds: new Set(),
          samples: [],
        };
        map.set(key, entry);
      }
      entry.maxOverflowPx = Math.max(entry.maxOverflowPx, c.overflowPx ?? 0);
      entry.routeSet.add(session.route);
      entry.viewportSet.add(session.viewport);
      if (c.kind) entry.kinds.add(c.kind);
      if (entry.samples.length < 3) {
        entry.samples.push({
          route: session.route,
          viewport: session.viewport,
          overflowPx: c.overflowPx,
          kind: c.kind,
          explain: c.explain,
          css: c.css,
        });
      }
    }
  }

  return [...map.values()].map((e) => ({
    ...e,
    routeCount: e.routeSet.size,
    routes: [...e.routeSet].sort(),
    viewports: [...e.viewportSet].sort(),
    kinds: [...e.kinds],
  }));
}

function classifyPriority(entry) {
  const hasMobileMainClip = entry.samples.some(
    (s) => MOBILE_VIEWPORTS.has(s.viewport) && (s.kind === "main-clip" || s.kind === "viewport"),
  );

  if (entry.maxOverflowPx >= 40 || entry.routeCount >= 4 || hasMobileMainClip) {
    return "P0";
  }
  if (entry.maxOverflowPx >= 10 || entry.routeCount >= 2) {
    return "P1";
  }
  return "P2";
}

function formatEntry(entry, priority) {
  const line = entry.lineApprox ? ` (~${entry.lineApprox})` : "";
  const sample = entry.samples[0];
  const cssBits = sample?.css
    ? [
        sample.css.minWidth !== "0px" && sample.css.minWidth !== "auto" ? `min-width: ${sample.css.minWidth}` : null,
        sample.css.flexWrap === "nowrap" ? "flex-wrap: nowrap" : null,
        sample.css.whiteSpace === "nowrap" ? "white-space: nowrap" : null,
        sample.css.width?.endsWith("px") ? `width: ${sample.css.width}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return [
    `### ${priority} — ${entry.component}`,
    `- file: ${entry.file}${line}`,
    `- overflow max: ${entry.maxOverflowPx.toFixed(1)}px`,
    `- routes (${entry.routeCount}): ${entry.routes.join(", ")}`,
    `- viewports: ${entry.viewports.join(", ")}`,
    `- kinds: ${entry.kinds.join(", ") || "n/a"}`,
    cssBits ? `- CSS: ${cssBits}` : null,
    sample?.explain ? `- why: ${sample.explain}` : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Missing input: ${IN_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
  const componentIndex = readComponentIndex();
  const sessions = data.sessions ?? [];

  for (const session of sessions) {
    const culprits = session.audit?.rootCulprits;
    if (!culprits) continue;
    for (const c of culprits) {
      const src = resolveSource(c, componentIndex);
      c.react = { ...c.react, ...src };
    }
  }

  const aggregated = aggregateCulprits(sessions);
  aggregated.sort((a, b) => b.maxOverflowPx - a.maxOverflowPx);

  const p0 = aggregated.filter((e) => classifyPriority(e) === "P0");
  const p1 = aggregated.filter((e) => classifyPriority(e) === "P1");
  const p2 = aggregated.filter((e) => classifyPriority(e) === "P2");

  const loginNote = data.login?.loggedIn
    ? "Login admin: OK"
    : `Login admin: FAILED (${data.login?.reason ?? "unknown"}) — risultati potrebbero essere su /login`;

  const auditMissing = sessions.some((s) => s.audit?.error);
  const auditNote = auditMissing
    ? "\n\n> **Attenzione:** almeno una sessione non ha trovato `__cabOverflowAudit`. Avviare dev con `NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1`.\n"
    : "";

  const md = [
    "# Overflow Root Cause Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Source: \`${path.relative(ROOT, IN_FILE)}\``,
    "",
    `Collected: ${data.collectedAt ?? "unknown"}`,
    "",
    loginNote,
    auditNote,
    "",
    "## Summary",
    "",
    `- Sessions: ${sessions.length}`,
    `- Unique root culprits: ${aggregated.length}`,
    `- P0: ${p0.length} | P1: ${p1.length} | P2: ${p2.length}`,
    "",
    "## Limitations",
    "",
    "- React line numbers are approximate (fiber `_debugSource` or first export match).",
    "- Server Components may not resolve to a client component name.",
    "- Modals excluded from scan.",
    "- Intentional horizontal scroll scopes excluded from root culprits.",
    "",
    "## P0 — Critical",
    "",
    p0.length ? p0.map((e) => formatEntry(e, "P0")).join("\n") : "_None observed._",
    "",
    "## P1 — Significant",
    "",
    p1.length ? p1.map((e) => formatEntry(e, "P1")).join("\n") : "_None observed._",
    "",
    "## P2 — Minor",
    "",
    p2.length ? p2.map((e) => formatEntry(e, "P2")).join("\n") : "_None observed._",
    "",
    "## Per-session raw counts",
    "",
    "| viewport | route | raw hits | root culprits | doc overflow |",
    "|----------|-------|----------|---------------|--------------|",
    ...sessions.map((s) => {
      const a = s.audit ?? {};
      return `| ${s.viewport ?? "?"} | ${s.route ?? "?"} | ${a.rawHitCount ?? "-"} | ${a.rootCulprits?.length ?? "-"} | ${a.hasDocumentOverflow ? "yes" : "no"} |`;
    }),
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, md);
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`P0=${p0.length} P1=${p1.length} P2=${p2.length}`);
}

main();
