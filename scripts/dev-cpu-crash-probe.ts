/**
 * Monitora `next dev`: CPU Node, restart (lock pid), churn .next, errori stdout.
 * Uso: `npm run dev:cpu-probe` (avvia next dev e monitora ~45s).
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOG_PATH = path.join(ROOT, "dev-probe.log");
const MONITOR_MS = Number(process.env.DEV_CPU_PROBE_MS ?? 45_000);
const SAMPLE_MS = 2_000;

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

function sampleNodeCpuWindows(): Promise<number | null> {
  return new Promise((resolve) => {
    const ps = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "(Get-Process node -EA SilentlyContinue | Measure-Object -Property CPU -Sum).Sum",
      ],
      { windowsHide: true },
    );
    let out = "";
    ps.stdout.on("data", (c) => {
      out += String(c);
    });
    ps.on("close", () => {
      const n = parseFloat(out.trim());
      resolve(Number.isFinite(n) ? n : null);
    });
    ps.on("error", () => resolve(null));
  });
}

async function main(): Promise<void> {
  emit({
    runId: "cpu-crash",
    location: "dev-cpu-crash-probe.ts:start",
    message: "probe start",
    data: {
      hasNextDev: fs.existsSync(path.join(ROOT, ".next", "dev")),
      lockPidBefore: readLockPid(),
      bundler: process.argv.includes("--webpack") ? "webpack" : "turbopack",
    },
  });

  const useWebpack = process.argv.includes("--webpack");
  const child: ChildProcess = spawn(
    "npx",
    useWebpack ? ["next", "dev", "--webpack"] : ["next", "dev"],
    {
    cwd: ROOT,
    shell: true,
    env: { ...process.env },
  });

  let readyCount = 0;
  let compileCount = 0;
  let firstReadyAt: number | null = null;
  let errorLines: string[] = [];
  const stdoutBuf: string[] = [];

  const onChunk = (chunk: Buffer, stream: "stdout" | "stderr"): void => {
    const text = chunk.toString();
    stdoutBuf.push(`[${stream}] ${text}`);
    if (stdoutBuf.length > 80) stdoutBuf.shift();
    for (const line of text.split(/\r?\n/)) {
      if (/Ready in/i.test(line)) {
        readyCount += 1;
        if (firstReadyAt == null) firstReadyAt = Date.now();
      }
      if (/Compiling/i.test(line)) compileCount += 1;
      if (
        /NextSegmentConfig|os error 3|SST|panic|FATAL|crash|ENOMEM|EADDRINUSE/i.test(
          line,
        )
      ) {
        errorLines.push(line.slice(0, 300));
        if (errorLines.length > 20) errorLines.shift();
      }
    }
  };

  child.stdout?.on("data", (c) => onChunk(c as Buffer, "stdout"));
  child.stderr?.on("data", (c) => onChunk(c as Buffer, "stderr"));

  child.on("exit", (code, signal) => {
    emit({
      runId: "cpu-crash",
      location: "dev-cpu-crash-probe.ts:exit",
      message: "next dev process exited",
      data: { code, signal, readyCount, compileCount, errorLines },
    });
  });

  const cpuSamples: { t: number; cpuSum: number | null; lockPid: number | null }[] =
    [];
  let lockPidChanges = 0;
  let lastPid: number | null = readLockPid();
  let nextEvents = 0;
  let nextEventsAfterReady = 0;

  const nextDir = path.join(ROOT, ".next");
  const watcher = fs.existsSync(nextDir)
    ? fs.watch(nextDir, { recursive: true }, () => {
        nextEvents += 1;
        if (firstReadyAt != null) nextEventsAfterReady += 1;
      })
    : null;

  const start = Date.now();
  while (Date.now() - start < MONITOR_MS) {
    await new Promise((r) => setTimeout(r, SAMPLE_MS));
    const cpu = await sampleNodeCpuWindows();
    const lockPid = readLockPid();
    if (lockPid !== lastPid) {
      lockPidChanges += 1;
      lastPid = lockPid;
    }
    cpuSamples.push({ t: Date.now() - start, cpuSum: cpu, lockPid });
  }

  watcher?.close();
  child.kill("SIGTERM");

  const cpus = cpuSamples
    .map((s) => s.cpuSum)
    .filter((v): v is number => v != null);
  const delta =
    cpus.length >= 2 ? (cpus[cpus.length - 1] ?? 0) - (cpus[0] ?? 0) : null;

  emit({
    runId: "cpu-crash",
    location: "dev-cpu-crash-probe.ts:compile",
    message: "stdout compile/ready pattern",
    data: {
      readyCount,
      compileCount,
      readyRestartLoop: readyCount > 2,
      compileStorm: compileCount > 15,
      errorLines,
      tail: stdoutBuf.slice(-8),
    },
  });

  emit({
    runId: "cpu-crash",
    location: "dev-cpu-crash-probe.ts:cpu",
    message: "node cpu samples",
    data: {
      sampleCount: cpuSamples.length,
      lockPidChanges,
      nextEventsInWindow: nextEvents,
      nextEventsAfterReady,
      postReadyChurnPerSec:
        firstReadyAt != null
          ? Math.round(
              (nextEventsAfterReady /
                Math.max(1, (Date.now() - firstReadyAt) / 1000)) *
                10,
            ) / 10
          : null,
      cpuDeltaSeconds: delta,
      lastLockPid: lastPid,
      childExited: child.exitCode != null,
      childExitCode: child.exitCode,
    },
  });

  console.log("[dev:cpu-probe] Done → dev-probe.log");
}

void main();
