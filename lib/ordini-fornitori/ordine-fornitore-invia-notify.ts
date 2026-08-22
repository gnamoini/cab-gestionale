import {
  ORDINE_FORNITORE_FALLBACK_MANUAL_MESSAGE,
  ORDINE_FORNITORE_SHARE_SUCCESS_MESSAGE,
} from "@/lib/ordini-fornitori/ordine-fornitore-email-draft";
import type { OrdineFornitoreEmailDraftOutcome } from "@/lib/ordini-fornitori/ordine-fornitore-email-draft.client";
import type { GestionaleErrorContext } from "@/src/utils/gestionale-error-messages";

type InviaToastApi = {
  successOnce: (actionKey: string, message: string) => void;
  warning: (message: string) => void;
  errorOnce: (actionKey: string, err: unknown, ctx?: GestionaleErrorContext) => void;
};

/** Toast per outcome INVIA; return true solo se lo stato deve passare a inviato. */
export function notifyOrdineFornitoreInviaOutcome(
  ordineId: string,
  outcome: OrdineFornitoreEmailDraftOutcome,
  gestToast: InviaToastApi,
): boolean {
  const key = `ordine-invia-${ordineId}`;
  switch (outcome.outcome) {
    case "shared":
      gestToast.successOnce(key, ORDINE_FORNITORE_SHARE_SUCCESS_MESSAGE);
      return true;
    case "fallback_manual":
      gestToast.warning(ORDINE_FORNITORE_FALLBACK_MANUAL_MESSAGE);
      return false;
    case "cancelled":
      return false;
    case "error":
      gestToast.errorOnce(key, outcome.message, { module: "ordini_fornitori" });
      return false;
  }
}
