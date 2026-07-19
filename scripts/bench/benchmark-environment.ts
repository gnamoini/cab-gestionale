import { execSync } from "node:child_process";
import os from "node:os";

export type BenchmarkNextMode = "dev" | "production";
export type BenchmarkDataset = "dev" | "staging-small" | "staging-large";

export type BenchmarkEnvironment = {
  timestamp: string;
  gitCommit: string;
  branch: string;
  nodeVersion: string;
  browser: string;
  nextMode: BenchmarkNextMode;
  dataset: BenchmarkDataset;
  machine: string;
  viewport: string;
};

export function readCliArgValue(argv: string[], prefix: string): string | undefined {
  const token = argv.find((a) => a.startsWith(prefix));
  return token ? token.slice(prefix.length) : undefined;
}

export function parseBenchCliArgs(argv: string[]): {
  nextMode: BenchmarkNextMode;
  dataset: BenchmarkDataset;
} {
  const nextModeRaw = readCliArgValue(argv, "--next-mode=");
  const datasetRaw = readCliArgValue(argv, "--dataset=");
  return {
    nextMode: nextModeRaw === "production" ? "production" : "dev",
    dataset:
      datasetRaw === "staging-small" || datasetRaw === "staging-large" ? datasetRaw : "dev",
  };
}

export function buildBenchmarkEnvironment(opts: {
  nextMode?: BenchmarkNextMode;
  dataset?: BenchmarkDataset;
  viewport?: string;
}): BenchmarkEnvironment {
  let gitCommit = "unknown";
  let branch = "unknown";
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* no git */
  }
  return {
    timestamp: new Date().toISOString(),
    gitCommit,
    branch,
    nodeVersion: process.version,
    browser: "chromium",
    nextMode: opts.nextMode ?? "dev",
    dataset: opts.dataset ?? "dev",
    machine: os.hostname(),
    viewport: opts.viewport ?? "1440x900",
  };
}
