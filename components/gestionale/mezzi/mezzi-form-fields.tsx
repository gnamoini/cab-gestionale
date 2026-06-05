"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input";
import { modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import { mezzoFormToMeta, metaToMezzoFormFields } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { dsInput } from "@/lib/ui/design-system";
import { LoadingFormSkeleton } from "@/components/design-system";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { EntitySimilarWarning } from "@/components/design-system/entity-similar-warning";
import { findMezzoBySimilarIdent } from "@/lib/validation/services/mezzi-validation";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";

export type MezzoFormState = ReturnType<typeof getEmptyMezzoForm>;

export function getEmptyMezzoForm() {
  return {
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marca: "",
    modello: "",
    matricola: "",
    numeroScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: "",
    km: "",
    anno: "",
  };
}

export function gestitoToMezzoForm(m: MezzoGestito): MezzoFormState {
  const metaFields = metaToMezzoFormFields({
    cantiere: m.cantiere,
    tipoTelaio: m.tipoTelaio,
    marcaTelaio: m.marcaTelaio,
    modelloTelaio: m.modelloTelaio,
    oreLavoro: m.oreKm,
    km: m.km,
  });
  return {
    cliente: m.cliente.trim(),
    utilizzatore: m.utilizzatore === "—" ? "" : m.utilizzatore.trim(),
    marca: m.marca.trim(),
    modello: m.modello === "—" ? "" : m.modello.trim(),
    targa: m.targa === "—" ? "" : m.targa.trim(),
    matricola: m.matricola === "Non assegnata" || m.matricola === "—" ? "" : m.matricola.trim(),
    numeroScuderia: (m.numeroScuderia ?? "").trim(),
    tipoAttrezzatura: m.tipoAttrezzatura === "—" ? "" : m.tipoAttrezzatura.trim(),
    anno: m.anno != null ? String(m.anno) : "",
    ...metaFields,
  };
}

export function formToMezzoInsert(f: MezzoFormState): MezzoInsert {
  const annoParsed = parseInt(f.anno, 10);
  const anno = Math.max(1980, Math.min(2035, Number.isFinite(annoParsed) ? annoParsed : new Date().getFullYear()));
  return {
    cliente: f.cliente.trim(),
    utilizzatore: f.utilizzatore.trim() || null,
    marca: f.marca.trim(),
    modello: f.modello.trim() || "—",
    targa: f.targa.trim() || null,
    matricola: f.matricola.trim() || null,
    numero_scuderia: f.numeroScuderia.trim() || null,
    tipo_attrezzatura: f.tipoAttrezzatura.trim() || null,
    anno,
    meta: mezzoFormToMeta(f) as Record<string, unknown>,
  };
}

export function formToMezzoUpdate(f: MezzoFormState): MezzoUpdate {
  return formToMezzoInsert(f);
}

function sortedUniqueStrings(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

function MezzoFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }}
      className="space-y-2 border-b border-zinc-100 pb-3 last:border-b-0 dark:border-zinc-800"
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function MezzoFormFields({
  form,
  setForm,
  excludeMezzoId,
}: {
  form: MezzoFormState;
  setForm: Dispatch<SetStateAction<MezzoFormState>>;
  excludeMezzoId?: string;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "MezzoFormFields" });
  const mezziListQ = useMezziListQuery();
  const liste = globalOpts.mezziListe;

  const modelliAtt = useMemo(() => {
    if (!liste || !form.marca.trim()) return [] as string[];
    return modelliVisibiliPerMarca(liste, form.marca.trim());
  }, [liste, form.marca]);

  const modelliTelaio = useMemo(() => {
    if (!liste || !form.marcaTelaio.trim()) return [] as string[];
    return modelliVisibiliPerMarcaHierarchy(liste, "telai", form.marcaTelaio.trim());
  }, [liste, form.marcaTelaio]);

  useEffect(() => {
    if (!form.marca.trim() && form.modello.trim()) setForm((f) => ({ ...f, modello: "" }));
  }, [form.marca, form.modello, setForm]);

  useEffect(() => {
    if (!form.marcaTelaio.trim() && form.modelloTelaio.trim()) setForm((f) => ({ ...f, modelloTelaio: "" }));
  }, [form.marcaTelaio, form.modelloTelaio, setForm]);

  const listSelectWrapClass = "mt-1 w-full";

  const similarMezzoIdent = useMemo(() => {
    const rows = mezziListQ.data ?? [];
    const hit = findMezzoBySimilarIdent(rows, form.targa, form.matricola, excludeMezzoId);
    if (!hit) return null;
    const ident = hit.targa?.trim() || hit.matricola?.trim() || hit.id;
    return `${ident} (${hit.cliente} — ${hit.marca} ${hit.modello})`.trim();
  }, [mezziListQ.data, form.targa, form.matricola, excludeMezzoId]);

  if (globalOpts.isLoading) {
    return <LoadingFormSkeleton fields={3} className="py-2" />;
  }

  return (
    <>
      <MezzoFormSection title="Cliente">
        <label htmlFor="mezzo-form-cliente" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Cliente *
          <GlobalSettingsListSelect
            id="mezzo-form-cliente"
            listKey="mezzi:clienti"
            className={listSelectWrapClass}
            value={form.cliente}
            onChange={(v) => setForm((f) => ({ ...f, cliente: v }))}
            required
            aria-label="Cliente"
          />
        </label>
        <label htmlFor="mezzo-form-cantiere" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Cantiere
          <GlobalSettingsListSelect
            id="mezzo-form-cantiere"
            listKey="mezzi:cantieri"
            className="mt-1"
            value={form.cantiere}
            onChange={(v) => setForm((f) => ({ ...f, cantiere: v }))}
            aria-label="Cantiere"
          />
        </label>
        <label htmlFor="mezzo-form-utilizzatore" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Utilizzatore
          <GlobalSettingsListSelect
            id="mezzo-form-utilizzatore"
            listKey="mezzi:utilizzatori"
            className="mt-1"
            value={form.utilizzatore}
            onChange={(v) => setForm((f) => ({ ...f, utilizzatore: v }))}
            aria-label="Utilizzatore"
          />
        </label>
      </MezzoFormSection>

      <MezzoFormSection title="Attrezzatura">
        <label htmlFor="mezzo-form-tipo-attrezzatura" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tipo attrezzatura
          <GlobalSettingsListSelect
            id="mezzo-form-tipo-attrezzatura"
            listKey="mezzi:tipiAttrezzatura"
            className="mt-1"
            value={form.tipoAttrezzatura}
            onChange={(v) => setForm((f) => ({ ...f, tipoAttrezzatura: v }))}
            aria-label="Tipo attrezzatura"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Marca *
            <GlobalHierarchyMarcaSelect
              tree="attrezzature"
              className={listSelectWrapClass}
              value={form.marca}
              onChange={(marca) => setForm((f) => ({ ...f, marca, modello: "" }))}
              required
              aria-label="Marca attrezzatura"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Modello
            <GlobalHierarchyModelloSelect
              tree="attrezzature"
              marcaNome={form.marca}
              className={listSelectWrapClass}
              value={form.modello}
              onChange={(modello) => setForm((f) => ({ ...f, modello }))}
              aria-label="Modello attrezzatura"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label htmlFor="mezzo-form-matricola" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Matricola
            <input
              id="mezzo-form-matricola"
              value={form.matricola}
              onChange={(e) => setForm((f) => ({ ...f, matricola: e.target.value }))}
              className={`${dsInput} mt-1 font-mono`}
            />
          </label>
          <label htmlFor="mezzo-form-numero-scuderia" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            N. scuderia
            <input
              id="mezzo-form-numero-scuderia"
              value={form.numeroScuderia}
              onChange={(e) => setForm((f) => ({ ...f, numeroScuderia: e.target.value }))}
              className={`${dsInput} mt-1 font-mono`}
            />
          </label>
        </div>
        <EntitySimilarWarning similarTo={similarMezzoIdent} />
        <label htmlFor="mezzo-form-ore-lavoro" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Ore lavoro
          <input
            id="mezzo-form-ore-lavoro"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={form.oreLavoro}
            onChange={(e) => setForm((f) => ({ ...f, oreLavoro: e.target.value }))}
            className={`${dsInput} mt-1`}
          />
        </label>
      </MezzoFormSection>

      <MezzoFormSection title="Telaio">
        <label htmlFor="mezzo-form-tipo-telaio" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tipo telaio
          <GlobalSettingsListSelect
            id="mezzo-form-tipo-telaio"
            listKey="mezzi:tipiTelaio"
            className="mt-1"
            value={form.tipoTelaio}
            onChange={(v) => setForm((f) => ({ ...f, tipoTelaio: v }))}
            aria-label="Tipo telaio"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Marca
            <GlobalHierarchyMarcaSelect
              tree="telai"
              className={listSelectWrapClass}
              value={form.marcaTelaio}
              onChange={(v) => setForm((f) => ({ ...f, marcaTelaio: v, modelloTelaio: "" }))}
              aria-label="Marca telaio"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Modello
            <GlobalHierarchyModelloSelect
              tree="telai"
              marcaNome={form.marcaTelaio}
              className={listSelectWrapClass}
              value={form.modelloTelaio}
              onChange={(v) => setForm((f) => ({ ...f, modelloTelaio: v }))}
              aria-label="Modello telaio"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label htmlFor="mezzo-form-targa" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Targa
            <input
              id="mezzo-form-targa"
              value={form.targa}
              onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value }))}
              className={`${dsInput} mt-1 font-mono`}
            />
          </label>
          <label htmlFor="mezzo-form-km" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            KM
            <input
              id="mezzo-form-km"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.km}
              onChange={(e) => setForm((f) => ({ ...f, km: e.target.value }))}
              className={`${dsInput} mt-1`}
            />
          </label>
        </div>
      </MezzoFormSection>
    </>
  );
}
