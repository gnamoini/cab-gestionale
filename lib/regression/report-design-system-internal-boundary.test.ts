import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRIMITIVES = path.join(ROOT, "components/report/design-system/primitives");

function readAllTs(dir: string): { rel: string; content: string }[] {
  const out: { rel: string; content: string }[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...readAllTs(full));
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) {
      out.push({ rel: path.relative(ROOT, full).replace(/\\/g, "/"), content: fs.readFileSync(full, "utf8") });
    }
  }
  return out;
}

for (const { rel, content } of readAllTs(PRIMITIVES)) {
  assert.doesNotMatch(content, /design-system\/tokens\//, `${rel}: primitives non importano tokens`);
}

const internalFiles = fs.readdirSync(path.join(ROOT, "components/report/design-system/internal"));
assert.ok(internalFiles.length >= 3);

console.log("report-design-system-internal-boundary.test.ts OK");
