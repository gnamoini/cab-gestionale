"use client";

import Link from "next/link";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { dsTableActionTextBtnPrimary } from "@/lib/ui/design-system";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";

export function MezzoMeteringOriginLink({
  lavorazioneId,
  origine = "attiva",
  onNavigate,
}: {
  lavorazioneId?: string | null;
  origine?: PreventivoLavorazioneOrigine;
  onNavigate?: () => void;
}) {
  const id = lavorazioneId?.trim() ?? "";
  if (!id) return null;

  return (
    <p className="text-xs text-[color:var(--cab-text-muted)]">
      Origine ultimo aggiornamento:{" "}
      <Link
        href={buildPreventiviLavorazioneFocusHref(id, origine)}
        className={dsTableActionTextBtnPrimary}
        onClick={onNavigate}
      >
        Apri scheda ingresso
      </Link>
    </p>
  );
}
