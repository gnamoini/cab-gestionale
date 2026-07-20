import "server-only";

import { getServerSession } from "@/src/lib/auth/get-server-session";

export type NarrativeTenantContext = {
  userId: string;
  companyId: string;
  tenantResolved: boolean;
};

export type ResolveNarrativeTenantResult =
  | ({ ok: true } & NarrativeTenantContext)
  | { ok: false; status: 401 };

export async function resolveNarrativeTenantContext(): Promise<ResolveNarrativeTenantResult> {
  const session = await getServerSession();
  const userId = session.user?.id?.trim();
  if (!userId) {
    return { ok: false, status: 401 };
  }

  const snapshot = session as { companyId?: string };
  const rawCompanyId =
    snapshot.companyId?.trim() || session.user?.clienteRef?.trim() || "unknown";
  const companyId = rawCompanyId.length > 0 ? rawCompanyId : "unknown";

  return {
    ok: true,
    userId,
    companyId,
    tenantResolved: companyId !== "unknown",
  };
}
