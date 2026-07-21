export type VehicleIdentifierKind = "targa" | "matricola" | "scuderia" | "vin";

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/** SSOT normalizzazione identificativi mezzo per confronto capture / ingresso / lista. */
export function normalizeVehicleIdentifier(kind: VehicleIdentifierKind, raw: string | null | undefined): string {
  const s = safeStr(raw);
  if (!s || s === "—") return "";

  switch (kind) {
    case "targa":
      return s.replace(/[\s\-/]/g, "").toUpperCase();
    case "matricola": {
      const upper = s.toUpperCase();
      if (upper === "NON ASSEGNATA") return "";
      return upper;
    }
    case "scuderia":
      return s.toLowerCase();
    case "vin":
      return s.replace(/\s/g, "").toUpperCase();
    default:
      return s;
  }
}
