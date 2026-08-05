export type PreventivoAcceptanceStatus = {
  status: "pending" | "accepted" | "rejected" | "not_applicable";
  canRespond: boolean;
  expiresAt: string | null;
  remainingSeconds: number | null;
  acceptanceMethod: "cliente" | "timeout_automatico" | null;
  displayLabel: string;
};
