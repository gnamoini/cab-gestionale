import "server-only";

import {
  assertCapturePlanFresh,
  buildCaptureApplyPlanFromFields,
  hashCaptureFieldsRows,
  type ApprovedCreatesJson,
  type CaptureApplyPlan,
} from "@/lib/document-capture/capture-apply-plan";
import { mapCaptureFieldsToIngresso, type CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  beginCaptureApplyRpc,
  CaptureApplyInProgressError,
  completeCaptureApplyRpc,
} from "@/lib/document-capture/capture-apply-rpc.server";
import {
  createCaptureInterventoWriteDeps,
  fetchCaptureMezziCatalog,
} from "@/lib/document-capture/capture-intervento-write-deps.server";
import {
  createCaptureApplyJob,
  findRecoveryApplyJob,
  updateCaptureApplyJob,
} from "@/lib/document-capture/capture-apply-jobs.server";
import { insertCaptureLinks } from "@/lib/document-capture/capture-links.server";
import { fetchCaptureMagazzinoCatalog } from "@/lib/document-capture/capture-intervento-write-deps.server";
import { validateCaptureForApply, captureReviewAllowsForceApply } from "@/lib/document-capture/validation/validate-capture-for-apply";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { resolveFieldsForHash } from "@/lib/document-capture/resolve-fields-for-hash";
import { CapturePlanStaleError, hashConfirmedCaptureFields } from "@/lib/document-capture/capture-plan-staleness";
import { executeInterventoWrite } from "@/lib/domain/intervento-context/write-contract";
import { parseCaptureIngressoIso } from "@/lib/document-capture/capture-ingresso-iso";
import { auditContext, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { maybePublishTagliandoDueOnInterventoCreateServer } from "@/lib/maintenance-plans/tagliando-due-notification.server";

export type { CaptureApplyPlan, ApprovedCreatesJson };
export { CaptureApplyInProgressError, CapturePlanStaleError };

async function loadCaptureFields(captureId: string): Promise<CaptureFieldRow[]> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture_fields")
    .select("field_key, confirmed_value, normalized_value, confidence")
    .eq("document_capture_id", captureId);
  return (data ?? []) as CaptureFieldRow[];
}

async function findCommittedApply(captureId: string, dryRunApplicationId: string) {
  const sb = await createSupabaseServerUserClient();
  const { data: applyRows } = await sb
    .from("document_capture_applications")
    .select("id, status, plan_json")
    .eq("document_capture_id", captureId)
    .eq("kind", "apply")
    .eq("status", "committed");

  return (applyRows ?? []).find(
    (row) =>
      (row.plan_json as { sourceDryRunApplicationId?: string } | null)?.sourceDryRunApplicationId ===
      dryRunApplicationId,
  );
}

async function runCaptureApplySaga(input: {
  captureId: string;
  applicationId: string;
  userId: string;
  resume?: boolean;
  existingLavorazioneId?: string | null;
  forceReview?: boolean;
}): Promise<{ ok: true; lavorazioneId: string; mezzoId: string }> {
  const sb = await createSupabaseServerUserClient();

  const { data: capture } = await sb
    .from("document_capture")
    .select("id, company_id, capture_version, updated_at, status, mezzo_id, lavorazione_id, attrezzatura_id")
    .eq("id", input.captureId)
    .maybeSingle();

  const { data: application } = await sb
    .from("document_capture_applications")
    .select("*")
    .eq("id", input.applicationId)
    .eq("document_capture_id", input.captureId)
    .eq("kind", "dry_run")
    .maybeSingle();

  if (!capture || !application) {
    throw new Error("Dry-run non trovato");
  }

  const fields = await loadCaptureFields(input.captureId);
  const currentHash = hashCaptureFieldsRows(fields);
  assertCapturePlanFresh({
    applicationCaptureVersion: application.capture_version,
    applicationCaptureUpdatedAt: application.capture_updated_at,
    applicationSourceFieldsHash: application.source_fields_hash,
    captureCaptureVersion: capture.capture_version,
    captureUpdatedAt: capture.updated_at,
    currentFieldsHash: currentHash,
  });

  const approvedCreates = (application.approved_creates_json ?? {}) as ApprovedCreatesJson;
  const ingressoFields = mapCaptureFieldsToIngresso(fields);
  const idempotencyKey = `document-capture-apply:${input.applicationId}`;
  const existingLavorazioneId = input.existingLavorazioneId ?? capture.lavorazione_id;

  let applyJob = await findRecoveryApplyJob(input.captureId);
  if (!applyJob) {
    applyJob = await createCaptureApplyJob({
      captureId: input.captureId,
      companyId: capture.company_id,
      applicationId: input.applicationId,
      userId: input.userId,
      status: "VALIDATING",
      stepCurrent: "VALIDATING",
    });
  } else {
    await updateCaptureApplyJob(applyJob.id, {
      status: "APPLYING",
      stepCurrent: "APPLYING",
      applicationId: input.applicationId,
    });
  }

  const magazzino = await fetchCaptureMagazzinoCatalog();
  const validation = validateCaptureForApply({
    fields,
    magazzino,
    lavorazioneId: capture.lavorazione_id,
  });
  if (validation.status === "BLOCKED") {
    await updateCaptureApplyJob(applyJob.id, {
      status: "FAILED",
      stepCurrent: "VALIDATING",
      errorCode: "VALIDATION_BLOCKED",
      errorMessage:
        validation.issues.find((i) => i.severity === "error")?.message ?? "Validazione bloccata",
    });
    throw new Error(
      validation.issues.find((i) => i.severity === "error")?.message ?? "Validazione bloccata",
    );
  }
  if (validation.status === "REVIEW" && !input.forceReview) {
    await updateCaptureApplyJob(applyJob.id, {
      status: "FAILED",
      stepCurrent: "VALIDATING",
      errorCode: "REVIEW_REQUIRED",
      errorMessage: "Revisione operatore richiesta prima dell'apply",
    });
    throw new Error("REVIEW_REQUIRED");
  }
  if (input.forceReview && validation.status === "REVIEW" && !captureReviewAllowsForceApply(validation)) {
    await updateCaptureApplyJob(applyJob.id, {
      status: "FAILED",
      stepCurrent: "VALIDATING",
      errorCode: "RICAMBIO_NOT_FOUND",
      errorMessage: "Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.",
    });
    throw new Error("Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.");
  }

  await beginCaptureApplyRpc({
    captureId: input.captureId,
    applicationId: input.applicationId,
    resume: input.resume,
  });

  const deps = createCaptureInterventoWriteDeps({
    userId: input.userId,
    captureFields: fields,
    approvedCreates: {
      mezzo: approvedCreates.mezzo !== false,
      lavorazioni: approvedCreates.lavorazioni !== false,
      ricambi: approvedCreates.ricambi !== false,
    },
    magazzino,
    existingLavorazioneId,
  });

  const mezzoCatalog = await fetchCaptureMezziCatalog();
  const dataIngressoIso = parseCaptureIngressoIso(ingressoFields.dataIngresso);
  if (!dataIngressoIso) {
    throw new Error("Data ingresso non valida.");
  }

  try {
    const { result: saga } = await executeInterventoWrite(
      {
        mode: "create",
        idempotencyKey,
        fields: ingressoFields,
        lavorazioneId: existingLavorazioneId,
        mezziCatalog: mezzoCatalog,
        meta: {
          statoId: "accettazione",
          priorita: "normale",
          mezzoIdHint: capture.mezzo_id,
          dataIngressoIso,
          note: ingressoFields.noteIntervento.trim() || ingressoFields.descrizioneAnomalia.trim() || null,
          createdBy: input.userId,
        },
      },
      deps,
    );

    if (!saga.ok) {
      const eventType = saga.lavorazioneId ? "apply_partial" : "apply_failed";
      const failPlan = {
        sourceDryRunApplicationId: input.applicationId,
        stage: saga.stage,
        error: saga.error,
        lavorazioneId: saga.lavorazioneId ?? null,
      };

      await updateCaptureApplyJob(applyJob.id, {
        status: saga.lavorazioneId ? "RECOVERY_REQUIRED" : "FAILED",
        stepCurrent: saga.stage,
        createdLavorazioneId: saga.lavorazioneId ?? null,
        errorCode: eventType,
        errorMessage: saga.error,
      });

      await sb.from("document_capture_applications").insert({
        company_id: capture.company_id,
        document_capture_id: input.captureId,
        kind: "apply",
        status: "failed",
        source_fields_hash: application.source_fields_hash,
        capture_version: capture.capture_version,
        capture_updated_at: capture.updated_at,
        plan_json: failPlan,
        approved_creates_json: application.approved_creates_json,
        created_by: input.userId,
        error_message: saga.error,
      });

      await completeCaptureApplyRpc({
        captureId: input.captureId,
        applicationId: input.applicationId,
        success: false,
        eventType,
        lavorazioneId: saga.lavorazioneId ?? null,
        payload: failPlan,
      });

      throw new Error(saga.error);
    }

    await updateCaptureApplyJob(applyJob.id, {
      status: "COMMITTED",
      stepCurrent: "COMMITTED",
      createdLavorazioneId: saga.lavorazioneId,
      completedAt: new Date().toISOString(),
    });

    const { data: schedaRows } = await sb
      .from("scheda_lavorazione")
      .select("id, tipo")
      .eq("lavorazione_id", saga.lavorazioneId);

    await insertCaptureLinks([
      {
        captureId: input.captureId,
        companyId: capture.company_id,
        entityType: "lavorazione",
        entityId: saga.lavorazioneId,
        relation: "created_from",
        createdBy: input.userId,
      },
      ...(saga.mezzoId
        ? [
            {
              captureId: input.captureId,
              companyId: capture.company_id,
              entityType: "mezzo" as const,
              entityId: saga.mezzoId,
              relation: "created_from" as const,
              createdBy: input.userId,
            },
          ]
        : []),
      ...(schedaRows ?? []).map((row) => ({
        captureId: input.captureId,
        companyId: capture.company_id,
        entityType: "scheda_lavorazione" as const,
        entityId: (row as { id: string }).id,
        relation: "created_from" as const,
        createdBy: input.userId,
      })),
    ]);

    const applyPlan = {
      ...(application.plan_json as Record<string, unknown>),
      sourceDryRunApplicationId: input.applicationId,
      lavorazioneId: saga.lavorazioneId,
      mezzoId: saga.mezzoId,
    };

    await sb.from("document_capture_applications").insert({
      company_id: capture.company_id,
      document_capture_id: input.captureId,
      kind: "apply",
      status: "committed",
      source_fields_hash: application.source_fields_hash,
      capture_version: capture.capture_version,
      capture_updated_at: capture.updated_at,
      plan_json: applyPlan,
      approved_creates_json: application.approved_creates_json,
      created_by: input.userId,
      committed_at: new Date().toISOString(),
    });

    await completeCaptureApplyRpc({
      captureId: input.captureId,
      applicationId: input.applicationId,
      success: true,
      eventType: "apply_committed",
      lavorazioneId: saga.lavorazioneId,
      mezzoId: saga.mezzoId,
      payload: applyPlan,
    });

    await maybePublishTagliandoDueOnInterventoCreateServer(sb, {
      lavorazioneId: saga.lavorazioneId,
      mezzoId: saga.mezzoId,
      fields: ingressoFields,
      mezzo: mezzoCatalog.find((m) => m.id === saga.mezzoId) ?? null,
    });

    await writeModificaLog(sb, {
      entita: "lavorazioni",
      entita_id: saga.lavorazioneId,
      azione: "CREATE",
      payload: auditSnapshot(
        {
          lavorazioneId: saga.lavorazioneId,
          mezzoId: saga.mezzoId,
          document_capture_id: input.captureId,
          applicationId: input.applicationId,
          fieldsHash: currentHash,
        },
        auditContext("Document Capture apply"),
      ),
      autore_id: input.userId,
    });

    return { ok: true, lavorazioneId: saga.lavorazioneId, mezzoId: saga.mezzoId };
  } catch (e) {
    if (e instanceof Error && e.message.includes("apply")) throw e;
    throw e;
  }
}

export async function buildCaptureDryRunApplication(captureId: string): Promise<{
  applicationId: string;
  plan: CaptureApplyPlan;
  validation: ReturnType<typeof validateCaptureForApply>;
}> {
  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id ?? null;

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, capture_version, updated_at, lavorazione_id, mezzo_id, attrezzatura_id, status")
    .eq("id", captureId)
    .maybeSingle();

  if (error || !capture) {
    throw new Error("Capture non trovato");
  }

  if (capture.status !== "review" && capture.status !== "dry_run") {
    throw new Error("Stato capture non valido per dry-run");
  }

  const fields = await loadCaptureFields(captureId);
  const sourceFieldsHash = hashCaptureFieldsRows(fields);
  const magazzino = await fetchCaptureMagazzinoCatalog();
  const validation = validateCaptureForApply({
    fields,
    magazzino,
    lavorazioneId: capture.lavorazione_id,
  });
  const approvedCreates = { mezzo: true, lavorazioni: true, ricambi: true } satisfies ApprovedCreatesJson;

  const plan = buildCaptureApplyPlanFromFields({
    fields,
    lavorazioneId: capture.lavorazione_id,
    mezzoId: capture.mezzo_id,
    attrezzaturaId: capture.attrezzatura_id,
    approvedCreates,
    createdBy: userId ?? "Document Capture",
    magazzino,
  });

  const { data: app, error: appError } = await sb
    .from("document_capture_applications")
    .insert({
      company_id: capture.company_id,
      document_capture_id: captureId,
      kind: "dry_run",
      status: "pending",
      source_fields_hash: sourceFieldsHash,
      capture_version: capture.capture_version,
      capture_updated_at: capture.updated_at,
      plan_json: plan,
      approved_creates_json: approvedCreates,
      created_by: userId,
    })
    .select("id")
    .single();

  if (appError || !app) {
    throw new Error(appError?.message ?? "Dry-run non salvato");
  }

  await mutateCaptureWithEvent({
    captureId,
    eventType: "dry_run",
    idempotencyKey: `dry_run:${app.id}`,
    payload: { applicationId: app.id, sourceFieldsHash },
    newStatus: "dry_run",
  });

  // ponytail: mutate bumps capture_version/updated_at — snapshot must be post-mutate or apply hits PLAN_STALE
  const { data: captureAfter, error: captureAfterError } = await sb
    .from("document_capture")
    .select("capture_version, updated_at")
    .eq("id", captureId)
    .single();

  if (captureAfterError || !captureAfter) {
    throw new Error(captureAfterError?.message ?? "Capture non trovato dopo dry-run");
  }

  const { error: snapshotError } = await sb
    .from("document_capture_applications")
    .update({
      capture_version: captureAfter.capture_version,
      capture_updated_at: captureAfter.updated_at,
    })
    .eq("id", app.id);

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  return { applicationId: app.id, plan, validation };
}

export async function applyDocumentCapturePlan(input: {
  captureId: string;
  applicationId: string;
  forceReview?: boolean;
}): Promise<{ ok: true; lavorazioneId: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error("Sessione assente");
  }

  const existingApply = await findCommittedApply(input.captureId, input.applicationId);
  if (existingApply) {
    const lavId = (existingApply.plan_json as { lavorazioneId?: string })?.lavorazioneId;
    if (lavId) return { ok: true, lavorazioneId: lavId };
  }

  const { data: capture } = await sb
    .from("document_capture")
    .select("status")
    .eq("id", input.captureId)
    .maybeSingle();

  if (capture?.status !== "dry_run") {
    throw new Error("Apply consentito solo da stato dry_run");
  }

  const result = await runCaptureApplySaga({
    captureId: input.captureId,
    applicationId: input.applicationId,
    userId,
    forceReview: input.forceReview,
  });

  // ponytail: apply v1 keeps capture linked — no ephemeral discard after success

  return { ok: true, lavorazioneId: result.lavorazioneId };
}

export async function resumeFailedCaptureApply(input: {
  captureId: string;
  applicationId: string;
}): Promise<{ ok: true; lavorazioneId: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sessione assente");

  const { data: capture } = await sb
    .from("document_capture")
    .select("status")
    .eq("id", input.captureId)
    .maybeSingle();

  if (capture?.status !== "failed") {
    if (capture?.status === "applied" || capture?.status === "dry_run") {
      const existingApply = await findCommittedApply(input.captureId, input.applicationId);
      if (existingApply) {
        const lavId = (existingApply.plan_json as { lavorazioneId?: string })?.lavorazioneId;
        if (lavId) return { ok: true, lavorazioneId: lavId };
      }
    }
    throw new Error("Resume consentito solo da failed");
  }

  const existingCommitted = await findCommittedApply(input.captureId, input.applicationId);
  if (existingCommitted) {
    const lavId = (existingCommitted.plan_json as { lavorazioneId?: string })?.lavorazioneId;
    if (lavId) return { ok: true, lavorazioneId: lavId };
  }

  const { data: failedApply } = await sb
    .from("document_capture_applications")
    .select("plan_json")
    .eq("document_capture_id", input.captureId)
    .eq("kind", "apply")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const partialLavId = (failedApply?.plan_json as { lavorazioneId?: string | null } | null)?.lavorazioneId ?? null;

  const result = await runCaptureApplySaga({
    captureId: input.captureId,
    applicationId: input.applicationId,
    userId,
    resume: true,
    existingLavorazioneId: partialLavId,
  });

  return { ok: true, lavorazioneId: result.lavorazioneId };
}

export { hashConfirmedCaptureFields, resolveFieldsForHash };
