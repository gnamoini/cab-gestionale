import type { FormUxFormId, FormUxFormRollout } from "@/lib/form-ux-migration/types";

/** SSOT rollout defaults — versioned in repo. */
export const FORM_UX_ROLLOUT: Record<FormUxFormId, FormUxFormRollout> = {
  ricambio: {
    defaultMode: "legacy",
    fields: {
      "prezzo-listino": {
        kind: "number",
        mode: "shadow",
        enforcement: "warn",
        devices: ["desktop", "ios"],
        fallback: "legacy",
        submitPrecedence: "ssot-wins",
        critical: true,
        stateKey: "prezzoFornitoreOriginale",
      },
      "sconto-oe": { kind: "number", mode: "ssot" },
      markup: { kind: "number", mode: "ssot" },
    },
  },
  "scheda-ingresso": {
    defaultMode: "legacy",
    fields: {},
  },
  lavorazioni: {
    defaultMode: "legacy",
    fields: {},
  },
  mezzi: {
    defaultMode: "legacy",
    fields: {},
  },
  preventivi: {
    defaultMode: "legacy",
    fields: {},
  },
  settings: {
    defaultMode: "legacy",
    fields: {},
  },
};
