import type { UnoerpInfoResponse } from "@/lib/integrations/unoerp/types";

export function fingerprintInfo(info: UnoerpInfoResponse): string {
  const pk = info.info?.primary_key ?? "";
  const keys = Object.keys(info.info?.fieldset ?? {}).sort();
  const raw = `${pk}|${keys.join(",")}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = (h * 33) ^ raw.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function assertSchemaFingerprint(current: string, expected: string | null): void {
  if (!expected) return;
  if (current !== expected) {
    const err = new Error("INTEGRATION_SCHEMA_MISMATCH");
    err.name = "INTEGRATION_SCHEMA_MISMATCH";
    throw err;
  }
}
