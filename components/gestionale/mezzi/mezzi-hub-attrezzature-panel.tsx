"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import { attrezzatureForMezzo } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { attrezzatureService } from "@/src/services/attrezzature.service";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import { MezziHubList, MezziHubListItem, MezziHubListMeta, MezziHubListTitle, MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { dsInput } from "@/lib/ui/design-system";
import { LoadingButton } from "@/components/design-system";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";

export function MezziHubAttrezzaturePanel({
  mezzoId,
  canEdit,
}: {
  mezzoId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<AttrezzaturaGestita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marca, setMarca] = useState("");
  const [modello, setModello] = useState("");
  const [matricola, setMatricola] = useState("");
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await attrezzatureService.listByMezzo(mezzoId);
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

  async function handleCreate() {
    if (!marca.trim()) return;
    setPending(true);
    const res = await attrezzatureService.create({
      mezzo_id: mezzoId,
      marca: marca.trim(),
      modello: modello.trim(),
      matricola: matricola.trim() || null,
      tipo_attrezzatura: null,
      portata: null,
      anno: null,
      note: null,
    });
    setPending(false);
    if (!res.success) {
      setError(res.error ?? "Errore creazione attrezzatura");
      return;
    }
    setMarca("");
    setModello("");
    setMatricola("");
    await reload();
  }

  async function handleRemove(id: string) {
    setPending(true);
    const res = await attrezzatureService.remove(id);
    setPending(false);
    if (!res.success) {
      setError(res.error ?? "Errore eliminazione attrezzatura");
      return;
    }
    await reload();
  }

  if (loading) return <MezziHubTabEmpty message="Caricamento attrezzature…" />;
  if (error) return <MezziHubTabEmpty message={error} />;

  return (
    <div className="space-y-3">
      {canEdit ? (
        <div className="grid gap-2 rounded-lg border border-[var(--cab-border)] p-3 sm:grid-cols-4">
          <input
            className={dsInput}
            placeholder="Marca"
            value={marca}
            maxLength={TEXT_SHORT}
            disabled={pending}
            onChange={(e) => setMarca(sliceInputValue(e.target.value, TEXT_SHORT))}
          />
          <input
            className={dsInput}
            placeholder="Modello"
            value={modello}
            maxLength={TEXT_SHORT}
            disabled={pending}
            onChange={(e) => setModello(sliceInputValue(e.target.value, TEXT_SHORT))}
          />
          <input
            className={dsInput}
            placeholder="Matricola"
            value={matricola}
            maxLength={TEXT_SHORT}
            disabled={pending}
            onChange={(e) => setMatricola(sliceInputValue(e.target.value, TEXT_SHORT))}
          />
          <LoadingButton type="button" loading={pending} disabled={!marca.trim()} onClick={() => void handleCreate()}>
            Aggiungi
          </LoadingButton>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <MezziHubTabEmpty message="Nessuna attrezzatura installata su questo mezzo." />
      ) : (
        <MezziHubList>
          {rows.map((a) => (
            <MezziHubListItem
              key={a.id}
              actions={
                canEdit ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline"
                    disabled={pending}
                    onClick={() => void handleRemove(a.id)}
                  >
                    Elimina
                  </button>
                ) : null
              }
            >
              <MezziHubListTitle>
                {[a.marca, a.modello].filter(Boolean).join(" ")}
              </MezziHubListTitle>
              <MezziHubListMeta>
                {[a.tipoAttrezzatura !== "—" ? a.tipoAttrezzatura : null, a.matricola !== "Non assegnata" ? a.matricola : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </MezziHubListMeta>
            </MezziHubListItem>
          ))}
        </MezziHubList>
      )}
    </div>
  );
}
