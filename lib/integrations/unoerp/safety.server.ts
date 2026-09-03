const FORBIDDEN = /^(delete|cancel|disable|archive|annulla|void)$/i;

export function assertSafeUnoerpAct(action: string): void {
  if (FORBIDDEN.test(action.trim()) || action.toLowerCase().includes("delete")) {
    throw new Error("UnoERP destructive operations are forbidden");
  }
}

export function assertNoDeleteInPayload(payload: unknown): void {
  if (payload && typeof payload === "object") {
    const act = (payload as { act?: unknown }).act;
    if (typeof act === "string") assertSafeUnoerpAct(act);
  }
}
