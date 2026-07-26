"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { IconActionButton } from "@/components/design-system";
import {
  HubModalPanoramicaField,
  HubModalPanoramicaFieldGrid,
  HubModalPanoramicaSubsection,
} from "@/components/design-system/hub-modal-panoramica";
import { HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import { attrezzatureForMezzo } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { attrezzaturaMirrorsMezzo } from "@/lib/mezzi/attrezzatura-mirrors-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { attrezzatureEntry } from "@/lib/domain/attrezzature-entry";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import { dsTableActionBtnDanger, dsTableActionGlyph } from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

function AttrezzatureSectionMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-4 text-center text-sm text-[color:var(--cab-text-muted)]">
      {children}
    </p>
  );
}

function panoScalar(value: string | undefined | null): string {
  const t = value?.trim();
  if (!t || t === "—" || t === "Non assegnata") return "—";
  return t;
}

function panoNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("it-IT");
}

function attrezzaturaTitle(a: AttrezzaturaGestita): string {
  const title = [a.marca, a.modello !== "—" ? a.modello : null].filter(Boolean).join(" ");
  return title || "Attrezzatura";
}

function AttrezzaturaGestitaFields({ a }: { a: AttrezzaturaGestita }) {
  return (
    <HubModalPanoramicaFieldGrid>
      <HubModalPanoramicaField label="Tipo attrezzatura" value={panoScalar(a.tipoAttrezzatura)} />
      <HubModalPanoramicaField label="Marca" value={panoScalar(a.marca)} />
      <HubModalPanoramicaField label="Modello" value={panoScalar(a.modello)} />
      <HubModalPanoramicaField label="Matricola" value={panoScalar(a.matricola)} mono />
      {a.note?.trim() ? <HubModalPanoramicaField label="Note" value={a.note.trim()} /> : null}
    </HubModalPanoramicaFieldGrid>
  );
}

function MezzoAttrezzaturaFields({ mezzo }: { mezzo: MezzoGestito }) {
  return (
    <HubModalPanoramicaFieldGrid>
      <HubModalPanoramicaField label="Tipo attrezzatura" value={panoScalar(mezzo.tipoAttrezzatura)} />
      <HubModalPanoramicaField label="Marca" value={panoScalar(mezzo.marca)} />
      <HubModalPanoramicaField label="Modello" value={panoScalar(mezzo.modello)} />
      <HubModalPanoramicaField label="Matricola" value={panoScalar(mezzo.matricola)} mono />
      <HubModalPanoramicaField label="N. scuderia" value={panoScalar(mezzo.numeroScuderia)} mono />
      <HubModalPanoramicaField label="Ore lavoro" value={panoNumber(mezzo.oreKm)} mono />
    </HubModalPanoramicaFieldGrid>
  );
}

export function MezziHubPanoramicaAttrezzaturaSection({
  mezzo,
  mezzoId,
  canEdit,
}: {
  mezzo: MezzoGestito;
  mezzoId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<AttrezzaturaGestita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttrezzaturaGestita | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await attrezzatureEntry.listByMezzo(mezzoId);
    if (!res.success) {
      setError(res.error ?? "Errore caricamento attrezzature");
      setRows([]);
    } else {
      setRows(attrezzatureForMezzo(res.data as AttrezzaturaRow[], mezzoId));
    }
    setLoading(false);
  }, [mezzoId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const linkedRows = useMemo(
    () => rows.filter((a) => !attrezzaturaMirrorsMezzo(mezzo, a)),
    [rows, mezzo],
  );

  async function confirmRemove() {
    if (!deleteTarget) return;
    setPending(true);
    const res = await attrezzatureEntry.remove(deleteTarget.id);
    setPending(false);
    if (!res.success) {
      setError(res.error ?? "Errore eliminazione attrezzatura");
      return;
    }
    setDeleteTarget(null);
    await reload();
  }

  if (loading) return <AttrezzatureSectionMessage>Caricamento attrezzature…</AttrezzatureSectionMessage>;
  if (error) return <AttrezzatureSectionMessage>{error}</AttrezzatureSectionMessage>;

  return (
    <>
      <div className="space-y-2.5">
        <MezzoAttrezzaturaFields mezzo={mezzo} />

        {linkedRows.map((a) => (
          <HubModalPanoramicaSubsection
            key={a.id}
            nested
            title={attrezzaturaTitle(a)}
            actions={
              canEdit ? (
                <IconActionButton
                  label="Rimuovi attrezzatura"
                  tooltipForce
                  className={dsTableActionBtnDanger}
                  disabled={pending}
                  onClick={() => setDeleteTarget(a)}
                >
                  <HubIconTrash className={dsTableActionGlyph} />
                </IconActionButton>
              ) : null
            }
          >
            <AttrezzaturaGestitaFields a={a} />
          </HubModalPanoramicaSubsection>
        ))}
      </div>

      <GestionaleConfirmDialog
        open={deleteTarget != null}
        title="Rimuovere attrezzatura?"
        subtitle={deleteTarget ? attrezzaturaTitle(deleteTarget) : undefined}
        message={
          deleteTarget
            ? "L'attrezzatura verrà dissociata da questo mezzo."
            : ""
        }
        confirmLabel={pending ? "Rimozione…" : "Rimuovi"}
        destructive
        pending={pending}
        layerClassName={cabModalZConfirm}
        onCancel={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}

/** @deprecated Usare `MezziHubPanoramicaAttrezzaturaSection` in panoramica hub. */
export const MezziHubAttrezzaturePanel = MezziHubPanoramicaAttrezzaturaSection;
