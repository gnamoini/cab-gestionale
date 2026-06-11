/**
 * @advisory v5 — versioned promotion registry. Engine config apply delegated to v5.1 enforcer.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  PromotionRegistrySnapshot,
  PromotionRegistryState,
  SelectorConfigProposal,
  SelectorPromotionLogEntry,
} from "@/lib/selector-core/types";

export const DEFAULT_PROMOTION_REGISTRY_PATH = path.join(
  process.cwd(),
  "docs",
  "selector",
  "v5",
  "promotion-log.json",
);

let registryState: PromotionRegistryState = createEmptyRegistryState();

function createLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyRegistryState(): PromotionRegistryState {
  return {
    version: 1,
    proposals: [],
    log: [],
    rollbackSnapshots: [],
  };
}

export function __getPromotionRegistryStateForTests(): PromotionRegistryState {
  return registryState;
}

export function __setPromotionRegistryStateForTests(state: PromotionRegistryState): void {
  registryState = state;
}

export function __resetPromotionRegistryForTests(): void {
  registryState = createEmptyRegistryState();
}

function snapshotWithoutRollbacks(
  state: PromotionRegistryState,
): PromotionRegistrySnapshot {
  return {
    version: state.version,
    proposals: state.proposals.map((p) => ({ ...p })),
    log: state.log.map((e) => ({ ...e })),
  };
}

export function loadPromotionRegistry(filePath = DEFAULT_PROMOTION_REGISTRY_PATH): PromotionRegistryState {
  if (!fs.existsSync(filePath)) {
    registryState = createEmptyRegistryState();
    return registryState;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as PromotionRegistryState;
  registryState = {
    version: parsed.version ?? 1,
    proposals: parsed.proposals ?? [],
    log: parsed.log ?? [],
    rollbackSnapshots: parsed.rollbackSnapshots ?? [],
  };
  return registryState;
}

export function savePromotionRegistry(
  state: PromotionRegistryState = registryState,
  filePath = DEFAULT_PROMOTION_REGISTRY_PATH,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  registryState = state;
}

function appendLog(
  state: PromotionRegistryState,
  entry: Omit<SelectorPromotionLogEntry, "id" | "timestamp">,
): PromotionRegistryState {
  const logEntry: SelectorPromotionLogEntry = {
    id: createLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  return {
    ...state,
    log: [...state.log, logEntry],
  };
}

export function registerProposal(proposal: SelectorConfigProposal): PromotionRegistryState {
  const exists = registryState.proposals.some((p) => p.id === proposal.id);
  const proposals = exists
    ? registryState.proposals.map((p) => (p.id === proposal.id ? proposal : p))
    : [...registryState.proposals, proposal];

  registryState = appendLog(
    { ...registryState, proposals },
    { proposalId: proposal.id, action: "proposed", actor: "system" },
  );
  return registryState;
}

export function registerProposals(proposals: SelectorConfigProposal[]): PromotionRegistryState {
  for (const proposal of proposals) {
    registerProposal(proposal);
  }
  return registryState;
}

export function approveProposal(
  id: string,
  actor: "human" | "system" = "human",
  note?: string,
): PromotionRegistryState {
  const target = registryState.proposals.find((p) => p.id === id);
  if (!target) throw new Error(`Proposal not found: ${id}`);

  const snapshot = snapshotWithoutRollbacks(registryState);
  const proposals = registryState.proposals.map((p) =>
    p.id === id ? { ...p, status: "approved" as const, version: p.version + 1 } : p,
  );

  registryState = appendLog(
    {
      ...registryState,
      version: registryState.version + 1,
      proposals,
      rollbackSnapshots: [...registryState.rollbackSnapshots, snapshot],
    },
    { proposalId: id, action: "approved", actor, note, previousVersion: snapshot.version },
  );
  return registryState;
}

export function rejectProposal(
  id: string,
  actor: "human" | "system" = "human",
  note?: string,
): PromotionRegistryState {
  const target = registryState.proposals.find((p) => p.id === id);
  if (!target) throw new Error(`Proposal not found: ${id}`);

  const proposals = registryState.proposals.map((p) =>
    p.id === id ? { ...p, status: "rejected" as const, version: p.version + 1 } : p,
  );

  registryState = appendLog(
    { ...registryState, proposals },
    { proposalId: id, action: "rejected", actor, note },
  );
  return registryState;
}

export function rollbackToVersion(targetVersion: number): PromotionRegistryState {
  const snapshot = registryState.rollbackSnapshots.find((s) => s.version === targetVersion);
  if (!snapshot) throw new Error(`Rollback snapshot not found for version ${targetVersion}`);

  registryState = appendLog(
    {
      version: snapshot.version,
      proposals: snapshot.proposals.map((p) => ({ ...p })),
      log: snapshot.log.map((e) => ({ ...e })),
      rollbackSnapshots: registryState.rollbackSnapshots.filter((s) => s.version !== targetVersion),
    },
    {
      proposalId: "registry",
      action: "rollback",
      actor: "human",
      note: `rolled back to version ${targetVersion}`,
      previousVersion: registryState.version,
    },
  );
  return registryState;
}

export function getProposalHistory(proposalId: string): SelectorPromotionLogEntry[] {
  return registryState.log.filter((entry) => entry.proposalId === proposalId);
}

export function getActiveRegistryState(): PromotionRegistryState {
  return registryState;
}
