/** Encoding richieste UnoERP — questa istanza richiede form-urlencoded, non JSON. */
export function flattenUnoerpParams(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenUnoerpParams(v as Record<string, unknown>, key));
    } else {
      out.push([key, String(v)]);
    }
  }
  return out;
}

export function buildUnoerpFormBody(params: Record<string, unknown>): URLSearchParams {
  return new URLSearchParams(flattenUnoerpParams(params));
}

export const UNOERP_FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";
