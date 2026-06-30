"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { sliceInputValue, TEXT_LONG, TEXT_MEDIUM } from "@/lib/validation/text-field-limits";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import { LoadingButton } from "@/components/design-system";
import {
  defaultApplicabilitaForCategoria,
  isDocumentoMarcaOnlyCategoria,
} from "@/lib/documenti/documenti-applicabilita";
import {
  effectiveDocumentoApplicabilita,
  validateDocumentoMarcaModelloFields,
} from "@/lib/documenti/documenti-form-validation";
import type { DocumentoGestionale, DocumentoTipoFile, DocumentoApplicabilita } from "@/lib/types/gestionale";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import type { ModalSize } from "@/lib/ui/modal-max-width-class";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  GlobalAttrezzatureMarcaSelect,
  GlobalAttrezzatureModelloSelect,
} from "@/components/gestionale/global-input";
import { DocumentoFileDropzone } from "@/components/gestionale/documenti/documento-file-dropzone";
import { isListinoImportSupportedFileName } from "@/lib/magazzino/listino-import/listino-import-client";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { cabModalLayerClass } from "@/lib/ui/mobile-modal-behavior";
import { useAuth } from "@/context/auth-context";
import { dsBtnDanger } from "@/lib/ui/design-system";
import {
  canOpenDocumento,
  documentoFileUnavailableLabel,
  documentoCertificazioneSenzaMarca,
  documentoSenzaMarca,
  documentoSenzaMarcaConAvviso,
  extractFileExtension,
  stripFileExtension,
  formatDocumentoRigaSintetica,
  openDocumentoFile,
  inferTipoFileFromNome,
  labelCategoria,
  labelTipoFile,
  resolveDocumentoApplicazione,
} from "@/components/gestionale/documenti/documenti-helpers";

function documentoSenzaMarcaUi(doc: DocumentoGestionale): boolean {
  return documentoSenzaMarca(doc);
}

function documentoSenzaMarcaConAvvisoUi(doc: DocumentoGestionale): boolean {
  return documentoSenzaMarcaConAvviso(doc);
}

const inputClass =
  "w-full rounded-lg border border-zinc-600/90 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 shadow-md shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_75%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)]";

const listSelectWrapClass = "mt-1 w-full";

const CATEGORIE: DocumentoGestionale["categoria"][] = [
  "listini",
  "cataloghi",
  "manuali",
  "certificazioni",
  "altro",
];

const DOCUMENTI_MARCA_EMPTY_LABEL = "Nessuna marca";

const DEFAULT_UPLOAD_CATEGORIA: DocumentoGestionale["categoria"] = "listini";

const fieldErrorClass = "mt-1 text-xs text-red-600 dark:text-red-400";

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className={fieldErrorClass} role="alert">
      {message}
    </p>
  );
}

/** Shell documenti — delega al pattern modale gestionale (scroll lock, ESC, backdrop). */
function DocumentiModalShell({
  title,
  children,
  footer,
  onRequestClose,
  modalSize = "formMedium",
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onRequestClose: () => void;
  modalSize?: ModalSize;
}) {
  return (
    <LavorazioniModalShell
      modalSize={modalSize}
      layerClassName={cabModalLayerClass("base")}
      onRequestClose={onRequestClose}
      title={title}
      titleId="documenti-modal-title"
      footer={footer}
    >
      {children}
    </LavorazioniModalShell>
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
  allowModello = true,
  marcaOnlyHint,
}: {
  applicabilita: DocumentoApplicabilita;
  onChange: (a: DocumentoApplicabilita) => void;
  allowModello?: boolean;
  marcaOnlyHint?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Applicabilità</legend>
      <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/50 px-3 py-2.5 has-[:checked]:border-[color:color-mix(in_srgb,var(--cab-primary)_60%,var(--cab-border))] has-[:checked]:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]">
        <input
          type="radio"
          name="doc-applicabilita"
          className="accent-[var(--cab-primary)]"
          checked={applicabilita === "marca"}
          onChange={() => onChange("marca")}
        />
        <span className="text-sm text-zinc-200">Tutta la marca</span>
      </label>
      {allowModello ? (
        <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/50 px-3 py-2.5 has-[:checked]:border-[color:color-mix(in_srgb,var(--cab-primary)_60%,var(--cab-border))] has-[:checked]:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]">
          <input
            type="radio"
            name="doc-applicabilita"
            className="accent-[var(--cab-primary)]"
            checked={applicabilita === "modello"}
            onChange={() => onChange("modello")}
          />
          <span className="text-sm text-zinc-200">Modello specifico</span>
        </label>
      ) : marcaOnlyHint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{marcaOnlyHint}</p>
      ) : null}
    </fieldset>
  );
}

function marcaOnlyHintForCategoria(categoria: DocumentoGestionale["categoria"]): string | undefined {
  if (categoria === "listini") return "I listini si applicano a tutta la marca.";
  if (categoria === "certificazioni") return "Le certificazioni si applicano a tutta la marca.";
  return undefined;
}

export function UploadDocumentoModal({
  isUploading = false,
  onRequestClose,
  onSubmit,
  onImportListino,
}: {
  isUploading?: boolean;
  onRequestClose: () => void;
  onSubmit: (payload: Omit<DocumentoGestionale, "id">) => void | Promise<DocumentoGestionale | void>;
  onImportListino?: (doc: DocumentoGestionale) => void;
}) {
  const { authorName } = useAuth();
  const gestToast = useGestionaleToast();
  const pickedFileRef = useRef<File | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<DocumentoGestionale["categoria"]>(DEFAULT_UPLOAD_CATEGORIA);
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(() =>
    defaultApplicabilitaForCategoria(DEFAULT_UPLOAD_CATEGORIA),
  );
  const [marca, setMarca] = useState("");
  const [modello, setModello] = useState("");
  const [note, setNote] = useState("");
  const [pickedName, setPickedName] = useState<string>("");
  const [pickedSizeKb, setPickedSizeKb] = useState<number>(0);
  const [marcaInvalid, setMarcaInvalid] = useState(false);
  const [modelloInvalid, setModelloInvalid] = useState(false);
  const [importListinoToMagazzino, setImportListinoToMagazzino] = useState(false);
  const submitLock = useSubmitLock();

  const marcaOnly = isDocumentoMarcaOnlyCategoria(categoria);
  const effectiveApp = effectiveDocumentoApplicabilita(categoria, applicabilita);

  useEffect(() => {
    setApplicabilita(defaultApplicabilitaForCategoria(categoria));
  }, [categoria]);

  useEffect(() => {
    if (effectiveApp === "marca") setModello("");
  }, [effectiveApp]);

  function onFileChange(f: File | null) {
    pickedFileRef.current = f;
    if (!f) {
      setPickedName("");
      setPickedSizeKb(0);
      setImportListinoToMagazzino(false);
      return;
    }
    setPickedName(f.name);
    setPickedSizeKb(Math.max(1, Math.round(f.size / 1024)));
    if (!nome.trim()) setNome(stripFileExtension(f.name));
    if (!isListinoImportSupportedFileName(f.name)) setImportListinoToMagazzino(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isUploading) return;

    await runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({
        nome,
        categoria,
        marca,
        modello,
        note,
        effectiveApp,
        file: pickedFileRef.current,
      }),
      async (snap) => {
        const n = snap.nome.trim();
        const file = snap.file;
        const marcaTrim = snap.marca.trim();
        const modelloTrim = snap.modello.trim();
        const validation = validateDocumentoMarcaModelloFields(snap.effectiveApp, marcaTrim, modelloTrim);
        setMarcaInvalid(validation.marcaInvalid);
        setModelloInvalid(validation.modelloInvalid);
        if (!n || !file) return;
        if (!validation.valid) {
          gestToast.errorOnce(
            "documenti-form",
            validation.modelloInvalid ? "Seleziona un modello per l'applicabilità scelta." : "Controlla marca e modello.",
            { module: "documenti" },
          );
          return;
        }

        const tipo = inferTipoFileFromNome(file.name);
        const today = new Date().toISOString().slice(0, 10);
        const urlBlob = URL.createObjectURL(file);
        const ext = extractFileExtension(file.name);
        pickedFileRef.current = null;

        const base: Omit<DocumentoGestionale, "id"> = {
          nome: n,
          categoria: snap.categoria,
          marca: marcaTrim,
          macchina: snap.effectiveApp === "marca" || !marcaTrim ? "—" : modelloTrim,
          tipoFile: tipo,
          autoreCaricamento: authorName,
          note: snap.note.trim() || undefined,
          caricatoIl: today,
          ultimaModifica: today,
          dimensioneKb: Math.max(1, Math.round(file.size / 1024)),
          urlBlob,
          fileEstensione: ext || undefined,
          applicabilita: marcaTrim ? snap.effectiveApp : undefined,
          marcaKey: marcaTrim || undefined,
          modelloKey: marcaTrim && snap.effectiveApp === "modello" ? modelloTrim : undefined,
          associazioni: undefined,
        };
        const tmp = { ...base, id: "__new__" } as DocumentoGestionale;
        const resolved = resolveDocumentoApplicazione(tmp);
        const { id: _drop, ...payload } = resolved;
        try {
          const saved = await onSubmit(payload as Omit<DocumentoGestionale, "id">);
          if (saved && importListinoToMagazzino && snap.categoria === "listini") {
            onImportListino?.(saved);
          }
          onRequestClose();
        } catch {
          /* errore upload: modale resta aperta per correzione / retry */
        }
      },
    );
  }

  const showListinoImportOption =
    categoria === "listini" && pickedName.trim().length > 0 && isListinoImportSupportedFileName(pickedName);

  const canSubmit =
    !isUploading &&
    pickedName.trim().length > 0 &&
    (effectiveApp === "marca" || !marca.trim() || modello.trim().length > 0);

  return (
    <DocumentiModalShell
      title="Carica documento"
      onRequestClose={onRequestClose}
      footer={
        <LoadingButton
          type="submit"
          form="doc-upload-form"
          className={`${erpBtnAccent} min-h-11 w-full justify-center gap-2`}
          loading={isUploading}
          loadingLabel="Caricamento…"
          disabled={!canSubmit}
        >
          Conferma caricamento
        </LoadingButton>
      }
    >
      <form
        id="doc-upload-form"
        {...gestionaleFormFocusScopeProps()}
        onSubmit={handleSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-3">
          <DocumentoFileDropzone
            pickedName={pickedName}
            pickedSizeKb={pickedSizeKb}
            onFileChange={onFileChange}
            disabled={isUploading}
            uploadPhase={isUploading ? "uploading" : undefined}
          />

          {showListinoImportOption ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={importListinoToMagazzino}
                onChange={(e) => setImportListinoToMagazzino(e.target.checked)}
                disabled={isUploading}
              />
              <span className="min-w-0 text-sm text-[color:var(--cab-text)]">
                Importa ricambi in magazzino
                <span className="mt-0.5 block text-xs text-[color:var(--cab-text-muted)]">
                  Excel/CSV: analisi immediata · PDF: analisi IA con anteprima
                </span>
              </span>
            </label>
          ) : null}

          <label htmlFor="doc-upload-nome" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input
              id="doc-upload-nome"
              className={`${inputClass} mt-1`}
              value={nome}
              onChange={(e) => setNome(sliceInputValue(e.target.value, TEXT_MEDIUM))}
              required
              maxLength={TEXT_MEDIUM}
            />
          </label>
          <label htmlFor="doc-upload-categoria" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <GlobalSelect
              id="doc-upload-categoria"
              className={listSelectWrapClass}
              items={CATEGORIE.map((c) => ({ value: c, label: labelCategoria(c) }))}
              value={categoria}
              onChange={(v) => setCategoria(v as DocumentoGestionale["categoria"])}
              strictFromList
              selectOnly
              aria-label="Tipo documento"
            />
          </label>

          <ApplicabilitaField
            applicabilita={applicabilita}
            onChange={setApplicabilita}
            allowModello={!marcaOnly}
            marcaOnlyHint={marcaOnlyHintForCategoria(categoria)}
          />

          {effectiveApp === "modello" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
                  <GlobalAttrezzatureMarcaSelect
                    className={listSelectWrapClass}
                    value={marca}
                    onChange={(v) => {
                      setMarca(v);
                      setModello("");
                      setMarcaInvalid(false);
                      setModelloInvalid(false);
                    }}
                    emptyOptionLabel={DOCUMENTI_MARCA_EMPTY_LABEL}
                    selectOnly
                    aria-label="Marca documento"
                    aria-invalid={marcaInvalid || undefined}
                  />
                </label>
                <FieldError message={marcaInvalid ? "Marca non valida." : null} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Modello
                  <GlobalAttrezzatureModelloSelect
                    className={listSelectWrapClass}
                    marcaNome={marca}
                    value={modello}
                    onChange={(v) => {
                      setModello(v);
                      setModelloInvalid(false);
                    }}
                    required
                    selectOnly
                    aria-label="Modello documento"
                    aria-invalid={modelloInvalid || undefined}
                  />
                </label>
                <FieldError message={modelloInvalid ? "Seleziona un modello." : null} />
              </div>
            </div>
          ) : (
            <>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
                <GlobalAttrezzatureMarcaSelect
                  className={listSelectWrapClass}
                  value={marca}
                  onChange={(v) => {
                    setMarca(v);
                    setModello("");
                    setMarcaInvalid(false);
                    setModelloInvalid(false);
                  }}
                  emptyOptionLabel={DOCUMENTI_MARCA_EMPTY_LABEL}
                  selectOnly
                  aria-label="Marca documento"
                  aria-invalid={marcaInvalid || undefined}
                />
              </label>
              <FieldError message={marcaInvalid ? "Marca non valida." : null} />
            </>
          )}

          <p className="rounded-lg border border-zinc-700/50 bg-zinc-950/30 px-3 py-2 text-[11px] text-zinc-400">
            Anteprima:{" "}
            <span className="font-medium text-zinc-200">
              {previewNomeFile(nome || pickedName || "file", effectiveApp, marca, modello)}
            </span>
          </p>
          <label htmlFor="doc-upload-note" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note (facoltative)
            <GestionaleTextarea
              id="doc-upload-note"
              className="mt-1 min-h-[4.5rem]"
              size="md"
              value={note}
              onChange={(v) => setNote(sliceInputValue(v, TEXT_LONG))}
              rows={3}
              maxLength={TEXT_LONG}
            />
          </label>
        </GestionaleModalScrollBody>
      </form>
    </DocumentiModalShell>
  );
}

export function DocumentoInfoModal({
  doc,
  onRequestClose,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: {
  doc: DocumentoGestionale;
  onRequestClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const gestToast = useGestionaleToast();
  const r = resolveDocumentoApplicazione(doc);
  const canOpenFile = canOpenDocumento(doc);
  const fileUnavailableLabel = documentoFileUnavailableLabel(doc);
  const entita = documentoSenzaMarcaUi(doc)
    ? "— (assegna marca dalla modifica)"
    : r.applicabilita === "marca"
      ? `${r.marcaKey ?? r.marca} (tutta la marca)`
      : `${r.marcaKey ?? r.marca} · ${r.modelloKey ?? r.macchina}`;

  return (
    <DocumentiModalShell
      modalSize="info"
      title="Dettaglio documento"
      onRequestClose={onRequestClose}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            className={`${dsBtnDanger} min-h-11 w-full justify-center sm:w-auto`}
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? "Elimina" : "Sola lettura"}
          >
            Elimina
          </button>
          <button
            type="button"
            className={`${erpBtnAccent} min-h-11 w-full justify-center sm:w-auto`}
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? "Modifica" : "Sola lettura"}
          >
            Modifica
          </button>
        </div>
      }
    >
      <div className={`lavorazioni-scroll-scope ${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3 text-sm">
          <InfoRow label="Riepilogo" value={<span className="font-semibold">{formatDocumentoRigaSintetica(doc)}</span>} />
          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Nome file" value={doc.nome} />
            <InfoRow
              label="Apri file"
              value={
                canOpenFile ? (
                  <button
                    type="button"
                    className="font-medium text-[color:var(--cab-primary)] underline decoration-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)] underline-offset-2 hover:text-[color:var(--cab-primary-hover)]"
                    onClick={() => {
                      void openDocumentoFile(doc).then((result) => {
                        if (!result.ok) gestToast.warning(result.message);
                      });
                    }}
                  >
                    Apri in nuova scheda
                  </button>
                ) : (
                  <span className="text-[color:var(--cab-text-muted)]">{fileUnavailableLabel ?? "—"}</span>
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
                documentoSenzaMarcaConAvvisoUi(doc) ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                    <span aria-hidden>⚠️</span> Senza marca
                  </span>
                ) : documentoCertificazioneSenzaMarca(doc) ? (
                  "—"
                ) : (
                  entita
                )
              }
            />
            <InfoRow label="Autore" value={doc.autoreCaricamento} />
            <InfoRow label="Dimensione" value={`${doc.dimensioneKb} KB`} />
          </div>
          <InfoRow label="Note" value={doc.note?.trim() ? doc.note : "—"} />
        </GestionaleModalScrollBody>
      </div>
    </DocumentiModalShell>
  );
}

export function DocumentoEditModal({
  doc,
  onRequestClose,
  onSave,
}: {
  doc: DocumentoGestionale;
  onRequestClose: () => void;
  onSave: (next: DocumentoGestionale) => boolean | void | Promise<boolean | void>;
}) {
  const { authorName } = useAuth();
  const gestToast = useGestionaleToast();
  const r0 = resolveDocumentoApplicazione(doc);
  const [nome, setNome] = useState(doc.nome);
  const [categoria, setCategoria] = useState(doc.categoria);
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(() =>
    effectiveDocumentoApplicabilita(doc.categoria, r0.applicabilita ?? "marca"),
  );
  const [marca, setMarca] = useState(r0.marcaKey ?? r0.marca);
  const [modello, setModello] = useState(r0.modelloKey ?? (r0.applicabilita === "modello" ? r0.macchina : ""));
  const [note, setNote] = useState(doc.note ?? "");
  const [marcaInvalid, setMarcaInvalid] = useState(false);
  const [modelloInvalid, setModelloInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitLock = useSubmitLock();

  const marcaOnly = isDocumentoMarcaOnlyCategoria(categoria);
  const effectiveApp = effectiveDocumentoApplicabilita(categoria, applicabilita);

  useEffect(() => {
    if (effectiveApp === "marca") setModello("");
  }, [effectiveApp]);

  function onEditCategoriaChange(next: DocumentoGestionale["categoria"]) {
    setCategoria(next);
    setApplicabilita(defaultApplicabilitaForCategoria(next));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    await runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({
        nome,
        categoria,
        marca,
        modello,
        note,
        effectiveApp,
      }),
      async (snap) => {
        const marcaTrim = snap.marca.trim();
        const modelloTrim = snap.modello.trim();
        const validation = validateDocumentoMarcaModelloFields(snap.effectiveApp, marcaTrim, modelloTrim);
        setMarcaInvalid(validation.marcaInvalid);
        setModelloInvalid(validation.modelloInvalid);
        if (!validation.valid) {
          gestToast.errorOnce(
            "documenti-form",
            validation.modelloInvalid ? "Seleziona un modello per l'applicabilità scelta." : "Controlla marca e modello.",
            { module: "documenti" },
          );
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const inferredTipoFile = inferTipoFileFromNome(snap.nome.trim() || doc.nome);
        const base: DocumentoGestionale = {
          ...doc,
          nome: snap.nome.trim(),
          categoria: snap.categoria,
          marca: marcaTrim,
          macchina: snap.effectiveApp === "marca" || !marcaTrim ? "—" : modelloTrim,
          tipoFile: inferredTipoFile,
          note: snap.note.trim() || undefined,
          autoreCaricamento: doc.autoreCaricamento?.trim() || authorName,
          ultimaModifica: today,
          applicabilita: marcaTrim ? snap.effectiveApp : undefined,
          marcaKey: marcaTrim || undefined,
          modelloKey: marcaTrim && snap.effectiveApp === "modello" ? modelloTrim : undefined,
          associazioni: undefined,
        };

        setSaving(true);
        try {
          const result = await onSave(resolveDocumentoApplicazione(base));
          if (result !== false) onRequestClose();
        } finally {
          setSaving(false);
        }
      },
    );
  }

  return (
    <DocumentiModalShell
      title="Modifica documento"
      onRequestClose={onRequestClose}
      footer={
        <LoadingButton
          type="submit"
          form="doc-edit-form"
          className={`${erpBtnAccent} min-h-11 w-full justify-center gap-2`}
          loading={saving}
          preset="salva"
        >
          Salva modifiche
        </LoadingButton>
      }
    >
      <form
        id="doc-edit-form"
        {...gestionaleFormFocusScopeProps()}
        onSubmit={handleSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-3">
          <label htmlFor="doc-edit-nome" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input
              id="doc-edit-nome"
              className={`${inputClass} mt-1`}
              value={nome}
              onChange={(e) => setNome(sliceInputValue(e.target.value, TEXT_MEDIUM))}
              required
              maxLength={TEXT_MEDIUM}
            />
          </label>
          <label htmlFor="doc-edit-categoria" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <GlobalSelect
              id="doc-edit-categoria"
              className={listSelectWrapClass}
              items={CATEGORIE.map((c) => ({ value: c, label: labelCategoria(c) }))}
              value={categoria}
              onChange={(v) => onEditCategoriaChange(v as DocumentoGestionale["categoria"])}
              strictFromList
              selectOnly
              aria-label="Tipo documento"
            />
          </label>

          <ApplicabilitaField
            applicabilita={applicabilita}
            onChange={setApplicabilita}
            allowModello={!marcaOnly}
            marcaOnlyHint={marcaOnlyHintForCategoria(categoria)}
          />

          {effectiveApp === "modello" && marca.trim() ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
                  <GlobalAttrezzatureMarcaSelect
                    className={listSelectWrapClass}
                    value={marca}
                    onChange={(v) => {
                      setMarca(v);
                      setModello("");
                      setMarcaInvalid(false);
                      setModelloInvalid(false);
                    }}
                    emptyOptionLabel={DOCUMENTI_MARCA_EMPTY_LABEL}
                    selectOnly
                    aria-label="Marca documento"
                    aria-invalid={marcaInvalid || undefined}
                  />
                </label>
                <FieldError message={marcaInvalid ? "Marca non valida." : null} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Modello
                  <GlobalAttrezzatureModelloSelect
                    className={listSelectWrapClass}
                    marcaNome={marca}
                    value={modello}
                    onChange={(v) => {
                      setModello(v);
                      setModelloInvalid(false);
                    }}
                    required
                    selectOnly
                    aria-label="Modello documento"
                    aria-invalid={modelloInvalid || undefined}
                  />
                </label>
                <FieldError message={modelloInvalid ? "Seleziona un modello." : null} />
              </div>
            </div>
          ) : (
            <>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Marca <span className="font-normal text-zinc-500">(facoltativa)</span>
                <GlobalAttrezzatureMarcaSelect
                  className={listSelectWrapClass}
                  value={marca}
                  onChange={(v) => {
                    setMarca(v);
                    setModello("");
                    setMarcaInvalid(false);
                    setModelloInvalid(false);
                  }}
                  emptyOptionLabel={DOCUMENTI_MARCA_EMPTY_LABEL}
                  selectOnly
                  aria-label="Marca documento"
                  aria-invalid={marcaInvalid || undefined}
                />
              </label>
              <FieldError message={marcaInvalid ? "Marca non valida." : null} />
            </>
          )}

          <label htmlFor="doc-edit-note" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note
            <GestionaleTextarea
              id="doc-edit-note"
              className="mt-1 min-h-[4.5rem]"
              size="md"
              value={note}
              onChange={(v) => setNote(sliceInputValue(v, TEXT_LONG))}
              rows={3}
              maxLength={TEXT_LONG}
            />
          </label>
        </GestionaleModalScrollBody>
      </form>
    </DocumentiModalShell>
  );
}
