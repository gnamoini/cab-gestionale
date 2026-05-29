export type GateStatus = "PASS" | "FAIL";

export type GateResultInput = {
  name: string;
  status: GateStatus;
  blockers: string[];
  warnings?: string[];
};

export function printGateHeader(name: string): void {
  console.log(`\n=== ${name} ===\n`);
}

function printList(title: string, items: string[]): void {
  console.log(`${title}:`);
  if (items.length === 0) {
    console.log("- none");
    return;
  }
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

export function printGateResult(input: GateResultInput): void {
  const { name, status, blockers, warnings = [] } = input;
  printGateHeader(name);
  console.log(`STATUS: ${status}`);
  console.log("");
  printList("BLOCKERS", blockers);
  if (warnings.length > 0) {
    console.log("");
    printList("WARNINGS", warnings);
  }
  console.log("");
  console.log(`SUMMARY: ${name} — ${status} (${blockers.length} blockers)`);
}

export function exitWithGate(status: GateStatus): never {
  process.exit(status === "PASS" ? 0 : 1);
}

export function tailOutput(text: string, maxLines = 12): string {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  return lines.slice(-maxLines).join("\n");
}
