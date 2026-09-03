import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";
import { verifyReadBack } from "@/lib/integrations/unoerp/verification/read-back-verifier";

export type ReconcileKind = "OK" | "EXPECTED_DRIFT" | "UNEXPECTED_DRIFT" | "IDENTITY_DRIFT" | "MISSING";

export function classifyReconcile(opts: {
  expected: CabOwnedSnapshot;
  actual: { totale?: unknown; numero?: unknown } | null;
  unoerpMasterChanged: boolean;
}): ReconcileKind {
  if (!opts.actual) return "MISSING";
  const v = verifyReadBack(opts.expected, opts.actual);
  if (!v.ok) {
    if (opts.expected.ddt && opts.actual.numero != null && Number(opts.actual.numero) !== opts.expected.ddt.numero) {
      return "IDENTITY_DRIFT";
    }
    return "UNEXPECTED_DRIFT";
  }
  if (opts.unoerpMasterChanged) return "EXPECTED_DRIFT";
  return "OK";
}
