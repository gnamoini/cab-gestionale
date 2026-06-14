/**
 * Evita crash Turbopack HMR (NextSegmentConfig) da lock stale o seconda istanza dev.
 * Legge `.next/dev/lock` e fallisce con messaggio chiaro se un next dev è già attivo.
 * Se il dev in ascolto risponde 404 su /login (manifest corrotto), termina e pulisce .next/dev.
 */
import { execSync } from "node:child_process";
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

const DEFAULT_DEV_PORT = 3000;

/** GET /login — 404 indica manifest route corrotto (redirect loop → pagina 404 standalone). */
function fetchLoginRouteStatus(port: number): number | null {
  try {
    const out = execSync(`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:${port}/login`, {
      encoding: "utf8",
      timeout: 8000,
    });
    const status = Number(String(out).trim());
    return Number.isFinite(status) ? status : null;
  } catch {
    return null;
  }
}

function killDevPid(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  }
}

function recoverCorruptedDevServer(pid: number, port: number, reason: string, loginStatus: number | null): void {
  console.warn(
    `[dev] Dev server unhealthy on port ${port} (GET /login → ${loginStatus ?? "unreachable"}). Recovering…`,
  );
  killDevPid(pid);
  removeDevCacheAfterCrash(reason);
}

function failDevAlreadyRunning(pid: number, port: number, reason: string): never {
  const loginStatus = fetchLoginRouteStatus(port);
  if (loginStatus === 404 || loginStatus === null) {
    recoverCorruptedDevServer(
      pid,
      port,
      loginStatus === 404 ? "login-route-404" : "dev-unreachable",
      loginStatus,
    );
    process.exit(0);
  }
  console.error(`[dev] Next.js dev server already running (${reason}, PID ${pid}, port ${port}).`);
  console.error(`[dev] Stop it first: taskkill /PID ${pid} /F`);
  console.error("[dev] Then: npm run clean:next -- --force && npm run dev");
  console.error("[dev] Or use: npm run dev:webpack while editing proxy.ts / proxy-handler.ts");
  process.exit(1);
}

/** Rileva PID in ascolto su porta (Windows netstat) — lock assente ma processo zombie. */
function pidListeningOnPort(port: number): number | null {
  try {
    const out = execSync("netstat -ano", { encoding: "utf8" });
    const suffix = `:${port}`;
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING") || !line.includes(suffix)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) return pid;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const orphanPortPid = pidListeningOnPort(DEFAULT_DEV_PORT);
if (orphanPortPid != null && pidAlive(orphanPortPid)) {
  const lockPid = fs.existsSync(LOCK_PATH)
    ? (JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) as DevLock).pid
    : undefined;
  if (lockPid !== orphanPortPid) {
    failDevAlreadyRunning(orphanPortPid, DEFAULT_DEV_PORT, "port in use without matching lock");
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
  failDevAlreadyRunning(pid, lock.port ?? DEFAULT_DEV_PORT, "lock file");
}

removeDevCacheAfterCrash(`stale-lock-pid-${pid ?? "?"}`);
