/**
 * Evita crash Turbopack HMR (NextSegmentConfig) da lock stale o seconda istanza dev.
 * Legge `.next/dev/lock` e fallisce con messaggio chiaro se un next dev è già attivo.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEV_DIR = path.join(ROOT, ".next", "dev");
const LOCK_PATH = path.join(DEV_DIR, "lock");

type DevLock = { pid?: number; port?: number };

function removeDevCacheAfterCrash(reason: string): void {
  if (!fs.existsSync(DEV_DIR)) return;
  fs.rmSync(DEV_DIR, { recursive: true, force: true });
  console.warn(`[dev] Removed .next/dev after crash (${reason}).`);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

if (!fs.existsSync(LOCK_PATH)) {
  process.exit(0);
}

let lock: DevLock = {};
try {
  lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) as DevLock;
} catch {
  removeDevCacheAfterCrash("unreadable-lock");
  process.exit(0);
}

const pid = lock.pid;
if (pid && pidAlive(pid)) {
  console.error(`[dev] Next.js dev server already running (PID ${pid}, port ${lock.port ?? "?"}).`);
  console.error(`[dev] Stop it first: taskkill /PID ${pid} /F`);
  console.error("[dev] Or use: npm run dev:webpack while editing proxy.ts / proxy-handler.ts");
  console.error("[dev] After Turbopack SST/crash errors: npm run clean:next && npm run dev");
  process.exit(1);
}

removeDevCacheAfterCrash(`stale-lock-pid-${pid ?? "?"}`);
