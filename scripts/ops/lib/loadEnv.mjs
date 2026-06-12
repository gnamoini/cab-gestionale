import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnvLocal(cwd = process.cwd()) {
  const p = join(cwd, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

export function mergedEnv(cwd = process.cwd()) {
  return { ...loadEnvLocal(cwd), ...process.env };
}
