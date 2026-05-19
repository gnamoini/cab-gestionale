"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleListSelect } from "@/components/gestionale/gestionale-list-select";
import { SettingsAutocompleteInput } from "@/components/gestionale/settings-autocomplete-input";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnDanger, dsInput, dsLabel } from "@/lib/ui/design-system";

export function LavorazioneEditModal({
  row,
  onClose,
  onBack,
  canDelete,
  onDelete,
}: {
  row: LavorazioneListRow;
  onClose: () => void;
  onBack?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const update = useLavorazioneUpdateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const globalOpts = useGlobalOptions({ debugTag: "LavorazioneEditModal" });
  const clientiOpts = globalOpts.mezziListe.clienti;
  const marcheOpts = useMemo(
    () => marcheFromHierarchyTree(globalOpts.mezziListe, "attrezzature"),
    [globalOpts.mezziListe],
  );
  const [cliente, setCliente] = useState(() => row.mezzo?.cliente?.trim() ?? "");
  const [utilizzatore, setUtilizzatore] = useState(() => row.mezzo?.utilizzatore?.trim() ?? "");
  const [marca, setMarca] = useState(() => row.mezzo?.marca?.trim() ?? "");
  const [modello, setModello] = useState(() => row.mezzo?.modello?.trim() ?? "");
  const modelliOpts = useMemo(
    () => modelliVisibiliPerMarcaHierarchy(globalOpts.mezziListe, "attrezzature", marca),
    [globalOpts.mezziListe, marca],
  );
  const [targa, setTarga] = useState(() => row.mezzo?.targa?.trim() ?? "");
  const [matricola, setMatricola] = useState(() => row.mezzo?.matricola?.trim() ?? "");
  const [numeroScuderia, setNumeroScuderia] = useState(() => row.mezzo?.numero_scuderia?.trim() ?? "");
  const [note, setNote] = useState(() => (row.note ?? "").trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cliente.trim() || !marca.trim() || !modello.trim() || !matricola.trim()) {
      window.alert("Cliente, marca, modello e matricola sono obbligatori.");
      return;
    }
    try {
      if (row.mezzo_id) {
        await updateMezzo.mutateAsync({
          id: row.mezzo_id,
          data: {
            cliente: cliente.trim(),
            utilizzatore: utilizzatore.trim() || null,
            marca: marca.trim(),
            modello: modello.trim(),
            targa: targa.trim() || null,
            matricola: matricola.trim(),
            numero_scuderia: numeroScuderia.trim() || null,
          },
        });
      }
      await update.mutateAsync({ id: row.id, data: { note: note.trim() || null } });
      onClose();
    } catch {
      /* mostrato sotto */
    }
  }

  return (
    <LavorazioniModalShell
      onRequestClose={onClose}
      onBack={onBack}
      title="Dettagli macchina"
      subtitle="Modifica controllata di anagrafica mezzo e note lavorazione."
    >
      <form onSubmit={onSubmit} className="flex max-h-[min(88dvh,720px)] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {update.isError || updateMezzo.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{update.error?.message ?? updateMezzo.error?.message ?? "Aggiornamento fallito."}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={dsLabel}>Cliente</span>
              <GestionaleListSelect
                className="mt-1 w-full"
                value={cliente}
                onChange={setCliente}
                options={clientiOpts}
                disabled={update.isPending || updateMezzo.isPending}
                required
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Utilizzatore</span>
              <SettingsAutocompleteInput
                className="mt-1"
                value={utilizzatore}
                onChange={setUtilizzatore}
                options={globalOpts.mezziListe.utilizzatori}
                disabled={update.isPending || updateMezzo.isPending}
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Marca attrezzatura</span>
              <GestionaleListSelect
                className="mt-1 w-full"
                value={marca}
                onChange={(v) => {
                  setMarca(v);
                  setModello("");
                }}
                options={marcheOpts}
                disabled={update.isPending || updateMezzo.isPending}
                required
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Modello attrezzatura</span>
              <GestionaleListSelect
                className="mt-1 w-full"
                value={modello}
                onChange={setModello}
                options={modelliOpts}
                disabled={update.isPending || updateMezzo.isPending || !marca.trim()}
                required
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Targa</span>
              <input className={`${dsInput} mt-1 w-full`} value={targa} onChange={(e) => setTarga(e.target.value)} disabled={update.isPending || updateMezzo.isPending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Matricola</span>
              <input className={`${dsInput} mt-1 w-full`} value={matricola} onChange={(e) => setMatricola(e.target.value)} disabled={update.isPending || updateMezzo.isPending} required />
            </label>
            <label className="block sm:col-span-2">
              <span className={dsLabel}>N. scuderia</span>
              <input className={`${dsInput} mt-1 w-full`} value={numeroScuderia} onChange={(e) => setNumeroScuderia(e.target.value)} disabled={update.isPending || updateMezzo.isPending} />
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <textarea className={`${dsInput} mt-1 min-h-[100px] w-full resize-y`} value={note} onChange={(e) => setNote(e.target.value)} disabled={update.isPending || updateMezzo.isPending} rows={4} />
          </label>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={update.isPending || updateMezzo.isPending}>
            Annulla
          </button>
          <button type="submit" className={erpBtnAccent} disabled={update.isPending || updateMezzo.isPending}>
            {update.isPending || updateMezzo.isPending ? "Salvataggio…" : "Salva"}
          </button>
          {canDelete && onDelete ? (
            <button
              type="button"
              className={`${dsBtnDanger} basis-full sm:basis-auto`}
              disabled={update.isPending || updateMezzo.isPending}
              onClick={() => {
                if (!window.confirm("Eliminare questa lavorazione? L'azione non è reversibile se il record viene rimosso definitivamente.")) return;
                onDelete();
              }}
            >
              Elimina
            </button>
          ) : null}
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
