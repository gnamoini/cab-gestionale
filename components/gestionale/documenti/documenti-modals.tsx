"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import { defaultApplicabilitaForCategoria } from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoGestionale, DocumentoTipoFile, DocumentoApplicabilita } from "@/lib/types/gestionale";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { CloseButton } from "@/components/design-system";
import { GlobalHierarchyMarcaSelect, GlobalHierarchyModelloSelect } from "@/components/gestionale/global-input";
import { DocumentoFileDropzone } from "@/components/gestionale/documenti/documento-file-dropzone";
import { useAuth } from "@/context/auth-context";
import {
  documentoSenzaMarca,
  extractFileExtension,
  formatDocumentoRigaSintetica,
  getDocumentApriHref,
  inferTipoFileFromNome,
  labelCategoria,
  labelTipoFile,
  resolveDocumentoApplicazione,
} from "@/components/gestionale/documenti/documenti-helpers";

function documentoSenzaMarcaUi(doc: DocumentoGestionale): boolean {
  return documentoSenzaMarca(doc);
}

const inputClass =
  "w-full rounded-lg border border-zinc-600/90 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 shadow-md shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/75 focus:ring-2 focus:ring-orange-400/30";

const listSelectWrapClass = "mt-1 w-full";

const CATEGORIE: DocumentoGestionale["categoria"][] = ["listini", "cataloghi", "manuali", "altro"];
const TIPI_FILE: DocumentoTipoFile[] = ["pdf", "immagine", "excel", "word", "testo", "altro"];

function sameTextNorm(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function DocumentiModalShell({
  title,
  children,
  onRequestClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onRequestClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const sb = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevOverflow = document.body.style.overflow;
    const prevPr = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPr;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  const widthClass = wide ? "max-w-lg" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onRequestClose();
        }
      }}
    >
      <div
        className={`relative z-[1] flex max-h-[min(92dvh,880px)] w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${widthClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="documenti-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 id="documenti-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <CloseButton onClick={onRequestClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1 text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function previewNomeFile(nome: string, applicabilita: DocumentoApplicabilita, marca: string, modello: string) {
  const cat = nome.trim() || "documento";
  const m = marca.trim() || "—";
  if (applicabilita === "marca") return `${cat} · ${m} (tutta la marca)`;
  const mod = modello.trim() || "—";
  return `${cat} · ${m} ${mod}`;
}

function ApplicabilitaField({
  applicabilita,
  onChange,
}: {
  applicabilita: DocumentoApplicabilita;
  onChange: (a: DocumentoApplicabilita) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Applicabilità</legend>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/50 px-3 py-2.5 has-[:checked]:border-orange-500/60 has-[:checked]:bg-orange-500/5">
        <input
          type="radio"
          name="doc-applicabilita"
          className="accent-orange-500"
          checked={applicabilita === "marca"}
          onChange={() => onChange("marca")}
        />
        <span className="text-sm text-zinc-200">Tutta la marca</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/50 px-3 py-2.5 has-[:checked]:border-orange-500/60 has-[:checked]:bg-orange-500/5">
        <input
          type="radio"
          name="doc-applicabilita"
          className="accent-orange-500"
          checked={applicabilita === "modello"}
          onChange={() => onChange("modello")}
        />
        <span className="text-sm text-zinc-200">Modello specifico</span>
      </label>
    </fieldset>
  );
}

export function UploadDocumentoModal({
  catalog,
  onRequestClose,
  onSubmit,
}: {
  catalog: CatalogMarca[];
  onRequestClose: () => void;
  onSubmit: (payload: Omit<DocumentoGestionale, "id">) => void;
}) {
  const { authorName } = useAuth();
  const pickedFileRef = useRef<File | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<DocumentoGestionale["categoria"]>("manuali");
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(() => defaultApplicabilitaForCategoria("manuali"));
  const [marca, setMarca] = useState("");
  const [modello, setModello] = useState("");
  const [note, setNote] = useState("");
  const [pickedName, setPickedName] = useState<string>("");
  const [pickedSizeKb, setPickedSizeKb] = useState<number>(0);
  const [marcaInvalid, setMarcaInvalid] = useState(false);
  const [modelloInvalid, setModelloInvalid] = useState(false);

  const marcheOptions = useMemo(() => catalog.map((m) => m.nome), [catalog]);
  const modelliOptions = useMemo(() => {
    const mar = catalog.find((m) => sameTextNorm(m.nome, marca));
    return mar?.macchine.map((x) => x.nome) ?? [];
  }, [catalog, marca]);

  useEffect(() => {
    setApplicabilita(defaultApplicabilitaForCategoria(categoria));
  }, [categoria]);

  useEffect(() => {
    if (applicabilita === "marca") setModello("");
  }, [applicabilita]);

  function onFileChange(f: File | null) {
    pickedFileRef.current = f;
    if (!f) {
      setPickedName("");
      setPickedSizeKb(0);
      return;
    }
    setPickedName(f.name);
    setPickedSizeKb(Math.max(1, Math.round(f.size / 1024)));
    if (!nome.trim()) setNome(f.name);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    const file = pickedFileRef.current;
    const marcaTrim = marca.trim();
    const marcaOk =
      marcaTrim.length === 0 || marcheOptions.some((o) => sameTextNorm(o, marcaTrim));
    const modelloOk =
      applicabilita === "marca" ||
      marcaTrim.length === 0 ||
      (modello.trim().length > 0 && modelliOptions.some((o) => sameTextNorm(o, modello)));
    setMarcaInvalid(!marcaOk);
    setModelloInvalid(applicabilita === "modello" && marcaTrim.length > 0 && !modelloOk);
    if (!n || !file || !marcaOk || !modelloOk) return;

    const tipo = inferTipoFileFromNome(n);
    const today = new Date().toISOString().slice(0, 10);
    const urlBlob = URL.createObjectURL(file);
    const ext = extractFileExtension(file.name);
    pickedFileRef.current = null;

    const base: Omit<DocumentoGestionale, "id"> = {
      nome: n,
      categoria,
      marca: marcaTrim,
      macchina: applicabilita === "marca" || !marcaTrim ? "—" : modello.trim(),
      tipoFile: tipo,
      autoreCaricamento: authorName,
      note: note.trim() || undefined,
      caricatoIl: today,
      ultimaModifica: today,
      dimensioneKb: Math.max(1, Math.round(file.size / 1024)),
      urlBlob,
      fileEstensione: ext || undefined,
      applicabilita: marcaTrim ? applicabilita : undefined,
      marcaKey: marcaTrim || undefined,
      modelloKey: marcaTrim && applicabilita === "modello" ? modello.trim() : undefined,
      associazioni: undefined,
    };
    const tmp = { ...base, id: "__new__" } as DocumentoGestionale;
    const resolved = resolveDocumentoApplicazione(tmp);
    const { id: _drop, ...payload } = resolved;
    onSubmit(payload as Omit<DocumentoGestionale, "id">);
    onRequestClose();
  }

  const canSubmit =
    pickedName.trim().length > 0 &&
    (applicabilita === "marca" || !marca.trim() || modello.trim().length > 0);

  return (
    <DocumentiModalShell title="Carica documento" onRequestClose={onRequestClose} wide>
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="lavorazioni-scroll-scope min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          <DocumentoFileDropzone pickedName={pickedName} pickedSizeKb={pickedSizeKb} onFileChange={onFileChange} />

          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input className={`${inputClass} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <GlobalSelect
              className={listSelectWrapClass}
              items={CATEGORIE.map((c) => ({ value: c, label: labelCategoria(c) }))}
              value={categoria}
              onChange={(v) => setCategoria(v as DocumentoGestionale["categoria"])}
              strictFromList
              aria-label="Tipo documento"
            />
          </label>

          <ApplicabilitaField applicabilita={applicabilita} onChange={setApplicabilita} />

          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
            <GlobalHierarchyMarcaSelect
              className={listSelectWrapClass}
              tree="attrezzature"
              value={marca}
              onChange={(v) => {
                setMarca(v);
                setModello("");
              }}
              aria-label="Marca documento"
            />
          </label>
          {applicabilita === "modello" ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Modello
              <GlobalHierarchyModelloSelect
                className={listSelectWrapClass}
                tree="attrezzature"
                marcaNome={marca}
                value={modello}
                onChange={setModello}
                required
                aria-label="Modello documento"
              />
            </label>
          ) : null}

          <p className="rounded-lg border border-zinc-700/50 bg-zinc-950/30 px-3 py-2 text-[11px] text-zinc-400">
            Anteprima:{" "}
            <span className="font-medium text-zinc-200">
              {previewNomeFile(nome || pickedName || "file", applicabilita, marca, modello)}
            </span>
          </p>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note (facoltative)
            <textarea className={`${inputClass} mt-1 min-h-[72px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full min-h-11`} disabled={!canSubmit}>
            Conferma caricamento
          </button>
        </div>
      </form>
    </DocumentiModalShell>
  );
}

export function DocumentoInfoModal({
  doc,
  onRequestClose,
  onEdit,
}: {
  doc: DocumentoGestionale;
  onRequestClose: () => void;
  onEdit: () => void;
}) {
  const r = resolveDocumentoApplicazione(doc);
  const openHref = getDocumentApriHref(doc);
  const entita = documentoSenzaMarcaUi(doc)
    ? "— (assegna marca dalla modifica)"
    : r.applicabilita === "marca"
      ? `${r.marcaKey ?? r.marca} (tutta la marca)`
      : `${r.marcaKey ?? r.marca} · ${r.modelloKey ?? r.macchina}`;

  return (
    <DocumentiModalShell title="Dettaglio documento" onRequestClose={onRequestClose} wide>
      <div className="lavorazioni-scroll-scope flex max-h-[min(80dvh,640px)] flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm">
          <InfoRow label="Riepilogo" value={<span className="font-semibold">{formatDocumentoRigaSintetica(doc)}</span>} />
          <InfoRow label="Nome file" value={doc.nome} />
          <InfoRow
            label="Apri file"
            value={
              openHref ? (
                <a
                  href={openHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-orange-600 underline decoration-orange-400/50 underline-offset-2 hover:text-orange-700"
                >
                  Apri in nuova scheda
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoRow label="Tipo file" value={labelTipoFile(doc.tipoFile)} />
          <InfoRow label="Tipo documento" value={labelCategoria(doc.categoria)} />
          <InfoRow
            label="Applicabilità"
            value={
              documentoSenzaMarcaUi(doc)
                ? "—"
                : r.applicabilita === "marca"
                  ? "Tutta la marca"
                  : "Modello specifico"
            }
          />
          <InfoRow
            label="Marca / modello"
            value={
              documentoSenzaMarcaUi(doc) ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                  <span aria-hidden>⚠️</span> Senza marca
                </span>
              ) : (
                entita
              )
            }
          />
          <InfoRow label="Data caricamento" value={doc.caricatoIl} />
          <InfoRow label="Ultima modifica" value={doc.ultimaModifica} />
          <InfoRow label="Autore" value={doc.autoreCaricamento} />
          <InfoRow label="Note" value={doc.note?.trim() ? doc.note : "—"} />
          <InfoRow label="Dimensione" value={`${doc.dimensioneKb} KB`} />
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={`${erpBtnAccent} w-full`} onClick={onEdit}>
            Modifica
          </button>
        </div>
      </div>
    </DocumentiModalShell>
  );
}

export function DocumentoEditModal({
  doc,
  catalog,
  onRequestClose,
  onSave,
}: {
  doc: DocumentoGestionale;
  catalog: CatalogMarca[];
  onRequestClose: () => void;
  onSave: (next: DocumentoGestionale) => void;
}) {
  const { authorName } = useAuth();
  const r0 = resolveDocumentoApplicazione(doc);
  const [nome, setNome] = useState(doc.nome);
  const [categoria, setCategoria] = useState(doc.categoria);
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(r0.applicabilita ?? "marca");
  const [marca, setMarca] = useState(r0.marcaKey ?? r0.marca);
  const [modello, setModello] = useState(r0.modelloKey ?? (r0.applicabilita === "modello" ? r0.macchina : ""));
  const [tipoFile, setTipoFile] = useState<DocumentoTipoFile>(doc.tipoFile);
  const [note, setNote] = useState(doc.note ?? "");
  const [autore, setAutore] = useState(doc.autoreCaricamento);
  const [marcaInvalid, setMarcaInvalid] = useState(false);
  const [modelloInvalid, setModelloInvalid] = useState(false);

  const marcheOptions = useMemo(() => catalog.map((m) => m.nome), [catalog]);
  const modelliOptions = useMemo(() => {
    const mar = catalog.find((m) => sameTextNorm(m.nome, marca));
    return mar?.macchine.map((x) => x.nome) ?? [];
  }, [catalog, marca]);

  useEffect(() => {
    if (applicabilita === "marca") setModello("");
  }, [applicabilita]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const marcaTrim = marca.trim();
    const marcaOk = marcaTrim.length === 0 || marcheOptions.some((o) => sameTextNorm(o, marcaTrim));
    const modelloOk =
      applicabilita === "marca" ||
      marcaTrim.length === 0 ||
      (modello.trim().length > 0 && modelliOptions.some((o) => sameTextNorm(o, modello)));
    setMarcaInvalid(!marcaOk);
    setModelloInvalid(applicabilita === "modello" && marcaTrim.length > 0 && !modelloOk);
    if (!marcaOk || !modelloOk) return;

    const today = new Date().toISOString().slice(0, 10);
    const base: DocumentoGestionale = {
      ...doc,
      nome: nome.trim(),
      categoria,
      marca: marcaTrim,
      macchina: applicabilita === "marca" || !marcaTrim ? "—" : modello.trim(),
      tipoFile,
      note: note.trim() || undefined,
      autoreCaricamento: autore.trim() || doc.autoreCaricamento || authorName,
      ultimaModifica: today,
      applicabilita: marcaTrim ? applicabilita : undefined,
      marcaKey: marcaTrim || undefined,
      modelloKey: marcaTrim && applicabilita === "modello" ? modello.trim() : undefined,
      associazioni: undefined,
    };
    onSave(resolveDocumentoApplicazione(base));
    onRequestClose();
  }

  return (
    <DocumentiModalShell title="Modifica documento" onRequestClose={onRequestClose} wide>
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="lavorazioni-scroll-scope min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input className={`${inputClass} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <GlobalSelect
              className={listSelectWrapClass}
              items={CATEGORIE.map((c) => ({ value: c, label: labelCategoria(c) }))}
              value={categoria}
              onChange={(v) => setCategoria(v as DocumentoGestionale["categoria"])}
              strictFromList
              aria-label="Tipo documento"
            />
          </label>

          <ApplicabilitaField applicabilita={applicabilita} onChange={setApplicabilita} />

          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
            <GlobalHierarchyMarcaSelect
              className={listSelectWrapClass}
              tree="attrezzature"
              value={marca}
              onChange={(v) => {
                setMarca(v);
                setModello("");
              }}
              aria-label="Marca documento"
            />
          </label>
          {applicabilita === "modello" && marca.trim() ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Modello
              <GlobalHierarchyModelloSelect
                className={listSelectWrapClass}
                tree="attrezzature"
                marcaNome={marca}
                value={modello}
                onChange={setModello}
                required
                aria-label="Modello documento"
              />
            </label>
          ) : null}

          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo file
            <GlobalSelect
              className={listSelectWrapClass}
              items={TIPI_FILE.map((t) => ({ value: t, label: labelTipoFile(t) }))}
              value={tipoFile}
              onChange={(v) => setTipoFile(v as DocumentoTipoFile)}
              strictFromList
              aria-label="Tipo file"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Autore caricamento
            <input className={`${inputClass} mt-1`} value={autore} onChange={(e) => setAutore(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note
            <textarea className={`${inputClass} mt-1 min-h-[72px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`}>
            Salva modifiche
          </button>
        </div>
      </form>
    </DocumentiModalShell>
  );
}
