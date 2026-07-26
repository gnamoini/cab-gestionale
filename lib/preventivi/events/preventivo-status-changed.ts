import type { PreventivoStato } from "@/lib/preventivi/types";

export type PreventivoStatusChangedPayload = {
  preventivo_id: string;
  from: PreventivoStato;
  to: PreventivoStato;
  user_id: string;
  timestamp: string;
  pdf_artifact_id?: string;
  confermato_by?: string;
};
