export type CanonicalSdiEventType =
  | "SUBMITTED"
  | "DELIVERY"
  | "DELIVERY_UNAVAILABLE"
  | "REJECTED"
  | "TECHNICAL_RECEIPT"
  | "UNKNOWN";

export type ParsedSdiEvent = {
  canonicalEventType: CanonicalSdiEventType;
  rawSdiEventCode: string | null;
  parsedCode: string | null;
  parsedMessage: string | null;
};

export function parseSdiEvent(
  outcome: string,
  rawCode?: string | null,
  message?: string | null,
): ParsedSdiEvent {
  const upper = outcome.trim().toUpperCase();
  const raw = rawCode?.trim().toUpperCase() ?? null;

  if (raw === "RC" || upper === "DELIVERED" || upper === "CONSEGNA") {
    return { canonicalEventType: "DELIVERY", rawSdiEventCode: raw ?? "RC", parsedCode: raw, parsedMessage: message ?? null };
  }
  if (raw === "MC" || upper === "DELIVERY_FAILED" || upper === "IMPOSSIBILITA_RECAPITO") {
    return { canonicalEventType: "DELIVERY_UNAVAILABLE", rawSdiEventCode: raw ?? "MC", parsedCode: raw, parsedMessage: message ?? null };
  }
  if (raw === "NS" || upper === "REJECTED" || upper === "SCARTO" || upper === "SCARTATA") {
    return { canonicalEventType: "REJECTED", rawSdiEventCode: raw ?? "NS", parsedCode: raw, parsedMessage: message ?? null };
  }
  if (upper === "SUBMITTED" || upper === "INVIATA") {
    return { canonicalEventType: "SUBMITTED", rawSdiEventCode: raw, parsedCode: raw, parsedMessage: message ?? null };
  }
  if (upper === "ACCEPTED" || upper === "TECHNICAL_RECEIPT" || upper === "PROVIDER_ACCEPTED") {
    return { canonicalEventType: "TECHNICAL_RECEIPT", rawSdiEventCode: raw, parsedCode: raw, parsedMessage: message ?? null };
  }
  return { canonicalEventType: "UNKNOWN", rawSdiEventCode: raw, parsedCode: raw, parsedMessage: message ?? null };
}
