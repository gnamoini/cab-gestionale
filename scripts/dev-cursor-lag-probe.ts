/**
 * Diagnostica lag Cursor durante `npm run dev`: conta file e eventi watcher su `.next`.
 * Uso: avviare `npm run dev`, poi in un altro terminale `npm run dev:lag-probe`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOG_PATH = path.join(ROOT, "dev-probe.log");
const WATCH_MS = Number(process.env.DEV_LAG_PROBE_MS ?? 20_000);

type ProbeEvent = {
  runId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

function emit(p: Omit<ProbeEvent, "timestamp">): void {
  const line: ProbeEvent = { ...p, timestamp: Date.now() };
  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(line)}\n`);
  } catch {
    /* ignore */
  }
}

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
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
      else if (e.isFile()) n += 1;
    }
  }
  return n;
}

function readDevLock(): { pid?: number; port?: number } | null {
  const lockPath = path.join(ROOT, ".next", "dev", "lock");
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
      pid?: number;
      port?: number;
    };
  } catch {
    return { pid: undefined, port: undefined };
  }
}

async function watchNextChurn(): Promise<void> {
  const nextDir = path.join(ROOT, ".next");
  if (!fs.existsSync(nextDir)) {
    emit({
      runId: "lag-probe",
      location: "dev-cursor-lag-probe.ts:watch",
      message: ".next missing — dev not started yet",
      data: {},
    });
    return;
  }

  let events = 0;
  const bySecond = new Map<number, number>();
  const start = Date.now();

  const bump = (): void => {
    events += 1;
    const sec = Math.floor((Date.now() - start) / 1000);
    bySecond.set(sec, (bySecond.get(sec) ?? 0) + 1);
  };

  const watchers: fs.FSWatcher[] = [];
  const attach = (dir: string): void => {
    try {
      const w = fs.watch(dir, { recursive: true }, () => bump());
      watchers.push(w);
    } catch {
      try {
        const w = fs.watch(dir, () => bump());
        watchers.push(w);
      } catch {
        /* skip */
      }
    }
  };

  attach(nextDir);

  await new Promise<void>((r) => setTimeout(r, WATCH_MS));
  for (const w of watchers) w.close();

  const peak = Math.max(0, ...bySecond.values());
  const avg = events / Math.max(1, WATCH_MS / 1000);

  emit({
    runId: "lag-probe",
    location: "dev-cursor-lag-probe.ts:watch-done",
    message: ".next fs watch churn",
    data: {
      watchMs: WATCH_MS,
      totalEvents: events,
      eventsPerSecAvg: Math.round(avg * 10) / 10,
      peakEventsInOneSec: peak,
    },
  });
}

async function main(): Promise<void> {
  const nextFiles = countFiles(path.join(ROOT, ".next"));
  const hasCursorignore = fs.existsSync(path.join(ROOT, ".cursorignore"));
  const lock = readDevLock();

  emit({
    runId: "lag-probe",
    location: "dev-cursor-lag-probe.ts:baseline",
    message: "baseline workspace indexing load",
    data: {
      nextFileCount: nextFiles,
      hasCursorignore,
      gitignoreHasNext: fs
        .readFileSync(path.join(ROOT, ".gitignore"), "utf8")
        .includes(".next"),
    },
  });

  emit({
    runId: "lag-probe",
    location: "dev-cursor-lag-probe.ts:lock",
    message: "dev lock state",
    data: { lock },
  });

  console.log(
    `[dev:lag-probe] Watching .next for ${WATCH_MS / 1000}s (keep npm run dev running)...`,
  );
  await watchNextChurn();
  console.log("[dev:lag-probe] Done. Logs: dev-probe.log");
}

void main();
