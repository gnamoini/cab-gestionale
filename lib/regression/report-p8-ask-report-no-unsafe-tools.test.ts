import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const ASK = join(ROOT, "components/report/ask-report");
const LIB = join(ROOT, "lib/report/ask-report");

const FORBIDDEN = ['from("', "supabase", "SELECT ", "INSERT ", "UPDATE ", "DELETE "];

for (const rel of [
  "report-ask-provider.tsx",
  "report-ask-panel.tsx",
  "report-ask-input.tsx",
]) {
  const src = readFileSync(join(ASK, rel), "utf8");
  for (const sym of FORBIDDEN) {
    if (src.includes(sym)) throw new Error(`${rel} must not contain ${sym}`);
  }
}

const registry = readFileSync(join(LIB, "tools/ask-report-tool-registry.ts"), "utf8");
if (!registry.includes("FORBIDDEN_ARG_KEYS")) throw new Error("tool registry must block forbidden args");

console.log("report-p8-ask-report-no-unsafe-tools.test.ts OK");
