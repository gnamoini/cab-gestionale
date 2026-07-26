import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { writeMaintenanceAuditEvent, MAINTENANCE_AUDIT_ACTIONS } from "@/lib/maintenance-plans/maintenance-audit";
import type { ComplianceReview } from "@/lib/maintenance-plans/maintenance-task";
import { resolveCompliancePct } from "@/lib/maintenance-plans/resolve-compliance-pct";

export async function reviewTagliandoCompliance(input: {
  serviceId: string;
  review: ComplianceReview;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await createSupabaseServerUserClient();
  const { data: user } = await client.auth.getUser();
  const uid = user.user?.id ?? null;

  const { data: row, error: readErr } = await client
    .from("vehicle_maintenance_services")
    .select("id, compliance_auto, compliance_review")
    .eq("id", input.serviceId)
    .maybeSingle();

  if (readErr || !row) return { ok: false, error: "Servizio non trovato." };

  const auto = row.compliance_auto as number | null;
  const reviewPayload: ComplianceReview = {
    ...input.review,
    reviewedBy: uid ?? input.review.reviewedBy,
    reviewedAt: new Date().toISOString(),
  };

  const { error } = await client
    .from("vehicle_maintenance_services")
    .update({ compliance_review: reviewPayload })
    .eq("id", input.serviceId);

  if (error) return { ok: false, error: error.message };

  await writeMaintenanceAuditEvent(client, {
    entity: "execution",
    entityId: input.serviceId,
    action: MAINTENANCE_AUDIT_ACTIONS.COMPLIANCE_REVIEWED,
    oldValue: { compliance_auto: auto, compliance_review: row.compliance_review },
    newValue: {
      compliance_effective: resolveCompliancePct(auto, reviewPayload),
      compliance_review: reviewPayload,
    },
    createdBy: uid,
  });

  return { ok: true };
}
