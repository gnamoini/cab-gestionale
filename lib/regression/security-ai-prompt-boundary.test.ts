import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { AI_PROMPT_BOUNDARY_GUARD } from "@/lib/ai/prompt-boundary-guard";

const ROOT = process.cwd();
const AI_DIR = path.join(ROOT, "lib", "ai");

let counted = 0;

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

for (const file of walkTsFiles(AI_DIR)) {
  const src = fs.readFileSync(file, "utf8");
  if (!/(?:export\s+const\s+[A-Z0-9_]*SYSTEM|const\s+[A-Z0-9_]*SYSTEM)/.test(src)) {
    continue;
  }
  counted += 1;
  assert.match(
    src,
    /AI_PROMPT_BOUNDARY_GUARD/,
    `${path.relative(ROOT, file)}: must include AI_PROMPT_BOUNDARY_GUARD`,
  );
}

assert.ok(counted >= 5, `expected multiple AI system prompt files, found ${counted}`);

assert.match(AI_PROMPT_BOUNDARY_GUARD, /system prompt/i);
assert.match(AI_PROMPT_BOUNDARY_GUARD, /injection/i);

console.log(`security-ai-prompt-boundary.test.ts OK (${counted} files)`);
