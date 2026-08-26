/**
 * Compare two security baseline JSON files — anon EXECUTE count diff.
 * Usage: npx tsx scripts/diff-security-baseline.ts [before] [after]
 *   Default before: docs/security/baseline-pre-remediation-2026-08-26.json
 *   With one arg: compares default before vs arg (after)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_BEFORE = path.join(ROOT, "docs/security/baseline-pre-remediation-2026-08-26.json");

type BaselineFn = {
  name: string;
  args: string;
  grants?: { anon?: boolean };
};

function fnKey(name: string, args: string): string {
  return args ? `${name}(${args})` : `${name}()`;
}

function countAnonExecute(functions: BaselineFn[]): number {
  return functions.filter((f) => f.grants?.anon).length;
}

function main(): void {
  const beforePath = process.argv[2]
    ? path.resolve(ROOT, process.argv[2])
    : DEFAULT_BEFORE;
  const afterPath = process.argv[3]
    ? path.resolve(ROOT, process.argv[3])
    : process.argv[2]
      ? path.resolve(ROOT, process.argv[2])
      : DEFAULT_BEFORE;

  if (!fs.existsSync(beforePath)) {
    console.error(`Missing before baseline: ${beforePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(afterPath)) {
    console.error(`Missing after baseline: ${afterPath}`);
    process.exit(1);
  }

  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as {
    functions: BaselineFn[];
    summary?: { anonExecuteCount?: number };
  };
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as {
    functions: BaselineFn[];
    summary?: { anonExecuteCount?: number };
  };

  const beforeCount = before.summary?.anonExecuteCount ?? countAnonExecute(before.functions);
  const afterCount = after.summary?.anonExecuteCount ?? countAnonExecute(after.functions);
  const delta = afterCount - beforeCount;

  const beforeKeys = new Set(before.functions.map((f) => fnKey(f.name, f.args)));
  const afterKeys = new Set(after.functions.map((f) => fnKey(f.name, f.args)));
  const anonLost = before.functions
    .filter((f) => f.grants?.anon && !afterKeys.has(fnKey(f.name, f.args)))
    .map((f) => fnKey(f.name, f.args));
  const anonGained = after.functions
    .filter((f) => f.grants?.anon && !beforeKeys.has(fnKey(f.name, f.args)))
    .map((f) => fnKey(f.name, f.args));

  console.log("=== Security baseline diff ===\n");
  console.log(`Before: ${path.relative(ROOT, beforePath)}`);
  console.log(`After:  ${path.relative(ROOT, afterPath)}`);
  console.log(`\nAnon EXECUTE count: ${beforeCount} → ${afterCount} (Δ ${delta})`);

  if (anonLost.length > 0) {
    console.log(`\nAnon revoked / removed (${anonLost.length}):`);
    for (const k of anonLost.slice(0, 10)) console.log(`  - ${k}`);
    if (anonLost.length > 10) console.log(`  ... +${anonLost.length - 10} more`);
  }

  if (anonGained.length > 0) {
    console.log(`\nNew anon EXECUTE (${anonGained.length}):`);
    for (const k of anonGained) console.log(`  + ${k}`);
  }

  if (beforePath === afterPath) {
    console.log("\n(same file — current snapshot only)");
  }
}

main();
