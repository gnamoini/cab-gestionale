import type { InterventoWriteStage } from "@/lib/domain/intervento-context/intervento-write-types";

const LEDGER_KEY = "intervento-write-ledger-v1";
const LEDGER_TTL_MS = 24 * 60 * 60 * 1000;

type LedgerEntry = {
  key: string;
  lavorazioneId?: string;
  mezzoId?: string;
  completedStage?: InterventoWriteStage;
  at: number;
};

let memoryLedger: LedgerEntry[] = [];

function readLedger(): LedgerEntry[] {
  if (typeof sessionStorage === "undefined") {
    const now = Date.now();
    return memoryLedger.filter((e) => now - e.at < LEDGER_TTL_MS);
  }
  try {
    const raw = sessionStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    const now = Date.now();
    return parsed.filter((e) => now - e.at < LEDGER_TTL_MS);
  } catch {
    return [];
  }
}

function writeLedger(entries: LedgerEntry[]): void {
  if (typeof sessionStorage === "undefined") {
    memoryLedger = entries;
    return;
  }
  try {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

export function getInterventoWriteLedgerEntry(idempotencyKey: string): LedgerEntry | undefined {
  return readLedger().find((e) => e.key === idempotencyKey);
}

export function upsertInterventoWriteLedger(
  idempotencyKey: string,
  patch: Partial<Omit<LedgerEntry, "key" | "at">>,
): void {
  const now = Date.now();
  const entries = readLedger().filter((e) => e.key !== idempotencyKey);
  const prev = readLedger().find((e) => e.key === idempotencyKey);
  entries.push({
    key: idempotencyKey,
    at: now,
    ...prev,
    ...patch,
  });
  writeLedger(entries);
}

export function clearInterventoWriteLedger(idempotencyKey: string): void {
  writeLedger(readLedger().filter((e) => e.key !== idempotencyKey));
}

export function shouldSkipInterventoWriteStage(
  idempotencyKey: string,
  stage: InterventoWriteStage,
  createMode: boolean,
): boolean {
  const entry = getInterventoWriteLedgerEntry(idempotencyKey);
  if (!entry) return false;
  if (createMode && stage === "prepare-mezzo" && entry.lavorazioneId) return true;
  if (createMode && stage === "prepare-lavorazione" && entry.lavorazioneId) return true;
  if (stage === "persist-scheda" && entry.completedStage === "persist-scheda") return true;
  if (stage === "finalize" && entry.completedStage === "finalize") return true;
  return false;
}
