/**
 * Probe OOM dev: campiona memoria Node durante compile route.
 * Scrive NDJSON su debug-a427f4.log (sessione debug).
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOG_PATH = path.join(ROOT, "debug-a427f4.log");
const INGEST = "http://127.0.0.1:7497/ingest/9402321d-1c49-42dc-93cb-533af8484ed1";
const SESSION = "a427f4";
const WARM_DIPENDENTI_HITS = Number(process.env.DEV_OOM_WARM_HITS ?? 0);
const PORT = Number(process.env.DEV_OOM_PORT ?? 3000);

type LogPayload = {
  sessionId: string;
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

function log(p: Omit<LogPayload, "sessionId" | "timestamp">): void {
  const line: LogPayload = { ...p, sessionId: SESSION, timestamp: Date.now() };
  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(line)}\n`);
  } catch {
    /* ignore */
  }
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify(line),
  }).catch(() => {});
}

function readLockPid(): number | null {
  const lockPath = path.join(ROOT, ".next", "dev", "lock");
  if (!fs.existsSync(lockPath)) return null;
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { pid?: number };
    return lock.pid ?? null;
  } catch {
    return null;
  }
}

function dirSizeMb(dir: string): number | null {
  if (!fs.existsSync(dir)) return null;
  let bytes = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        try {
          bytes += fs.statSync(full).size;
        } catch {
          /* skip */
        }
      }
    }
  }
  return Math.round((bytes / 1048576) * 10) / 10;
}

function sampleNodeWorkingSetMb(pid: number | null): Promise<number | null> {
  if (pid == null) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ps = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${pid} -EA SilentlyContinue | Select-Object -ExpandProperty WorkingSet64)`,
      ],
      { windowsHide: true },
    );
    let out = "";
    ps.stdout.on("data", (c) => {
      out += String(c);
    });
    ps.on("close", () => {
      const n = parseInt(out.trim(), 10);
      resolve(Number.isFinite(n) ? Math.round(n / 1048576) : null);
    });
    ps.on("error", () => resolve(null));
  });
}

async function waitForReady(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const onData = (chunk: Buffer) => {
      if (/Ready in/i.test(chunk.toString())) {
        clearTimeout(timer);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve(true);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });
}

async function hitRoute(route: string): Promise<{ status: number | null; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}${route}`, { redirect: "manual" });
    return { status: res.status, ms: Date.now() - start };
  } catch {
    return { status: null, ms: Date.now() - start };
  }
}

async function main(): Promise<void> {
  const runId = process.argv.includes("--webpack") ? "webpack-probe" : "turbopack-probe";
  const useWebpack = process.argv.includes("--webpack");

  log({
    runId,
    hypothesisId: "H3",
    location: "dev-oom-probe.ts:start",
    message: "probe start",
    data: {
      warmDipendentiHits: WARM_DIPENDENTI_HITS,
      nextDevMb: dirSizeMb(path.join(ROOT, ".next", "dev")),
      nextCacheMb: dirSizeMb(path.join(ROOT, ".next", "dev", "cache")),
      bundler: useWebpack ? "webpack" : "turbopack",
    },
  });

  const child = spawn("npx", useWebpack ? ["next", "dev", "--webpack", "-p", String(PORT)] : ["next", "dev", "-p", String(PORT)], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env },
  });

  let fatal = false;
  const onErr = (chunk: Buffer) => {
    const t = chunk.toString();
    if (/heap out of memory|FATAL ERROR|ENOMEM/i.test(t)) fatal = true;
  };
  child.stderr?.on("data", onErr);
  child.stdout?.on("data", onErr);

  const ready = await waitForReady(child, 180_000);
  const pid = readLockPid();
  const memReady = await sampleNodeWorkingSetMb(pid);

  log({
    runId,
    hypothesisId: "H1",
    location: "dev-oom-probe.ts:ready",
    message: "dev ready",
    data: { ready, pid, workingSetMb: memReady },
  });

  if (!ready) {
    child.kill("SIGTERM");
    log({
      runId,
      hypothesisId: "H1",
      location: "dev-oom-probe.ts:abort",
      message: "dev not ready",
      data: { fatal },
    });
    process.exit(1);
  }

  for (let i = 0; i < WARM_DIPENDENTI_HITS; i++) {
    const hit = await hitRoute("/dipendenti");
    const mem = await sampleNodeWorkingSetMb(readLockPid());
    log({
      runId,
      hypothesisId: "H5",
      location: "dev-oom-probe.ts:warm-dipendenti",
      message: "warm hit",
      data: { i, ...hit, workingSetMb: mem },
    });
  }

  const memBeforeImp = await sampleNodeWorkingSetMb(readLockPid());
  log({
    runId,
    hypothesisId: "H2",
    location: "dev-oom-probe.ts:before-impostazioni",
    message: "before impostazioni compile",
    data: { workingSetMb: memBeforeImp },
  });

  const impHit = await hitRoute("/impostazioni");
  await new Promise((r) => setTimeout(r, 5000));
  const memAfterImp = await sampleNodeWorkingSetMb(readLockPid());

  log({
    runId,
    hypothesisId: "H2",
    location: "dev-oom-probe.ts:after-impostazioni",
    message: "after impostazioni compile",
    data: { ...impHit, workingSetMb: memAfterImp, deltaMb: memBeforeImp != null && memAfterImp != null ? memAfterImp - memBeforeImp : null, fatal },
  });

  child.kill("SIGTERM");
  log({
    runId,
    hypothesisId: "H4",
    location: "dev-oom-probe.ts:done",
    message: "probe done",
    data: { fatal, nextDevMb: dirSizeMb(path.join(ROOT, ".next", "dev")) },
  });
}

main().catch((err) => {
  log({
    runId: "probe-error",
    hypothesisId: "H1",
    location: "dev-oom-probe.ts:catch",
    message: String(err),
    data: {},
  });
  process.exit(1);
});
