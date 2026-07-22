"use client";

import { useCallback, useState } from "react";
import type { SchedaIngressoFields } from "@/types/schede";
import { schedaIngressoFieldsToCapturePatches } from "@/lib/document-capture/capture-ingresso-form-to-fields";
import {
  compilePayloadToCapturePatches,
  type CaptureSchedaCompilePayload,
} from "@/lib/document-capture/capture-scheda-compile-payload";
import { mapCaptureApplyErrorMessage } from "@/lib/document-capture/capture-apply-error-copy";
import {
  captureReviewAllowsForceApply,
  type ValidateCaptureResult,
} from "@/lib/document-capture/validation/validate-capture-for-apply";
import type { CaptureApplyMeta } from "@/lib/document-capture/capture-apply-meta";

export type CaptureApplyFlowResult = {
  ok: true;
  lavorazioneId: string;
  applicationId: string;
};

export function useCaptureApplyFlow(captureId: string | null) {
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<ValidateCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastApplicationId, setLastApplicationId] = useState<string | null>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);

  const syncIngressoFields = useCallback(
    async (fields: SchedaIngressoFields) => {
      if (!captureId) throw new Error("Capture assente");
      const patches = schedaIngressoFieldsToCapturePatches(fields);
      if (patches.length === 0) return;
      const res = await fetch(`/api/document-capture/${captureId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: patches.map((p) => ({
            fieldKey: p.fieldKey,
            confirmedValue: p.confirmedValue,
            valueSource: "manual" as const,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Sincronizzazione campi non riuscita");
      }
    },
    [captureId],
  );

  const syncSchedaFields = useCallback(
    async (payload: CaptureSchedaCompilePayload) => {
      if (!captureId) throw new Error("Capture assente");
      if (payload.captureId !== captureId) throw new Error("Capture non corrispondente al draft");
      const patches = compilePayloadToCapturePatches(payload);
      if (patches.length === 0) return;
      const res = await fetch(`/api/document-capture/${captureId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: patches.map((p) => ({
            fieldKey: p.fieldKey,
            confirmedValue: p.confirmedValue,
            valueSource: p.valueSource,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Sincronizzazione campi non riuscita");
      }
    },
    [captureId],
  );

  const refreshCaptureRecoveryState = useCallback(async () => {
    if (!captureId) return;
    const res = await fetch(`/api/document-capture/${captureId}`);
    if (!res.ok) return;
    const body = (await res.json()) as { capture?: { status?: string } };
    setRecoveryAvailable(body.capture?.status === "failed" && Boolean(lastApplicationId));
  }, [captureId, lastApplicationId]);

  const runDryRun = useCallback(async () => {
    if (!captureId) throw new Error("Capture assente");
    const res = await fetch(`/api/document-capture/${captureId}/dry-run`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as {
      applicationId?: string;
      plan?: unknown;
      validation?: ValidateCaptureResult;
      error?: string;
    };
    if (!res.ok) throw new Error(body.error ?? "Dry-run non riuscito");
    if (body.validation) setValidation(body.validation);
    if (!body.applicationId) throw new Error("Dry-run senza applicationId");
    setLastApplicationId(body.applicationId);
    setRecoveryAvailable(false);
    return { applicationId: body.applicationId, validation: body.validation ?? null };
  }, [captureId]);

  const runApply = useCallback(
    async (
      applicationId: string,
      opts?: { forceReview?: boolean; applyMeta?: CaptureApplyMeta },
    ) => {
      if (!captureId) throw new Error("Capture assente");
      if (validation?.status === "REVIEW" && !opts?.forceReview) {
        throw new Error("REVIEW_REQUIRED");
      }
      if (opts?.forceReview && validation && !captureReviewAllowsForceApply(validation)) {
        throw new Error("Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.");
      }
      const res = await fetch(`/api/document-capture/${captureId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          forceReview: opts?.forceReview ?? false,
          applyMeta: opts?.applyMeta,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        lavorazioneId?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (body.code === "PLAN_STALE") {
          throw Object.assign(new Error(mapCaptureApplyErrorMessage("", "PLAN_STALE")), { code: "PLAN_STALE" });
        }
        const capRes = await fetch(`/api/document-capture/${captureId}`);
        if (capRes.ok) {
          const capBody = (await capRes.json()) as { capture?: { status?: string } };
          if (capBody.capture?.status === "failed") setRecoveryAvailable(true);
        }
        const msg = mapCaptureApplyErrorMessage(body.error ?? "Apply non riuscito", body.code);
        throw new Error(msg);
      }
      if (!body.lavorazioneId) throw new Error("Apply senza lavorazioneId");
      setRecoveryAvailable(false);
      return body.lavorazioneId;
    },
    [captureId, validation],
  );

  const resumeApply = useCallback(async (): Promise<CaptureApplyFlowResult> => {
    if (!captureId || !lastApplicationId) throw new Error("Nessun import da riprendere");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: lastApplicationId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        lavorazioneId?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        const msg = mapCaptureApplyErrorMessage(body.error ?? "Ripresa non riuscita", body.code);
        throw new Error(msg);
      }
      if (!body.lavorazioneId) throw new Error("Ripresa senza lavorazioneId");
      setRecoveryAvailable(false);
      return { ok: true, lavorazioneId: body.lavorazioneId, applicationId: lastApplicationId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ripresa non riuscita";
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [captureId, lastApplicationId]);

  const applyFromIngresso = useCallback(
    async (
      fields: SchedaIngressoFields,
      opts?: { forceReview?: boolean; meta?: CaptureApplyMeta },
    ): Promise<CaptureApplyFlowResult> => {
      if (!captureId) throw new Error("Capture assente");
      setBusy(true);
      setError(null);
      try {
        await syncIngressoFields(fields);
        const { applicationId, validation: v } = await runDryRun();
        if (v?.status === "BLOCKED") {
          setValidation(v);
          throw new Error(v.issues.find((i) => i.severity === "error")?.message ?? "Validazione bloccata");
        }
        if (v?.status === "REVIEW" && !opts?.forceReview) {
          setValidation(v);
          throw new Error("REVIEW_REQUIRED");
        }
        if (opts?.forceReview && v && !captureReviewAllowsForceApply(v)) {
          throw new Error("Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.");
        }
        const lavorazioneId = await runApply(applicationId, {
          forceReview: opts?.forceReview,
          applyMeta: opts?.meta,
        });
        return { ok: true, lavorazioneId, applicationId };
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Apply non riuscito";
        const code = e instanceof Error && "code" in e ? String((e as { code?: string }).code) : undefined;
        const msg = mapCaptureApplyErrorMessage(raw, code);
        if (raw !== "REVIEW_REQUIRED" && msg) setError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [captureId, runApply, runDryRun, syncIngressoFields],
  );

  const applyAssignOnly = useCallback(
    async (opts?: { forceReview?: boolean }): Promise<CaptureApplyFlowResult> => {
      if (!captureId) throw new Error("Capture assente");
      setBusy(true);
      setError(null);
      try {
        const { applicationId, validation: v } = await runDryRun();
        if (v?.status === "BLOCKED") {
          setValidation(v);
          throw new Error(v.issues.find((i) => i.severity === "error")?.message ?? "Validazione bloccata");
        }
        if (v?.status === "REVIEW" && !opts?.forceReview) {
          setValidation(v);
          throw new Error("REVIEW_REQUIRED");
        }
        if (opts?.forceReview && v && !captureReviewAllowsForceApply(v)) {
          throw new Error("Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.");
        }
        const lavorazioneId = await runApply(applicationId, opts);
        return { ok: true, lavorazioneId, applicationId };
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Apply non riuscito";
        if (raw !== "REVIEW_REQUIRED") setError(mapCaptureApplyErrorMessage(raw));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [captureId, runApply, runDryRun],
  );

  const applyFromScheda = useCallback(
    async (
      payload: CaptureSchedaCompilePayload,
      opts?: { forceReview?: boolean },
    ): Promise<CaptureApplyFlowResult> => {
      if (!captureId) throw new Error("Capture assente");
      setBusy(true);
      setError(null);
      try {
        await syncSchedaFields(payload);
        const { applicationId, validation: v } = await runDryRun();
        if (v?.status === "BLOCKED") {
          setValidation(v);
          throw new Error(v.issues.find((i) => i.severity === "error")?.message ?? "Validazione bloccata");
        }
        if (v?.status === "REVIEW" && !opts?.forceReview) {
          setValidation(v);
          throw new Error("REVIEW_REQUIRED");
        }
        if (opts?.forceReview && v && !captureReviewAllowsForceApply(v)) {
          throw new Error("Ricambi non trovati in magazzino: correggi o rimuovi le righe prima dell'import.");
        }
        const lavorazioneId = await runApply(applicationId, opts);
        return { ok: true, lavorazioneId, applicationId };
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Apply non riuscito";
        if (raw !== "REVIEW_REQUIRED") setError(mapCaptureApplyErrorMessage(raw));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [captureId, runApply, runDryRun, syncSchedaFields],
  );

  return {
    busy,
    error,
    validation,
    setValidation,
    lastApplicationId,
    recoveryAvailable,
    applyFromIngresso,
    applyFromScheda,
    applyAssignOnly,
    resumeApply,
    runDryRun,
    runApply,
    syncIngressoFields,
    syncSchedaFields,
    refreshCaptureRecoveryState,
  };
}
