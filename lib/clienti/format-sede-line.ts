import type { ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";

export function formatSedeLine(fields: ClienteSedeFields): string {
  const parts = [
    [fields.via, fields.numeroCivico].filter(Boolean).join(" "),
    [fields.cap, fields.citta].filter(Boolean).join(" "),
    fields.provincia,
    fields.stato !== "IT" ? fields.stato : "",
  ].filter(Boolean);
  return parts.join(", ");
}
