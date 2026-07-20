/**
 * Rimuove `.next/dev` quando non c'è un next dev attivo (lock assente o stale).
 * Utile dopo crash Turbopack (SST corrotti / os error 3).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEV_DIR = path.join(ROOT, ".next", "dev");
const LOCK_PATH = path.join(DEV_DIR, "lock");

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function devServerRunning(): boolean {
  if (!fs.existsSync(LOCK_PATH)) return false;
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) as { pid?: number };
    return Boolean(lock.pid && pidAlive(lock.pid));
  } catch {
    return false;
  }
}

const force = process.argv.includes("--force");
const devOnly = !process.argv.includes("--all");

if (devServerRunning() && !force) {
  console.error("[clean:next] Next.js dev server in esecuzione. Fermalo prima oppure usa --force.");
  process.exit(1);
}

const target = devOnly ? DEV_DIR : path.join(ROOT, ".next");
if (!fs.existsSync(target)) {
  console.info(`[clean:next] Nessuna cartella da rimuovere (${path.relative(ROOT, target)}).`);
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true, maxRetries: 12, retryDelay: 300 });
console.info(`[clean:next] Rimosso ${path.relative(ROOT, target)}.`);
