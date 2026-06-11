/**
 * Generate selector adaptive insights report from telemetry snapshot.
 *
 * Usage:
 *   npx tsx scripts/selector-generate-adaptive-report.ts docs/selector-telemetry-snapshot.json
 *   type snapshot.json | npx tsx scripts/selector-generate-adaptive-report.ts
 *   npx tsx scripts/selector-generate-adaptive-report.ts --from-buffer
 *
 * Output: docs/selector-adaptive-insights.json (default)
 */
import fs from "node:fs";
import path from "node:path";
import { analyzeSelectorTelemetry } from "@/lib/selector-core/selector-adaptive-analyzer";
import {
  exportSelectorOpenEventSnapshot,
  type SelectorOpenEvent,
} from "@/lib/selector-core/selector-telemetry";

const DEFAULT_OUTPUT = path.join(process.cwd(), "docs", "selector-adaptive-insights.json");

function readInput(fileArg?: string): string | null {
  if (fileArg === "--from-buffer") return null;
  if (fileArg && fs.existsSync(fileArg)) {
    return fs.readFileSync(fileArg, "utf8");
  }
  if (process.stdin.isTTY) return null;
  return fs.readFileSync(0, "utf8");
}

function parseEvents(raw: string): SelectorOpenEvent[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed as SelectorOpenEvent[];
  if (
    parsed &&
    typeof parsed === "object" &&
    "events" in parsed &&
    Array.isArray((parsed as { events: unknown }).events)
  ) {
    return (parsed as { events: SelectorOpenEvent[] }).events;
  }
  throw new Error("Expected JSON array of selector_open_event or { events: [] }");
}

function resolveEvents(argv: string[]): SelectorOpenEvent[] {
  const arg = argv[2];
  if (arg === "--from-buffer") {
    return exportSelectorOpenEventSnapshot();
  }
  const raw = readInput(arg);
  if (raw) return parseEvents(raw);
  throw new Error(
    "Provide a snapshot JSON path, pipe JSON via stdin, or use --from-buffer",
  );
}

function main(): void {
  const outPath = process.argv[3] && !process.argv[3].startsWith("--")
    ? path.resolve(process.argv[3])
    : DEFAULT_OUTPUT;

  const events = resolveEvents(process.argv);
  const report = analyzeSelectorTelemetry(events);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`selector adaptive report written: ${outPath}`);
  console.log(`events=${report.eventCount} domains=${report.insights.length}`);
}

main();
