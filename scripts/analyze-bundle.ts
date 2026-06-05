/**
 * Bundle analyzer locale — non bloccante in CI.
 * Uso: npm run analyze
 */
import { spawnSync } from "node:child_process";

process.env.ANALYZE = "true";

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
