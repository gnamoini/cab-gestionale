import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const offenders: string[] = [];

function scan(dir: string) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      scan(p);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(ent.name)) continue;
    if (p.includes("lib\\communications\\providers") || p.includes("lib/communications/providers")) continue;
    const text = readFileSync(p, "utf8");
    if (/\bfrom ["']resend["']/.test(text) || /\brequire\(["']resend["']\)/.test(text)) {
      offenders.push(p);
    }
  }
}

scan(root);

if (offenders.length) {
  console.error("Resend import outside providers:", offenders);
  process.exit(1);
}

console.log("communication-engine-audit.test.ts: ok");
