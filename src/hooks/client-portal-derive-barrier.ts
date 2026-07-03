export type BarrierState =
  | "INIT"
  | "LAYOUT_PENDING"
  | "DATA_L0_LOADING"
  | "READY_PARTIAL"
  | "READY_FULL"
  | "ERROR";

export type L0ContractStatus = "idle" | "loading" | "success" | "error";

export type L1ContractStatus = "idle" | "loading" | "success" | "error";

export type DeriveBarrierInput = {
  accessAllowed: boolean;
  shellContentWidth: number;
  l0Status: L0ContractStatus;
  l1Status: L1ContractStatus;
  forceRefreshing?: boolean;
};

export function canRenderFromBarrier(barrier: BarrierState): boolean {
  return barrier === "READY_PARTIAL" || barrier === "READY_FULL";
}

/** Deterministic barrier state machine — §2.2 master spec. */
export function deriveBarrierState(input: DeriveBarrierInput): BarrierState {
  if (!input.accessAllowed) return "ERROR";

  if (input.forceRefreshing) return "DATA_L0_LOADING";

  if (input.shellContentWidth === 0) {
    return input.l0Status === "idle" ? "INIT" : "LAYOUT_PENDING";
  }

  if (input.l0Status === "loading" || input.l0Status === "idle") {
    return "DATA_L0_LOADING";
  }

  if (input.l0Status === "error") return "ERROR";

  const l1Settled = input.l1Status === "success" || input.l1Status === "error";

  if (l1Settled) return "READY_FULL";

  return "READY_PARTIAL";
}
