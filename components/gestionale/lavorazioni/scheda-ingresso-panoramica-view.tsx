"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoRow,
  type GestionaleInfoRowLayout,
  GestionaleInfoSubgroup,
} from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaField,
  HubModalPanoramicaFieldTileShell,
  HubModalPanoramicaInlineCell,
  HubModalPanoramicaInlineGrid,
  HubModalPanoramicaStatusPill,
  HubModalPanoramicaSubsection,
  hubPanoramicaDisplayValue,
} from "@/components/design-system/hub-modal-panoramica";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { formatLivelloCarburanteDisplay } from "@/lib/schede/livello-carburante-value";
import { RichiedenteFirmaDisplay } from "@/components/gestionale/schede/richiedente-firma-display";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL } from "@/lib/schede/scheda-ingresso-ui-labels";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoPanoramicaSections = {
  ingresso?: boolean;
  anagrafica?: boolean;
  intervento?: boolean;
};

/** `rows`: riga label|valore; `tiles`: griglia multi-colonna (portale clienti / schermi larghi). */
export type SchedaIngressoPanoramicaFieldLayout = "rows" | "tiles";

const panoramicaStackedGridClass = "grid min-w-0 grid-cols-2 gap-x-4 gap-y-3";
const panoramicaStackedGridDenseClass = "grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3";
const panoramicaStackedGridPortalIngressoClass = "grid min-w-0 grid-cols-3 gap-x-2 gap-y-2";
const panoramicaStackedFullSpanClass = "col-span-2";
const panoramicaStackedFullSpan3Class = "col-span-3";

function panoramicaStackedGridClassFor(dense: boolean, portalIngressoLayout = false): string {
  if (portalIngressoLayout) return panoramicaStackedGridPortalIngressoClass;
  return dense ? panoramicaStackedGridDenseClass : panoramicaStackedGridClass;
}

function isPanoramicaStackedGrid(
  fieldLayout: SchedaIngressoPanoramicaFieldLayout,
  rowLayout: GestionaleInfoRowLayout,
): boolean {
  return fieldLayout === "rows" && rowLayout === "stacked";
}

function hasPanoramicaFieldValue(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

function multilineValue(value: string): ReactNode {
  const t = value.trim();
  if (!t) return hubPanoramicaDisplayValue("");
  return <span className="whitespace-pre-wrap text-[color:var(--cab-text)]">{t}</span>;
}

function PanoramicaStringField({
  label,
  value,
  mono,
  strong,
  fieldLayout,
  rowLayout,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  fieldLayout: SchedaIngressoPanoramicaFieldLayout;
  rowLayout: GestionaleInfoRowLayout;
}) {
  const display = hubPanoramicaDisplayValue(value);
  if (fieldLayout === "tiles") {
    return <HubModalPanoramicaField label={label} value={display} mono={mono} />;
  }
  if (isPanoramicaStackedGrid(fieldLayout, rowLayout)) {
    return (
      <HubModalPanoramicaInlineCell label={label}>
        <span
          className={`min-w-0 text-[color:var(--cab-text)]${strong ? " font-medium" : ""}${mono ? " font-mono tabular-nums" : ""}`}
        >
          {display}
        </span>
      </HubModalPanoramicaInlineCell>
    );
  }
  return (
    <GestionaleInfoRow label={label} value={display} mono={mono} strong={strong} layout={rowLayout} />
  );
}

function PanoramicaCustomField({
  label,
  children,
  fieldLayout,
  rowLayout,
  spanFull,
  gridCellClassName,
  dense = false,
  portalIngressoLayout = false,
}: {
  label: string;
  children: ReactNode;
  fieldLayout: SchedaIngressoPanoramicaFieldLayout;
  rowLayout: GestionaleInfoRowLayout;
  spanFull?: boolean;
  gridCellClassName?: string;
  dense?: boolean;
  portalIngressoLayout?: boolean;
}) {
  if (fieldLayout === "tiles") {
    return (
      <div className={spanFull ? "min-w-0 sm:col-span-2 lg:col-span-3" : "min-w-0"}>
        <HubModalPanoramicaInlineCell label={label}>{children}</HubModalPanoramicaInlineCell>
      </div>
    );
  }
  if (isPanoramicaStackedGrid(fieldLayout, rowLayout)) {
    const fullSpanClass = spanFull
      ? portalIngressoLayout
        ? panoramicaStackedFullSpan3Class
        : dense
          ? "col-span-2 sm:col-span-3"
          : panoramicaStackedFullSpanClass
      : gridCellClassName;
    return (
      <HubModalPanoramicaInlineCell label={label} className={fullSpanClass}>
        {children}
      </HubModalPanoramicaInlineCell>
    );
  }
  return <GestionaleInfoRow label={label} value={children} layout={rowLayout} />;
}

function PanoramicaFieldsShell({
  fieldLayout,
  rowLayout = "grid",
  dense = false,
  portalIngressoLayout = false,
  children,
}: {
  fieldLayout: SchedaIngressoPanoramicaFieldLayout;
  rowLayout?: GestionaleInfoRowLayout;
  dense?: boolean;
  portalIngressoLayout?: boolean;
  children: ReactNode;
}) {
  if (fieldLayout === "tiles") {
    return <HubModalPanoramicaInlineGrid>{children}</HubModalPanoramicaInlineGrid>;
  }
  if (isPanoramicaStackedGrid(fieldLayout, rowLayout)) {
    return <div className={panoramicaStackedGridClassFor(dense, portalIngressoLayout)}>{children}</div>;
  }
  return <>{children}</>;
}

/** Portale dettaglio: attrezzatura (+ matricola/scuderia) e telaio (+ targa) in card separate. */
function SchedaIngressoPortalMezzoSplit({
  fields,
  fieldLayout,
  rowLayout,
  densePanorama,
}: {
  fields: SchedaIngressoFields;
  fieldLayout: SchedaIngressoPanoramicaFieldLayout;
  rowLayout: GestionaleInfoRowLayout;
  densePanorama: boolean;
}) {
  const showUtilizzatore = hasPanoramicaFieldValue(fields.utilizzatore);
  const showScuderia = hasPanoramicaFieldValue(fields.nScuderia);

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
      <GestionaleInfoCard title="Attrezzatura" compact={densePanorama}>
        <PanoramicaFieldsShell fieldLayout={fieldLayout} rowLayout={rowLayout} dense={densePanorama}>
          {showUtilizzatore ? (
            <PanoramicaStringField
              label="Utilizzatore"
              value={fields.utilizzatore}
              fieldLayout={fieldLayout}
              rowLayout={rowLayout}
            />
          ) : null}
          <PanoramicaStringField label="Tipo" value={fields.tipoAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          <PanoramicaStringField
            label="Marca"
            value={fields.marcaAttrezzatura}
            strong
            fieldLayout={fieldLayout}
            rowLayout={rowLayout}
          />
          <PanoramicaStringField label="Modello" value={fields.modelloAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          <PanoramicaStringField label="Matricola" value={fields.matricola} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
          {showScuderia ? (
            <PanoramicaStringField label="Scuderia" value={fields.nScuderia} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
          ) : null}
        </PanoramicaFieldsShell>
      </GestionaleInfoCard>
      <GestionaleInfoCard title="Telaio" compact={densePanorama}>
        <PanoramicaFieldsShell fieldLayout={fieldLayout} rowLayout={rowLayout} dense={densePanorama}>
          <PanoramicaStringField label="Tipo" value={fields.tipoTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          <PanoramicaStringField label="Marca" value={fields.marcaTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          <PanoramicaStringField label="Modello" value={fields.modelloTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          <PanoramicaStringField label="Targa" value={fields.targa} mono strong fieldLayout={fieldLayout} rowLayout={rowLayout} />
        </PanoramicaFieldsShell>
      </GestionaleInfoCard>
    </div>
  );
}

/** Righe anagrafica (senza shell card) — per tab Panoramica hub lavorazioni. */
export function SchedaIngressoPanoramicaAnagraficaContent({
  fields,
  rowLayout = "grid",
  fieldLayout = "rows",
  omitPanoramaDuplicates = false,
  densePanorama = false,
  portalIngressoLayout = false,
}: {
  fields: SchedaIngressoFields;
  rowLayout?: GestionaleInfoRowLayout;
  fieldLayout?: SchedaIngressoPanoramicaFieldLayout;
  /** Portale dettaglio: cliente/cantiere già in panoramica sopra. */
  omitPanoramaDuplicates?: boolean;
  /** Portale dettaglio: griglia più compatta. */
  densePanorama?: boolean;
  /** Modal ingresso portale clienti: griglia 3 colonne. */
  portalIngressoLayout?: boolean;
}) {
  const showUtilizzatore = hasPanoramicaFieldValue(fields.utilizzatore);
  const showTopAnagraficaRow = !omitPanoramaDuplicates || showUtilizzatore;
  const stackedGridClass = panoramicaStackedGridClassFor(densePanorama, portalIngressoLayout);

  if (fieldLayout === "tiles") {
    return (
      <>
        {showTopAnagraficaRow ? (
          <HubModalPanoramicaInlineGrid>
            {!omitPanoramaDuplicates ? (
              <PanoramicaStringField
                label="Cliente"
                value={fields.cliente}
                strong
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            ) : null}
            {!omitPanoramaDuplicates ? (
              <PanoramicaStringField label="Cantiere" value={fields.cantiere} fieldLayout={fieldLayout} rowLayout={rowLayout} />
            ) : null}
            {showUtilizzatore ? (
              <PanoramicaStringField
                label="Utilizzatore"
                value={fields.utilizzatore}
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            ) : null}
          </HubModalPanoramicaInlineGrid>
        ) : null}
        <HubModalPanoramicaSubsection title="Identificazione">
          <HubModalPanoramicaField label="Targa" value={hubPanoramicaDisplayValue(fields.targa)} mono />
          <HubModalPanoramicaField label="Matricola" value={hubPanoramicaDisplayValue(fields.matricola)} mono />
          {hasPanoramicaFieldValue(fields.nScuderia) ? (
            <HubModalPanoramicaField label="Scuderia" value={hubPanoramicaDisplayValue(fields.nScuderia)} mono />
          ) : null}
        </HubModalPanoramicaSubsection>
        <HubModalPanoramicaSubsection title="Attrezzatura">
          <HubModalPanoramicaField label="Tipo" value={hubPanoramicaDisplayValue(fields.tipoAttrezzatura)} />
          <HubModalPanoramicaField label="Marca" value={hubPanoramicaDisplayValue(fields.marcaAttrezzatura)} />
          <HubModalPanoramicaField label="Modello" value={hubPanoramicaDisplayValue(fields.modelloAttrezzatura)} />
        </HubModalPanoramicaSubsection>
        <HubModalPanoramicaSubsection title="Telaio">
          <HubModalPanoramicaField label="Tipo" value={hubPanoramicaDisplayValue(fields.tipoTelaio)} />
          <HubModalPanoramicaField label="Marca" value={hubPanoramicaDisplayValue(fields.marcaTelaio)} />
          <HubModalPanoramicaField label="Modello" value={hubPanoramicaDisplayValue(fields.modelloTelaio)} />
        </HubModalPanoramicaSubsection>
      </>
    );
  }

  if (isPanoramicaStackedGrid(fieldLayout, rowLayout)) {
    return (
      <>
        {showTopAnagraficaRow ? (
          <div className={stackedGridClass}>
            {!omitPanoramaDuplicates ? (
              <PanoramicaStringField
                label="Cliente"
                value={fields.cliente}
                strong
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            ) : null}
            {!omitPanoramaDuplicates ? (
              <PanoramicaStringField label="Cantiere" value={fields.cantiere} fieldLayout={fieldLayout} rowLayout={rowLayout} />
            ) : null}
            {showUtilizzatore ? (
              <PanoramicaStringField
                label="Utilizzatore"
                value={fields.utilizzatore}
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            ) : null}
          </div>
        ) : null}
        <GestionaleInfoSubgroup title="Identificazione" dense={densePanorama}>
          <div className={stackedGridClass}>
            <PanoramicaStringField label="Targa" value={fields.targa} mono strong fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField label="Matricola" value={fields.matricola} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
            {hasPanoramicaFieldValue(fields.nScuderia) ? (
              <PanoramicaStringField label="Scuderia" value={fields.nScuderia} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
            ) : null}
          </div>
        </GestionaleInfoSubgroup>
        <GestionaleInfoSubgroup title="Attrezzatura" dense={densePanorama}>
          <div className={stackedGridClass}>
            <PanoramicaStringField label="Tipo" value={fields.tipoAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField label="Marca" value={fields.marcaAttrezzatura} strong fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField label="Modello" value={fields.modelloAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          </div>
        </GestionaleInfoSubgroup>
        <GestionaleInfoSubgroup title="Telaio" dense={densePanorama}>
          <div className={stackedGridClass}>
            <PanoramicaStringField label="Tipo" value={fields.tipoTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField label="Marca" value={fields.marcaTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField label="Modello" value={fields.modelloTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
          </div>
        </GestionaleInfoSubgroup>
      </>
    );
  }

  return (
    <>
      {!omitPanoramaDuplicates ? (
        <PanoramicaStringField
          label="Cliente"
          value={fields.cliente}
          strong
          fieldLayout={fieldLayout}
          rowLayout={rowLayout}
        />
      ) : null}
      {!omitPanoramaDuplicates ? (
        <PanoramicaStringField label="Cantiere" value={fields.cantiere} fieldLayout={fieldLayout} rowLayout={rowLayout} />
      ) : null}
      {showUtilizzatore ? (
        <PanoramicaStringField
          label="Utilizzatore"
          value={fields.utilizzatore}
          fieldLayout={fieldLayout}
          rowLayout={rowLayout}
        />
      ) : null}
      <GestionaleInfoSubgroup title="Identificazione">
        <PanoramicaStringField label="Targa" value={fields.targa} mono strong fieldLayout={fieldLayout} rowLayout={rowLayout} />
        <PanoramicaStringField label="Matricola" value={fields.matricola} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
        {hasPanoramicaFieldValue(fields.nScuderia) ? (
          <PanoramicaStringField label="Scuderia" value={fields.nScuderia} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
        ) : null}
      </GestionaleInfoSubgroup>
      <GestionaleInfoSubgroup title="Attrezzatura">
        <PanoramicaStringField label="Tipo" value={fields.tipoAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
        <PanoramicaStringField label="Marca" value={fields.marcaAttrezzatura} strong fieldLayout={fieldLayout} rowLayout={rowLayout} />
        <PanoramicaStringField label="Modello" value={fields.modelloAttrezzatura} fieldLayout={fieldLayout} rowLayout={rowLayout} />
      </GestionaleInfoSubgroup>
      <GestionaleInfoSubgroup title="Telaio">
        <PanoramicaStringField label="Tipo" value={fields.tipoTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
        <PanoramicaStringField label="Marca" value={fields.marcaTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
        <PanoramicaStringField label="Modello" value={fields.modelloTelaio} fieldLayout={fieldLayout} rowLayout={rowLayout} />
      </GestionaleInfoSubgroup>
    </>
  );
}

/** Vista read-only stile tab Panoramica — riusabile in hub e portale clienti. */
export function SchedaIngressoPanoramicaView({
  fields,
  sections = { ingresso: true, anagrafica: true, intervento: true },
  addettoPillStyle: addettoPillStyleProp,
  showAddettoAccettazione = true,
  showNoteIntervento = true,
  omitPanoramaDuplicates = false,
  densePanorama = false,
  portalMezzoSplit = false,
  rowLayout = "grid",
  fieldLayout = "rows",
  portalIngressoLayout = false,
}: {
  fields: SchedaIngressoFields;
  sections?: SchedaIngressoPanoramicaSections;
  addettoPillStyle?: CSSProperties;
  /** Portale clienti: nasconde l'addetto officina. */
  showAddettoAccettazione?: boolean;
  /** Portale clienti: nasconde le note intervento. */
  showNoteIntervento?: boolean;
  /** Portale dettaglio: nasconde campi già mostrati nella card Panoramica. */
  omitPanoramaDuplicates?: boolean;
  /** Portale dettaglio: layout più compatto (griglia 3 col, card compatta). */
  densePanorama?: boolean;
  /** Portale dettaglio: card Attrezzatura e Telaio separate. */
  portalMezzoSplit?: boolean;
  /** Solo con `fieldLayout="rows"`: `stacked` = label sopra valore, 2 campi per riga. */
  rowLayout?: GestionaleInfoRowLayout;
  fieldLayout?: SchedaIngressoPanoramicaFieldLayout;
  /** Modal ingresso portale: anomalia in cima, griglia 3 colonne. */
  portalIngressoLayout?: boolean;
}) {
  const globalOpts = useGlobalOptions({ enabled: sections.ingresso === true && showAddettoAccettazione });
  const addettoPillStyle =
    addettoPillStyleProp ??
    (fields.addettoAccettazione.trim()
      ? readablePillStyleFromHex(
          addettoDisplayColor(fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors),
        )
      : undefined);

  const cardsWrapperClass = fieldLayout === "tiles" ? "grid min-w-0 gap-4 lg:grid-cols-2" : "";
  const Wrapper = fieldLayout === "tiles" ? "div" : Fragment;
  const interventoCardClass = fieldLayout === "tiles" ? "lg:col-span-2" : "";

  const descrizioneAnomaliaField = (spanFull = true, gridCellClassName?: string) => (
    <PanoramicaCustomField
      label="Descrizione anomalia"
      fieldLayout={fieldLayout}
      rowLayout={rowLayout}
      spanFull={spanFull}
      gridCellClassName={gridCellClassName}
      dense={densePanorama}
      portalIngressoLayout={portalIngressoLayout}
    >
      {multilineValue(fields.descrizioneAnomalia)}
    </PanoramicaCustomField>
  );

  const anomaliaInIngressoTop = portalIngressoLayout && !omitPanoramaDuplicates;
  const anomaliaInIntervento = !anomaliaInIngressoTop && !omitPanoramaDuplicates;

  return (
    <Wrapper {...(fieldLayout === "tiles" ? { className: cardsWrapperClass } : {})}>
      {sections.ingresso ? (
        <GestionaleInfoCard
          title={omitPanoramaDuplicates ? "Accettazione" : "Ingresso"}
          compact={densePanorama}
        >
          <PanoramicaFieldsShell
            fieldLayout={fieldLayout}
            rowLayout={rowLayout}
            dense={densePanorama}
            portalIngressoLayout={portalIngressoLayout}
          >
            {anomaliaInIngressoTop ? descrizioneAnomaliaField() : null}
            {!omitPanoramaDuplicates ? (
              <PanoramicaStringField
                label="Data ingresso"
                value={fields.dataIngresso}
                strong
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            ) : null}
            {showAddettoAccettazione ? (
              <PanoramicaCustomField
                label={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              >
                <HubModalPanoramicaStatusPill
                  value={hubPanoramicaDisplayValue(fields.addettoAccettazione)}
                  pillStyle={addettoPillStyle}
                />
              </PanoramicaCustomField>
            ) : null}
            {omitPanoramaDuplicates ? (
              <PanoramicaCustomField
                label="Richiedente"
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
                dense={densePanorama}
                portalIngressoLayout={portalIngressoLayout}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="min-w-0 text-[color:var(--cab-text)]">
                    {hubPanoramicaDisplayValue(fields.richiedente)}
                  </span>
                  <RichiedenteFirmaDisplay dataUrl={fields.richiedenteFirma} consultable buttonOnly />
                </div>
              </PanoramicaCustomField>
            ) : (
              <PanoramicaStringField
                label="Richiedente"
                value={fields.richiedente}
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              />
            )}
            {hasSignatureDataUrl(fields.richiedenteFirma ?? "") && !omitPanoramaDuplicates ? (
              <PanoramicaCustomField
                label="Firma richiedente"
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
              >
                <RichiedenteFirmaDisplay dataUrl={fields.richiedenteFirma} consultable />
              </PanoramicaCustomField>
            ) : null}
            {omitPanoramaDuplicates ? descrizioneAnomaliaField(false, "sm:col-span-2") : null}
          </PanoramicaFieldsShell>
        </GestionaleInfoCard>
      ) : null}

      {sections.anagrafica ? (
        portalMezzoSplit ? (
          <SchedaIngressoPortalMezzoSplit
            fields={fields}
            fieldLayout={fieldLayout}
            rowLayout={rowLayout}
            densePanorama={densePanorama}
          />
        ) : (
          <GestionaleInfoCard title="Anagrafica intervento" compact={densePanorama}>
            <SchedaIngressoPanoramicaAnagraficaContent
              fields={fields}
              rowLayout={rowLayout}
              fieldLayout={fieldLayout}
              omitPanoramaDuplicates={omitPanoramaDuplicates}
              densePanorama={densePanorama}
              portalIngressoLayout={portalIngressoLayout}
            />
          </GestionaleInfoCard>
        )
      ) : null}

      {sections.intervento ? (
        <GestionaleInfoCard title="Intervento" className={interventoCardClass} compact={densePanorama}>
          <PanoramicaFieldsShell
            fieldLayout={fieldLayout}
            rowLayout={rowLayout}
            dense={densePanorama}
            portalIngressoLayout={portalIngressoLayout}
          >
            <PanoramicaStringField label="Km" value={fields.km} mono fieldLayout={fieldLayout} rowLayout={rowLayout} />
            <PanoramicaStringField
              label="Ore lavoro"
              value={fields.oreLavoro}
              mono
              fieldLayout={fieldLayout}
              rowLayout={rowLayout}
            />
            <PanoramicaStringField
              label="Livello carburante"
              value={formatLivelloCarburanteDisplay(fields.livelloCarburante)}
              fieldLayout={fieldLayout}
              rowLayout={rowLayout}
            />
            {!anomaliaInIntervento ? null : descrizioneAnomaliaField()}
            {showNoteIntervento ? (
              <PanoramicaCustomField
                label="Note intervento"
                fieldLayout={fieldLayout}
                rowLayout={rowLayout}
                spanFull
              >
                {multilineValue(fields.noteIntervento)}
              </PanoramicaCustomField>
            ) : null}
          </PanoramicaFieldsShell>
        </GestionaleInfoCard>
      ) : null}
    </Wrapper>
  );
}
