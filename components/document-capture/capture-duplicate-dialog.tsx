"use client";

import { useCallback, useEffect, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LoadingSpinner } from "@/components/design-system/loading";

export type CaptureDuplicateContext = {
  duplicateCaptureId: string;
  targa?: string;
  matricola?: string;
  lavorazioneId?: string | null;
  lavorazioneCodice?: string | null;
  dataIngresso?: string | null;
};

type Props = {
  open: boolean;
  duplicateCaptureId: string | null;
  onOpenExisting: (ctx: CaptureDuplicateContext) => void;
  onAttach: (ctx: CaptureDuplicateContext) => void;
  onForceNew: (ctx: CaptureDuplicateContext, reason: string) => void;
  onCancel: () => void;
};

async function loadDuplicateContext(duplicateCaptureId: string): Promise<CaptureDuplicateContext> {
  const res = await fetch(`/api/document-capture/${duplicateCaptureId}`);
  if (!res.ok) throw new Error("Impossibile caricare il documento esistente");
  const body = (await res.json()) as {
    capture?: {
      id: string;
      lavorazione_id?: string | null;
    };
  };
  const capture = body.capture;
  const fieldsRes = await fetch(`/api/document-capture/${duplicateCaptureId}/fields`);
  const fieldsBody = fieldsRes.ok
    ? ((await fieldsRes.json()) as {
        fields?: Array<{ field_key: string; confirmed_value?: string | null; normalized_value?: string | null }>;
      })
    : { fields: [] };

  const pick = (key: string) => {
    const row = (fieldsBody.fields ?? []).find((f) => f.field_key === key);
    return (row?.confirmed_value ?? row?.normalized_value ?? "").trim() || undefined;
  };

  return {
    duplicateCaptureId,
    targa: pick("targa"),
    matricola: pick("attrezzatura_matricola") ?? pick("matricola"),
    lavorazioneId: capture?.lavorazione_id ?? null,
    dataIngresso: pick("data_ingresso"),
  };
}

export function CaptureDuplicateDialog({
  open,
  duplicateCaptureId,
  onOpenExisting,
  onAttach,
  onForceNew,
  onCancel,
}: Props) {
  const [ctx, setCtx] = useState<CaptureDuplicateContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open || !duplicateCaptureId) {
      setCtx(null);
      setForceOpen(false);
      setReason("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadDuplicateContext(duplicateCaptureId)
      .then((c) => {
        if (!cancelled) setCtx(c);
      })
      .catch(() => {
        if (!cancelled) setCtx({ duplicateCaptureId });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [duplicateCaptureId, open]);

  const handleForceConfirm = useCallback(() => {
    if (!ctx || reason.trim().length < 8) return;
    onForceNew(ctx, reason.trim());
    setForceOpen(false);
  }, [ctx, onForceNew, reason]);

  if (!open) return null;

  if (forceOpen && ctx) {
    return (
      <GestionaleConfirmDialog
        open
        title="Nuova lavorazione comunque"
        subtitle="Motivazione obbligatoria"
        message={
          <div className="space-y-3 text-sm">
            <p>Spiega perché serve una nuova lavorazione nonostante il documento duplicato.</p>
            <GestionaleTextarea
              className="min-h-[5rem] w-full rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-sm"
              value={reason}
              onChange={setReason}
              placeholder="Es. secondo intervento sullo stesso mezzo in data diversa…"
              minLength={8}
            />
          </div>
        }
        confirmLabel="Procedi"
        cancelLabel="Indietro"
        confirmDisabled={reason.trim().length < 8}
        layerClassName="z-[125]"
        onCancel={() => setForceOpen(false)}
        onConfirm={handleForceConfirm}
      />
    );
  }

  const body = loading ? (
    <div className="flex items-center gap-2 py-4">
      <LoadingSpinner size="sm" />
      <span className="text-sm">Caricamento dati documento esistente…</span>
    </div>
  ) : (
    <div className="space-y-3 text-sm">
      <p>Questo file è già presente in archivio acquisizioni.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {ctx?.targa ? (
          <>
            <dt className="text-[color:var(--cab-muted-fg)]">Targa</dt>
            <dd>{ctx.targa}</dd>
          </>
        ) : null}
        {ctx?.matricola ? (
          <>
            <dt className="text-[color:var(--cab-muted-fg)]">Matricola</dt>
            <dd>{ctx.matricola}</dd>
          </>
        ) : null}
        {ctx?.lavorazioneId ? (
          <>
            <dt className="text-[color:var(--cab-muted-fg)]">Lavorazione</dt>
            <dd>{ctx.lavorazioneCodice ?? ctx.lavorazioneId}</dd>
          </>
        ) : null}
        {ctx?.dataIngresso ? (
          <>
            <dt className="text-[color:var(--cab-muted-fg)]">Data</dt>
            <dd>{ctx.dataIngresso}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );

  return (
    <GestionaleConfirmDialog
      open
      title="Documento già acquisito"
      subtitle="Duplicato rilevato"
      message={body}
      cancelLabel="Annulla"
      layerClassName="z-[125]"
      footer={
        !loading && ctx ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="erp-btn erp-btn-ghost min-h-10" onClick={onCancel}>
              Annulla
            </button>
            <button
              type="button"
              className="erp-btn erp-btn-secondary min-h-10"
              onClick={() => onAttach(ctx)}
            >
              Associa documento
            </button>
            <button
              type="button"
              className="erp-btn erp-btn-primary min-h-10"
              disabled={!ctx.lavorazioneId}
              onClick={() => onOpenExisting(ctx)}
            >
              Apri esistente
            </button>
            <button
              type="button"
              className="erp-btn erp-btn-ghost min-h-10 text-[color:var(--cab-danger)]"
              onClick={() => setForceOpen(true)}
            >
              Nuova lavorazione comunque
            </button>
          </div>
        ) : undefined
      }
      onCancel={onCancel}
      onConfirm={() => {}}
    />
  );
}
