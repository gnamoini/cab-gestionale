import fs from "node:fs";
import path from "node:path";

function walk(d: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (f.endsWith(".tsx")) out.push(f);
  }
  return out;
}

let n = 0;
for (const f of walk("components")) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("@/components/ui")) continue;
  const orig = s;
  s = s.replace(/\nimport \{ Tooltip \} from ["']@\/components\/design-system\/tooltip["'];/g, "");
  if (s !== orig) {
    fs.writeFileSync(f, s);
    n++;
  }
}
console.log(`deduped ${n}`);
