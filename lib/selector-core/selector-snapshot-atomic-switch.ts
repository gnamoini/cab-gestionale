/**
 * @advisory v5.3.1 — atomic file writes with fsync + post-write verification. Node/fs only.
 */
import fs from "node:fs";
import path from "node:path";
import type { SelectorSnapshotPointer } from "@/lib/selector-core/types";
import { assertPointerMonotonicity } from "@/lib/selector-core/selector-distributed-pointer-guard";

export const DEFAULT_POINTER_PATH = path.join(
  process.cwd(),
  "lib",
  "selector-core",
  "generated",
  "selector-active-pointer.json",
);

export function atomicWriteJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const fd = fs.openSync(tmpPath, "w");
  try {
    fs.writeSync(fd, content, undefined, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}

export function atomicWriteJsonVerified(
  filePath: string,
  data: unknown,
  verifyFn?: (readBack: unknown) => boolean,
): void {
  atomicWriteJson(filePath, data);
  const readBack = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const defaultVerify = JSON.stringify(readBack) === JSON.stringify(data);
  const ok = verifyFn ? verifyFn(readBack) : defaultVerify;
  if (!ok) {
    throw new Error(`Write verification failed for ${filePath}`);
  }
}

export function verifyPointerWrite(
  pointerPath: string,
  expected: SelectorSnapshotPointer,
): boolean {
  const actual = readPointer(pointerPath);
  return (
    actual.activeVersion === expected.activeVersion &&
    actual.previousVersion === expected.previousVersion &&
    actual.status === expected.status
  );
}

export function readPointer(pointerPath = DEFAULT_POINTER_PATH): SelectorSnapshotPointer {
  if (!fs.existsSync(pointerPath)) {
    return {
      activeVersion: "v0",
      previousVersion: "v0",
      status: "stable",
      updatedAt: 0,
    };
  }
  return JSON.parse(fs.readFileSync(pointerPath, "utf8")) as SelectorSnapshotPointer;
}

export type SnapshotTransaction = {
  pointerPath: string;
  previousPointer: SelectorSnapshotPointer;
  committed: boolean;
};

export function beginSnapshotTransaction(
  pointerPath = DEFAULT_POINTER_PATH,
): SnapshotTransaction {
  const previousPointer = readPointer(pointerPath);
  const deploying: SelectorSnapshotPointer = {
    ...previousPointer,
    status: "deploying",
    updatedAt: Date.now(),
  };
  atomicWriteJsonVerified(pointerPath, deploying, (readBack) => {
    const pointer = readBack as SelectorSnapshotPointer;
    return pointer.status === "deploying";
  });
  return { pointerPath, previousPointer, committed: false };
}

export function commitPointerSwitch(
  transaction: SnapshotTransaction,
  next: Omit<SelectorSnapshotPointer, "status" | "updatedAt">,
): SelectorSnapshotPointer {
  const nextUpdatedAt = Date.now();
  assertPointerMonotonicity(transaction.previousPointer, nextUpdatedAt);
  const pointer: SelectorSnapshotPointer = {
    activeVersion: next.activeVersion,
    previousVersion: next.previousVersion,
    status: "stable",
    updatedAt: nextUpdatedAt,
  };
  atomicWriteJsonVerified(transaction.pointerPath, pointer);
  if (!verifyPointerWrite(transaction.pointerPath, pointer)) {
    throw new Error(`Pointer verification failed after commit: ${transaction.pointerPath}`);
  }
  transaction.committed = true;
  return pointer;
}

export function rollbackPointerTransaction(transaction: SnapshotTransaction): SelectorSnapshotPointer {
  if (transaction.committed) return readPointer(transaction.pointerPath);
  const restored: SelectorSnapshotPointer = {
    ...transaction.previousPointer,
    status: "stable",
    updatedAt: Date.now(),
  };
  atomicWriteJsonVerified(transaction.pointerPath, restored);
  return restored;
}

export function atomicPointerActivate(
  activeVersion: string,
  pointerPath = DEFAULT_POINTER_PATH,
): SelectorSnapshotPointer {
  const current = readPointer(pointerPath);
  const transaction = beginSnapshotTransaction(pointerPath);
  try {
    return commitPointerSwitch(transaction, {
      activeVersion,
      previousVersion: current.activeVersion,
    });
  } catch (error) {
    rollbackPointerTransaction(transaction);
    throw error;
  }
}

export function atomicPointerRollback(pointerPath = DEFAULT_POINTER_PATH): SelectorSnapshotPointer {
  const current = readPointer(pointerPath);
  if (!current.previousVersion || current.previousVersion === current.activeVersion) {
    throw new Error("No previous version available for rollback");
  }

  const transaction = beginSnapshotTransaction(pointerPath);
  try {
    const rolling: SelectorSnapshotPointer = {
      activeVersion: current.previousVersion,
      previousVersion: current.activeVersion,
      status: "rolling_back",
      updatedAt: Date.now(),
    };
    atomicWriteJsonVerified(pointerPath, rolling);
    return commitPointerSwitch(transaction, {
      activeVersion: current.previousVersion,
      previousVersion: current.activeVersion,
    });
  } catch (error) {
    rollbackPointerTransaction(transaction);
    throw error;
  }
}
