import "server-only";

import type { PreventivoStatoCliente } from "@/lib/preventivi/types";
import type { PreventivoAcceptanceStatus } from "@/lib/preventivi/preventivo-acceptance-status";
import { preventivoClienteDisplayLabel } from "@/lib/preventivi/preventivo-status-ui";
import type { PreventivoRow } from "@/src/types/supabase-tables";

export function buildPreventivoAcceptanceStatus(
  row: Pick<
    PreventivoRow,
    | "stato_workflow"
    | "stato_cliente"
    | "scadenza_accettazione_at"
    | "metodo_accettazione"
    | "inviato_at"
  >,
  now = new Date(),
): PreventivoAcceptanceStatus {
  const cliente = row.stato_cliente;
  const method = row.metodo_accettazione;

  if (!row.inviato_at || row.stato_workflow === "bozza" || row.stato_workflow === "annullato") {
    return {
      status: "not_applicable",
      canRespond: false,
      expiresAt: null,
      remainingSeconds: null,
      acceptanceMethod: null,
      displayLabel: "—",
    };
  }

  if (cliente === "accettato") {
    return {
      status: "accepted",
      canRespond: false,
      expiresAt: row.scadenza_accettazione_at,
      remainingSeconds: null,
      acceptanceMethod: method,
      displayLabel: preventivoClienteDisplayLabel("accettato", method),
    };
  }

  if (cliente === "rifiutato") {
    return {
      status: "rejected",
      canRespond: false,
      expiresAt: row.scadenza_accettazione_at,
      remainingSeconds: null,
      acceptanceMethod: null,
      displayLabel: preventivoClienteDisplayLabel("rifiutato"),
    };
  }

  const expiresAt = row.scadenza_accettazione_at;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const remainingSeconds =
    expiresMs != null ? Math.max(0, Math.floor((expiresMs - now.getTime()) / 1000)) : null;
  const canRespond =
    row.stato_workflow === "inviato" &&
    cliente === "pending" &&
    remainingSeconds != null &&
    remainingSeconds > 0;

  return {
    status: "pending",
    canRespond,
    expiresAt,
    remainingSeconds,
    acceptanceMethod: null,
    displayLabel: preventivoClienteDisplayLabel("pending" as PreventivoStatoCliente),
  };
}
