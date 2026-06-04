"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { CompatHierarchyMultiSelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { ricambioModalSectionClass } from "@/components/gestionale/magazzino/ricambio-modal-ui";
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
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { CAB_FIELD_LABEL_ATTR, CAB_FOCUS_SCROLL_GROUP_ATTR } from "@/lib/ui/mobile-modal-behavior";
import { dsLabel, dsTypoSmall } from "@/lib/ui/design-system";
import { probeRicambioInputLag } from "@/lib/debug/ricambio-input-lag-probe";

type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

function RicambioSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]">
      {children}
    </p>
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
}: {
  form: RicambioFormState;
  setForm: SetForm;
  formResetKey?: string;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "RicambioFormCompatSection" });
  const prefsTree = useMemo(() => migrateMezziListePrefs(globalOpts.mezziListe), [globalOpts.mezziListe]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);
  const [marcheFiltroAtt, setMarcheFiltroAtt] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)),
  );
  const [marcheFiltroTel, setMarcheFiltroTel] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheTelaioFiltro)),
  );

  useEffect(() => {
    setMarcheFiltroAtt(new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)));
    setMarcheFiltroTel(new Set(parseCompatInput(form.compatMarcheTelaioFiltro)));
  }, [formResetKey, form.compatMarcheAttrezzaturaFiltro, form.compatMarcheTelaioFiltro]);

  function syncMarcheAttrezzaturaFiltro(next: Set<string>) {
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
  }

  function syncMarcheTelaioFiltro(next: Set<string>) {
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
  }

  function toggleMezzo(m: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      if (cur.has(m)) cur.delete(m);
      else cur.add(m);
      return {
        ...f,
        compatibilitaMezzi: compatMezziInteractive([...cur], prefsTree),
      };
    });
  }

  function removeCompatLine(line: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      cur.delete(line);
      return { ...f, compatibilitaMezzi: joinCompatLines(cur) };
    });
  }

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

  const selectedAttrezzature = useMemo(
    () =>
      Array.from(mezziSel)
        .filter(
          (x) =>
            lineBelongsToHierarchyTree(x, "attrezzature", prefsTree) && !isCompatMarcaUniversalLine(x),
        )
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => ({ value, label: compatLineDisplayText(value) })),
    [mezziSel, prefsTree],
  );
  const selectedTelai = useMemo(
    () =>
      Array.from(mezziSel)
        .filter((x) => lineBelongsToHierarchyTree(x, "telai", prefsTree) && !isCompatMarcaUniversalLine(x))
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => ({ value, label: compatLineDisplayText(value) })),
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

  return (
    <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
      <RicambioSectionTitle>Compatibilità mezzi</RicambioSectionTitle>
      <div className="grid gap-3">
        {globalOpts.isLoading ? (
          <p className={dsTypoSmall}>Caricamento elenchi attrezzature e telai…</p>
        ) : null}
        <div className="space-y-3">
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Marca attrezzatura
            </p>
            <CompatHierarchyMultiSelect
              tree="attrezzature"
              hierarchyKind="marca"
              ariaLabel="Marca attrezzatura compatibilità"
              placeholder="Cerca marca attrezzatura…"
              disabled={globalOpts.isLoading}
              options={marcheAttrezzatura}
              selected={marcheFiltroAttList.map((m) => ({
                value: m,
                label: marcaFiltroChipLabel(m, "attrezzature", mezziSel, prefsTree),
              }))}
              onAdd={(m) => syncMarcheAttrezzaturaFiltro(new Set(marcheFiltroAtt).add(m))}
              onRemove={(m) => {
                const next = new Set(marcheFiltroAtt);
                next.delete(m);
                syncMarcheAttrezzaturaFiltro(next);
              }}
              emptyMessage="Nessuna marca"
            />
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Modello attrezzatura
            </p>
            <CompatHierarchyMultiSelect
              tree="attrezzature"
              hierarchyKind="modello"
              marcaNome={marcheFiltroAttList[0]}
              ariaLabel="Modello attrezzatura compatibilità"
              placeholder="Cerca modello attrezzatura…"
              disabled={globalOpts.isLoading || marcheFiltroAttList.length === 0}
              options={attrezzatureOpts}
              selected={selectedAttrezzature}
              onAdd={(line) => toggleMezzo(line)}
              onRemove={removeCompatLine}
              emptyMessage={
                marcheFiltroAttList.length === 0
                  ? "Seleziona prima una marca attrezzatura"
                  : "Nessun modello"
              }
            />
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Marca telaio
            </p>
            <CompatHierarchyMultiSelect
              tree="telai"
              hierarchyKind="marca"
              ariaLabel="Marca telaio compatibilità"
              placeholder="Cerca marca telaio…"
              disabled={globalOpts.isLoading}
              options={marcheTelaio}
              selected={marcheFiltroTelList.map((m) => ({
                value: m,
                label: marcaFiltroChipLabel(m, "telai", mezziSel, prefsTree),
              }))}
              onAdd={(m) => syncMarcheTelaioFiltro(new Set(marcheFiltroTel).add(m))}
              onRemove={(m) => {
                const next = new Set(marcheFiltroTel);
                next.delete(m);
                syncMarcheTelaioFiltro(next);
              }}
              emptyMessage="Nessuna marca"
            />
          </div>
          <div>
            <p {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={`mb-1.5 ${dsLabel}`}>
              Modello telaio
            </p>
            <CompatHierarchyMultiSelect
              tree="telai"
              hierarchyKind="modello"
              marcaNome={marcheFiltroTelList[0]}
              ariaLabel="Modello telaio compatibilità"
              placeholder="Cerca modello telaio…"
              disabled={globalOpts.isLoading || marcheFiltroTelList.length === 0}
              options={telaiOpts}
              selected={selectedTelai}
              onAdd={(line) => toggleMezzo(line)}
              onRemove={removeCompatLine}
              emptyMessage={
                marcheFiltroTelList.length === 0 ? "Seleziona prima una marca telaio" : "Nessun modello"
              }
            />
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
                : "Nessuna selezione — compatibilità universale (tutte le macchine)."}
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
    </div>
  );
}

function compatSectionPropsEqual(
  prev: { form: RicambioFormState; setForm: SetForm; formResetKey?: string },
  next: { form: RicambioFormState; setForm: SetForm; formResetKey?: string },
): boolean {
  const equal =
    prev.form.compatibilitaMezzi === next.form.compatibilitaMezzi &&
    prev.form.compatMarcheAttrezzaturaFiltro === next.form.compatMarcheAttrezzaturaFiltro &&
    prev.form.compatMarcheTelaioFiltro === next.form.compatMarcheTelaioFiltro &&
    prev.formResetKey === next.formResetKey &&
    prev.setForm === next.setForm;
  if (!equal) {
    probeRicambioInputLag("ricambio-form-compat-section.tsx:memo-miss", "F", {
      compatMezziChanged: prev.form.compatibilitaMezzi !== next.form.compatibilitaMezzi,
    });
  }
  return equal;
}

export const RicambioFormCompatSection = memo(RicambioFormCompatSectionInner, compatSectionPropsEqual);
