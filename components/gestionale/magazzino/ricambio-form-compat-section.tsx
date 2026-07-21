"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CompatHierarchyMultiSelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import type { RicambioFormState } from "@/lib/magazzino/form";
import { parseCompatInput } from "@/lib/magazzino/form";
import {
  isAllowedCompatLine,
  isCompatMarcaUniversalLine,
  marcaUniversalCompatLabel,
} from "@/lib/magazzino/ricambio-compat-resolver";
import {
  expandRicambioCompatibilitaMezzi,
  lineBelongsToHierarchyTree,
  marchePendingUniversalCompatExpand,
  preferExplicitModelsOverUniversalMarca,
  stripCompatLinesForMarcaInTree,
} from "@/lib/magazzino/ricambio-compat-expand";
import { migrateMezziListePrefs, parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import {
  compatLabelsPerMarcheHierarchy,
  marcheFromHierarchyTree,
} from "@/lib/mezzi/hierarchy-list-prefs";
import { compatLineDisplayText } from "@/lib/magazzino/form";
import { useRicambioFormOptions } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import { createSelectorSheetTapSelectHandlers } from "@/lib/selector-interaction/selector-sheet-tap-select";
import { CAB_FIELD_LABEL_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { dsLabel, dsTypoSmall } from "@/lib/ui/design-system";
type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

const HINT_ATT_MODELLO_ID = "ricambio-compat-hint-att-modello";
const HINT_TEL_MODELLO_ID = "ricambio-compat-hint-tel-modello";

const COMPAT_PREREQ_HINT_BOX =
  "mt-1.5 flex items-start gap-2 rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] px-2.5 py-1.5";

const COMPAT_PREREQ_HINT_TEXT =
  "text-[11px] font-medium leading-snug text-[color:color-mix(in_srgb,var(--cab-warning)_92%,var(--cab-text))]";

const COMPAT_BLOCKED_OVERLAY_BTN =
  "absolute inset-0 z-[1] cursor-not-allowed touch-pan-y rounded-[var(--ds-radius-lg)] bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-warning)_38%,transparent)] focus-visible:ring-offset-0";

function compatBlockedFieldWrapClass(blocked: boolean, hintActive: boolean): string {
  const base = "relative rounded-[var(--ds-radius-lg)]";
  if (!blocked) return base;
  if (hintActive) {
    return `${base} border border-[color:color-mix(in_srgb,var(--cab-warning)_52%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))]`;
  }
  return `${base} border border-dashed border-[color:color-mix(in_srgb,var(--cab-warning)_30%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-surface))]`;
}

function CompatPrerequisiteHint({ id, message }: { id: string; message: string }) {
  return (
    <div id={id} role="alert" className={COMPAT_PREREQ_HINT_BOX}>
      <span aria-hidden className="shrink-0 text-sm leading-none text-[color:var(--cab-warning)]">
        ⚠
      </span>
      <p className={`min-w-0 flex-1 ${COMPAT_PREREQ_HINT_TEXT}`}>{message}</p>
    </div>
  );
}

function normCompatMarca(m: string): string {
  return m.trim().toLowerCase();
}

function joinCompatLines(lines: Iterable<string>): string {
  return Array.from(lines)
    .sort((a, b) => a.localeCompare(b, "it"))
    .join(", ");
}

function compatMezziInteractive(
  lines: readonly string[],
  mezziListe: ReturnType<typeof migrateMezziListePrefs>,
): string {
  return joinCompatLines(preferExplicitModelsOverUniversalMarca(lines, mezziListe));
}

function marcaFiltroChipLabel(
  marca: string,
  tree: "attrezzature" | "telai",
  selected: ReadonlySet<string>,
  mezziListe: ReturnType<typeof migrateMezziListePrefs>,
): string {
  const hasModels = [...selected].some((line) => {
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) return false;
    const parsed = parseCompatMarcaModello(line);
    return normCompatMarca(parsed.marca) === normCompatMarca(marca) && Boolean(parsed.modello);
  });
  const hasUniversal = [...selected].some((line) => {
    if (!isCompatMarcaUniversalLine(line)) return false;
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) return false;
    return normCompatMarca(parseCompatMarcaModello(line).marca) === normCompatMarca(marca);
  });
  if (hasUniversal && !hasModels) {
    return compatLineDisplayText(marcaUniversalCompatLabel(marca));
  }
  return marca;
}

function RicambioFormCompatSectionInner({
  form,
  setForm,
  formResetKey,
  formMode = "create",
}: {
  form: RicambioFormState;
  setForm: SetForm;
  formResetKey?: string;
  formMode?: "create" | "edit";
}) {
  const globalOpts = useRicambioFormOptions();
  const prefsTree = useMemo(() => migrateMezziListePrefs(globalOpts.mezziListe), [globalOpts.mezziListe]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);
  const [marcheFiltroAtt, setMarcheFiltroAtt] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)),
  );
  const [marcheFiltroTel, setMarcheFiltroTel] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheTelaioFiltro)),
  );
  const [showAttModelloMarcaHint, setShowAttModelloMarcaHint] = useState(false);
  const [showTelModelloMarcaHint, setShowTelModelloMarcaHint] = useState(false);

  const showAttModelloMarcaHintTap = useMemo(
    () => createSelectorSheetTapSelectHandlers(() => setShowAttModelloMarcaHint(true)),
    [],
  );
  const showTelModelloMarcaHintTap = useMemo(
    () => createSelectorSheetTapSelectHandlers(() => setShowTelModelloMarcaHint(true)),
    [],
  );

  useEffect(() => {
    setMarcheFiltroAtt(new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)));
    setMarcheFiltroTel(new Set(parseCompatInput(form.compatMarcheTelaioFiltro)));
    setShowAttModelloMarcaHint(false);
    setShowTelModelloMarcaHint(false);
  }, [formResetKey, form.compatMarcheAttrezzaturaFiltro, form.compatMarcheTelaioFiltro]);

  const syncMarcheAttrezzaturaFiltro = useCallback(
    (next: Set<string>) => {
      setMarcheFiltroAtt(next);
      const joined = joinCompatLines(next);
      setForm((f) => {
        const prevAtt = new Set(parseCompatInput(f.compatMarcheAttrezzaturaFiltro));
        let lines = parseCompatInput(f.compatibilitaMezzi);
        for (const old of prevAtt) {
          if (next.has(old)) continue;
          lines = stripCompatLinesForMarcaInTree(lines, old, "attrezzature", prefsTree);
        }
        return {
          ...f,
          compatMarcheAttrezzaturaFiltro: joined,
          compatibilitaMezzi: compatMezziInteractive(lines, prefsTree),
        };
      });
    },
    [prefsTree, setForm],
  );

  const syncMarcheTelaioFiltro = useCallback(
    (next: Set<string>) => {
      setMarcheFiltroTel(next);
      const joined = joinCompatLines(next);
      setForm((f) => {
        const prevTel = new Set(parseCompatInput(f.compatMarcheTelaioFiltro));
        let lines = parseCompatInput(f.compatibilitaMezzi);
        for (const old of prevTel) {
          if (next.has(old)) continue;
          lines = stripCompatLinesForMarcaInTree(lines, old, "telai", prefsTree);
        }
        return {
          ...f,
          compatMarcheTelaioFiltro: joined,
          compatibilitaMezzi: compatMezziInteractive(lines, prefsTree),
        };
      });
    },
    [prefsTree, setForm],
  );

  const toggleMezzo = useCallback(
    (m: string) => {
      setForm((f) => {
        const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
        if (cur.has(m)) cur.delete(m);
        else cur.add(m);
        return {
          ...f,
          compatibilitaMezzi: compatMezziInteractive([...cur], prefsTree),
        };
      });
    },
    [prefsTree, setForm],
  );

  const removeCompatLine = useCallback(
    (line: string) => {
      setForm((f) => {
        const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
        cur.delete(line);
        return { ...f, compatibilitaMezzi: joinCompatLines(cur) };
      });
    },
    [setForm],
  );

  const marcheAttrezzatura = useMemo(() => marcheFromHierarchyTree(prefsTree, "attrezzature"), [prefsTree]);
  const marcheTelaio = useMemo(() => marcheFromHierarchyTree(prefsTree, "telai"), [prefsTree]);
  const marcheFiltroAttList = useMemo(
    () => Array.from(marcheFiltroAtt).sort((a, b) => a.localeCompare(b, "it")),
    [marcheFiltroAtt],
  );
  const marcheFiltroTelList = useMemo(
    () => Array.from(marcheFiltroTel).sort((a, b) => a.localeCompare(b, "it")),
    [marcheFiltroTel],
  );
  const attModelloBlocked = !globalOpts.isLoading && marcheFiltroAttList.length === 0;
  const telModelloBlocked = !globalOpts.isLoading && marcheFiltroTelList.length === 0;

  useEffect(() => {
    if (!attModelloBlocked) setShowAttModelloMarcaHint(false);
  }, [attModelloBlocked]);

  useEffect(() => {
    if (!telModelloBlocked) setShowTelModelloMarcaHint(false);
  }, [telModelloBlocked]);

  const selectedAttrezzature = useMemo(
    () =>
      Array.from(mezziSel)
        .filter(
          (x) =>
            lineBelongsToHierarchyTree(x, "attrezzature", prefsTree) && !isCompatMarcaUniversalLine(x),
        )
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => {
          const full = compatLineDisplayText(value);
          const modello = parseCompatMarcaModello(value).modello;
          return {
            value,
            label: modello || full,
            title: full,
          };
        }),
    [mezziSel, prefsTree],
  );
  const selectedTelai = useMemo(
    () =>
      Array.from(mezziSel)
        .filter((x) => lineBelongsToHierarchyTree(x, "telai", prefsTree) && !isCompatMarcaUniversalLine(x))
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => {
          const full = compatLineDisplayText(value);
          const modello = parseCompatMarcaModello(value).modello;
          return {
            value,
            label: modello || full,
            title: full,
          };
        }),
    [mezziSel, prefsTree],
  );

  const attrezzatureOpts = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, "attrezzature", marcheFiltroAttList),
    [prefsTree, marcheFiltroAttList],
  );
  const telaiOpts = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, "telai", marcheFiltroTelList),
    [prefsTree, marcheFiltroTelList],
  );

  const selectedMarcheAttChips = useMemo(
    () =>
      marcheFiltroAttList.map((m) => ({
        value: m,
        label: marcaFiltroChipLabel(m, "attrezzature", mezziSel, prefsTree),
      })),
    [marcheFiltroAttList, mezziSel, prefsTree],
  );

  const selectedMarcheTelChips = useMemo(
    () =>
      marcheFiltroTelList.map((m) => ({
        value: m,
        label: marcaFiltroChipLabel(m, "telai", mezziSel, prefsTree),
      })),
    [marcheFiltroTelList, mezziSel, prefsTree],
  );

  const handleAddMarcaAtt = useCallback(
    (m: string) => syncMarcheAttrezzaturaFiltro(new Set(marcheFiltroAtt).add(m)),
    [marcheFiltroAtt, syncMarcheAttrezzaturaFiltro],
  );

  const handleRemoveMarcaAtt = useCallback(
    (m: string) => {
      const next = new Set(marcheFiltroAtt);
      next.delete(m);
      syncMarcheAttrezzaturaFiltro(next);
    },
    [marcheFiltroAtt, syncMarcheAttrezzaturaFiltro],
  );

  const handleAddMarcaTel = useCallback(
    (m: string) => syncMarcheTelaioFiltro(new Set(marcheFiltroTel).add(m)),
    [marcheFiltroTel, syncMarcheTelaioFiltro],
  );

  const handleRemoveMarcaTel = useCallback(
    (m: string) => {
      const next = new Set(marcheFiltroTel);
      next.delete(m);
      syncMarcheTelaioFiltro(next);
    },
    [marcheFiltroTel, syncMarcheTelaioFiltro],
  );

  const pendingUniversalMarche = useMemo(
    () =>
      marchePendingUniversalCompatExpand(parseCompatInput(form.compatibilitaMezzi), {
        marcheAttrezzaturaFiltro: marcheFiltroAttList,
        marcheTelaioFiltro: marcheFiltroTelList,
        mezziListe: prefsTree,
      }),
    [form.compatibilitaMezzi, marcheFiltroAttList, marcheFiltroTelList, prefsTree],
  );

  const pendingUniversalLabel = useMemo(() => {
    const parts = [
      ...pendingUniversalMarche.attrezzature.map((m) => `${m} (attrezzatura)`),
      ...pendingUniversalMarche.telai.map((m) => `${m} (telaio)`),
    ];
    return parts.join(", ");
  }, [pendingUniversalMarche]);

  const compatFormStatus = useMemo(() => {
    const raw = parseCompatInput(form.compatibilitaMezzi);
    const expanded = expandRicambioCompatibilitaMezzi(raw, {
      marcheAttrezzaturaFiltro: marcheFiltroAttList,
      marcheTelaioFiltro: marcheFiltroTelList,
      mezziListe: prefsTree,
    });
    const invalid = expanded.filter((line) => !isAllowedCompatLine(line, prefsTree));
    const explicitModels = raw.filter(
      (line) => !isCompatMarcaUniversalLine(line) && isAllowedCompatLine(line, prefsTree),
    );
    const pendingUniversalCount =
      pendingUniversalMarche.attrezzature.length + pendingUniversalMarche.telai.length;
    const validCount = explicitModels.length + pendingUniversalCount;
    return { expanded, validCount, invalid };
  }, [
    form.compatibilitaMezzi,
    marcheFiltroAttList,
    marcheFiltroTelList,
    pendingUniversalMarche,
    prefsTree,
  ]);

  const hasCompatSelection = useMemo(
    () =>
      Boolean(
        form.compatibilitaMezzi.trim() ||
          form.compatMarcheAttrezzaturaFiltro.trim() ||
          form.compatMarcheTelaioFiltro.trim(),
      ),
    [form.compatibilitaMezzi, form.compatMarcheAttrezzaturaFiltro, form.compatMarcheTelaioFiltro],
  );

  return (
    <RicambioCollapsibleSection
      title="Compatibilità mezzi"
      defaultCollapsed={formMode !== "create" && !hasCompatSelection}
    >
      <div className="grid gap-3">
        {globalOpts.isLoading ? (
          <p className={dsTypoSmall}>Caricamento elenchi attrezzature e telai…</p>
        ) : null}
        <div className="space-y-3">
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Marca attrezzatura
            </p>
            <div>
              <CompatHierarchyMultiSelect
                tree="attrezzature"
                hierarchyKind="marca"
                ariaLabel="Marca attrezzatura compatibilità"
                placeholder="Cerca marca attrezzatura…"
                disabled={globalOpts.isLoading}
                options={marcheAttrezzatura}
                selected={selectedMarcheAttChips}
                onAdd={handleAddMarcaAtt}
                onRemove={handleRemoveMarcaAtt}
                emptyMessage="Nessuna marca"
              />
            </div>
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Modello attrezzatura
            </p>
            <div className={compatBlockedFieldWrapClass(attModelloBlocked, showAttModelloMarcaHint && attModelloBlocked)}>
              <CompatHierarchyMultiSelect
                tree="attrezzature"
                hierarchyKind="modello"
                marcaNome={marcheFiltroAttList[0]}
                ariaLabel="Modello attrezzatura compatibilità"
                placeholder="Cerca modello attrezzatura…"
                disabled={globalOpts.isLoading || attModelloBlocked}
                options={attrezzatureOpts}
                selected={selectedAttrezzature}
                onAdd={(line) => toggleMezzo(line)}
                onRemove={removeCompatLine}
                emptyMessage={
                  attModelloBlocked
                    ? "Seleziona prima una marca attrezzatura"
                    : "Nessun modello"
                }
              />
              {attModelloBlocked ? (
                <button
                  type="button"
                  tabIndex={0}
                  aria-describedby={showAttModelloMarcaHint ? HINT_ATT_MODELLO_ID : undefined}
                  aria-label="Modello attrezzatura non disponibile finché non selezioni una marca attrezzatura"
                  className={COMPAT_BLOCKED_OVERLAY_BTN}
                  onPointerDown={showAttModelloMarcaHintTap.onPointerDown}
                  onPointerMove={showAttModelloMarcaHintTap.onPointerMove}
                  onPointerUp={showAttModelloMarcaHintTap.onPointerUp}
                  onPointerCancel={showAttModelloMarcaHintTap.onPointerCancel}
                />
              ) : null}
            </div>
            {showAttModelloMarcaHint && attModelloBlocked ? (
              <CompatPrerequisiteHint
                id={HINT_ATT_MODELLO_ID}
                message="Seleziona prima la marca attrezzatura per abilitare i modelli."
              />
            ) : null}
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Marca telaio
            </p>
            <div>
              <CompatHierarchyMultiSelect
                tree="telai"
                hierarchyKind="marca"
                ariaLabel="Marca telaio compatibilità"
                placeholder="Cerca marca telaio…"
                disabled={globalOpts.isLoading}
                options={marcheTelaio}
                selected={selectedMarcheTelChips}
                onAdd={handleAddMarcaTel}
                onRemove={handleRemoveMarcaTel}
                emptyMessage="Nessuna marca"
              />
            </div>
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Modello telaio
            </p>
            <div className={compatBlockedFieldWrapClass(telModelloBlocked, showTelModelloMarcaHint && telModelloBlocked)}>
              <CompatHierarchyMultiSelect
                tree="telai"
                hierarchyKind="modello"
                marcaNome={marcheFiltroTelList[0]}
                ariaLabel="Modello telaio compatibilità"
                placeholder="Cerca modello telaio…"
                disabled={globalOpts.isLoading || telModelloBlocked}
                options={telaiOpts}
                selected={selectedTelai}
                onAdd={(line) => toggleMezzo(line)}
                onRemove={removeCompatLine}
                emptyMessage={
                  telModelloBlocked ? "Seleziona prima una marca telaio" : "Nessun modello"
                }
              />
              {telModelloBlocked ? (
                <button
                  type="button"
                  tabIndex={0}
                  aria-describedby={showTelModelloMarcaHint ? HINT_TEL_MODELLO_ID : undefined}
                  aria-label="Modello telaio non disponibile finché non selezioni una marca telaio"
                  className={COMPAT_BLOCKED_OVERLAY_BTN}
                  onPointerDown={showTelModelloMarcaHintTap.onPointerDown}
                  onPointerMove={showTelModelloMarcaHintTap.onPointerMove}
                  onPointerUp={showTelModelloMarcaHintTap.onPointerUp}
                  onPointerCancel={showTelModelloMarcaHintTap.onPointerCancel}
                />
              ) : null}
            </div>
            {showTelModelloMarcaHint && telModelloBlocked ? (
              <CompatPrerequisiteHint
                id={HINT_TEL_MODELLO_ID}
                message="Seleziona prima la marca telaio per abilitare i modelli."
              />
            ) : null}
          </div>
        </div>
        {compatFormStatus.invalid.length > 0 ? (
          <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
            {compatFormStatus.invalid.length === 1
              ? "1 compatibilità obsoleta o non riconosciuta — rimuovila o sostituiscila dall'elenco mezzi."
              : `${compatFormStatus.invalid.length} compatibilità obsolete o non riconosciute — rimuovile o sostituiscile dall'elenco mezzi.`}
          </p>
        ) : (
          <p className={`mt-1 ${dsTypoSmall}`}>
            {compatFormStatus.validCount > 0
              ? compatFormStatus.validCount === 1
                ? "1 compatibilità selezionata"
                : `${compatFormStatus.validCount} compatibilità selezionate`
              : pendingUniversalLabel
                ? "Nessun modello selezionato — al salvataggio: compatibilità universale per marca."
                : "Nessuna selezione — compatibilità universale."}
          </p>
        )}
        {compatFormStatus.invalid.length === 0 && pendingUniversalLabel ? (
          <p
            className="mt-1.5 rounded-md border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]"
            role="status"
          >
            Al salvataggio: compatibilità universale per {pendingUniversalLabel}
          </p>
        ) : null}
      </div>
    </RicambioCollapsibleSection>
  );
}

function compatSectionPropsEqual(
  prev: {
    form: RicambioFormState;
    setForm: SetForm;
    formResetKey?: string;
    formMode?: "create" | "edit";
  },
  next: {
    form: RicambioFormState;
    setForm: SetForm;
    formResetKey?: string;
    formMode?: "create" | "edit";
  },
): boolean {
  const equal =
    prev.form.compatibilitaMezzi === next.form.compatibilitaMezzi &&
    prev.form.compatMarcheAttrezzaturaFiltro === next.form.compatMarcheAttrezzaturaFiltro &&
    prev.form.compatMarcheTelaioFiltro === next.form.compatMarcheTelaioFiltro &&
    prev.formResetKey === next.formResetKey &&
    prev.formMode === next.formMode &&
    prev.setForm === next.setForm;
  return equal;
}

export const RicambioFormCompatSection = memo(RicambioFormCompatSectionInner, compatSectionPropsEqual);
