"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SchedaMezzoLinkConfirmDialog } from "@/components/lavorazioni/schede/scheda-mezzo-link-confirm-dialog";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import {
  collectMezzoCandidates,
  scoreIngressoMezzoCandidates,
  type IngressoMezzoMatchResult,
  type IngressoMezzoScoredCandidate,
  type MatchConfidence,
  type MezzoLinkOrigin,
  type SchedaIngressoMezzoLinkMeta,
} from "@/lib/schede/scheda-ingresso-mezzo-match";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoMezzoLinkGateResult = {
  preferredMezzoId: string | null;
  linkOrigin: MezzoLinkOrigin;
  mezzoLinkMeta: SchedaIngressoMezzoLinkMeta;
};

type PendingGate = {
  mode: "confirm" | "pick";
  match: IngressoMezzoMatchResult;
  confidence: MatchConfidence;
  candidate?: MezzoGestito;
  candidates: IngressoMezzoScoredCandidate[];
};

function buildMezzoLinkMeta(
  origin: MezzoLinkOrigin,
  mezzoId: string | null,
  match: IngressoMezzoMatchResult | null,
  confirmed: boolean,
): SchedaIngressoMezzoLinkMeta {
  const reason =
    match?.status === "needs_confirm"
      ? match.reason
      : match?.status === "ambiguous"
        ? match.reason
        : undefined;
  const candidateIds =
    match?.status === "needs_confirm" || match?.status === "ambiguous"
      ? match.candidates.map((c) => c.mezzo.id)
      : undefined;
  return {
    origin,
    confirmed,
    mezzoId,
    candidateIds,
    resolvedAt: new Date().toISOString(),
    reason,
  };
}

export function useSchedaIngressoMezzoLinkGate({
  mezziCatalog,
  preferredMezzoId,
  linkedOrigin,
}: {
  mezziCatalog: readonly MezzoGestito[];
  preferredMezzoId?: string | null;
  linkedOrigin?: MezzoLinkOrigin | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<PendingGate | null>(null);
  const resolverRef = useRef<((result: SchedaIngressoMezzoLinkGateResult | null) => void) | null>(null);

  const finish = useCallback((result: SchedaIngressoMezzoLinkGateResult | null) => {
    setDialogOpen(false);
    setPending(null);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(result);
  }, []);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        finish(null);
      }
    };
  }, [finish]);

  const gateMezzoLink = useCallback(
    (fields: SchedaIngressoFields): Promise<SchedaIngressoMezzoLinkGateResult> => {
      return new Promise((resolve, reject) => {
        if (resolverRef.current) {
          reject(new Error("MEZZO_LINK_GATE_IN_PROGRESS"));
          return;
        }

        resolverRef.current = (result) => {
          if (result === null) reject(new Error("MEZZO_LINK_CANCELLED"));
          else resolve(result);
        };

        if (
          preferredMezzoId?.trim() &&
          (linkedOrigin === "selected_by_user" || linkedOrigin === "auto_confirmed")
        ) {
          const id = preferredMezzoId.trim();
          finish({
            preferredMezzoId: id,
            linkOrigin: linkedOrigin ?? "selected_by_user",
            mezzoLinkMeta: buildMezzoLinkMeta(linkedOrigin ?? "selected_by_user", id, null, true),
          });
          return;
        }

        const candidates = collectMezzoCandidates({ scheda: fields, catalog: mezziCatalog });
        const match = scoreIngressoMezzoCandidates({ scheda: fields, candidates });

        if (match.status === "not_found") {
          finish({
            preferredMezzoId: null,
            linkOrigin: "created_new",
            mezzoLinkMeta: buildMezzoLinkMeta("created_new", null, match, false),
          });
          return;
        }

        if (match.status === "ambiguous") {
          setPending({
            mode: "pick",
            match,
            confidence: match.reason?.confidence ?? "ambiguous",
            candidates: match.candidates,
          });
          setDialogOpen(true);
          logInterventoTelemetry("intervento_create_started", {
            extra: { mezzoLinkGate: "ambiguous" },
          });
          return;
        }

        setPending({
          mode: "confirm",
          match,
          confidence: match.reason.confidence,
          candidate: match.candidate.mezzo,
          candidates: match.candidates,
        });
        setDialogOpen(true);
        logInterventoTelemetry("intervento_create_started", {
          extra: { mezzoLinkGate: "needs_confirm", confidence: match.reason.confidence },
        });
      });
    },
    [finish, linkedOrigin, mezziCatalog, preferredMezzoId],
  );

  const handleLinkExisting = useCallback(() => {
    if (!pending || pending.mode !== "confirm" || !pending.candidate) return;
    const mezzoId = pending.candidate.id;
    finish({
      preferredMezzoId: mezzoId,
      linkOrigin: "auto_confirmed",
      mezzoLinkMeta: buildMezzoLinkMeta("auto_confirmed", mezzoId, pending.match, true),
    });
    logInterventoTelemetry("intervento_create_completed", {
      extra: { mezzoLinkOrigin: "auto_confirmed", mezzoId },
    });
  }, [finish, pending]);

  const handleCreateNew = useCallback(() => {
    finish({
      preferredMezzoId: null,
      linkOrigin: "created_new",
      mezzoLinkMeta: buildMezzoLinkMeta(
        "created_new",
        null,
        pending?.match ?? null,
        false,
      ),
    });
    logInterventoTelemetry("intervento_create_completed", {
      extra: { mezzoLinkOrigin: "created_new" },
    });
  }, [finish, pending]);

  const handleSelectCandidate = useCallback(
    (mezzo: MezzoGestito) => {
      finish({
        preferredMezzoId: mezzo.id,
        linkOrigin: "auto_confirmed",
        mezzoLinkMeta: buildMezzoLinkMeta("auto_confirmed", mezzo.id, pending?.match ?? null, true),
      });
      logInterventoTelemetry("intervento_create_completed", {
        extra: { mezzoLinkOrigin: "auto_confirmed", mezzoId: mezzo.id },
      });
    },
    [finish, pending],
  );

  const handleCancel = useCallback(() => {
    finish(null);
  }, [finish]);

  const dialog = (
    <SchedaMezzoLinkConfirmDialog
      open={dialogOpen}
      mode={pending?.mode ?? "confirm"}
      confidence={pending?.confidence ?? "ambiguous"}
      candidate={pending?.candidate}
      candidates={pending?.candidates}
      onLinkExisting={pending?.mode === "confirm" ? handleLinkExisting : undefined}
      onCreateNew={handleCreateNew}
      onSelectCandidate={pending?.mode === "pick" ? handleSelectCandidate : undefined}
      onCancel={handleCancel}
    />
  );

  return { gateMezzoLink, dialog };
}
