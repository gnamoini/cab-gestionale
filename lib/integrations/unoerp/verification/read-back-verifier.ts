import { moneyStringFromNumber } from "@/lib/integrations/unoerp/monetary/decimal-policy";
import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";

/** Confronta solo CAB_MASTER. Campi extra UnoERP ignorati. */
export function verifyReadBack(
  expected: CabOwnedSnapshot,
  actual: { totale?: unknown; numero?: unknown; anno?: unknown; serie?: unknown },
): { ok: true } | { ok: false; reason: string } {
  if (actual.totale != null && moneyStringFromNumber(Number(actual.totale)) !== expected.totale) {
    return { ok: false, reason: "totale mismatch" };
  }
  if (expected.ddt && expected.ddt.numero != null) {
    if (actual.numero != null && Number(actual.numero) !== expected.ddt.numero) {
      return { ok: false, reason: "ddt number mismatch" };
    }
  }
  return { ok: true };
}
