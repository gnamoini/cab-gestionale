"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoRow,
  GestionaleInfoSubgroup,
} from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaStatusPill,
  hubPanoramicaDisplayValue,
} from "@/components/design-system/hub-modal-panoramica";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL } from "@/lib/schede/scheda-ingresso-ui-labels";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoPanoramicaSections = {
  ingresso?: boolean;
  anagrafica?: boolean;
  intervento?: boolean;
};

function multilineValue(value: string): ReactNode {
  const t = value.trim();
  if (!t) return hubPanoramicaDisplayValue("");
  return <span className="whitespace-pre-wrap text-[color:var(--cab-text)]">{t}</span>;
}

/** Righe anagrafica (senza shell card) — per tab Panoramica hub lavorazioni. */
export function SchedaIngressoPanoramicaAnagraficaContent({ fields }: { fields: SchedaIngressoFields }) {
  return (
    <>
      <GestionaleInfoRow label="Cliente" value={hubPanoramicaDisplayValue(fields.cliente)} strong />
      <GestionaleInfoRow label="Cantiere" value={hubPanoramicaDisplayValue(fields.cantiere)} />
      <GestionaleInfoRow label="Utilizzatore" value={hubPanoramicaDisplayValue(fields.utilizzatore)} />
      <GestionaleInfoSubgroup title="Identificazione">
        <GestionaleInfoRow label="Targa" value={hubPanoramicaDisplayValue(fields.targa)} mono strong />
        <GestionaleInfoRow label="Matricola" value={hubPanoramicaDisplayValue(fields.matricola)} mono />
        <GestionaleInfoRow label="Scuderia" value={hubPanoramicaDisplayValue(fields.nScuderia)} mono />
      </GestionaleInfoSubgroup>
      <GestionaleInfoSubgroup title="Attrezzatura">
        <GestionaleInfoRow label="Tipo" value={hubPanoramicaDisplayValue(fields.tipoAttrezzatura)} />
        <GestionaleInfoRow label="Marca" value={hubPanoramicaDisplayValue(fields.marcaAttrezzatura)} strong />
        <GestionaleInfoRow label="Modello" value={hubPanoramicaDisplayValue(fields.modelloAttrezzatura)} />
      </GestionaleInfoSubgroup>
      <GestionaleInfoSubgroup title="Telaio">
        <GestionaleInfoRow label="Tipo" value={hubPanoramicaDisplayValue(fields.tipoTelaio)} />
        <GestionaleInfoRow label="Marca" value={hubPanoramicaDisplayValue(fields.marcaTelaio)} />
        <GestionaleInfoRow label="Modello" value={hubPanoramicaDisplayValue(fields.modelloTelaio)} />
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
}: {
  fields: SchedaIngressoFields;
  sections?: SchedaIngressoPanoramicaSections;
  addettoPillStyle?: CSSProperties;
  /** Portale clienti: nasconde l'addetto officina. */
  showAddettoAccettazione?: boolean;
}) {
  const globalOpts = useGlobalOptions({ enabled: sections.ingresso === true && showAddettoAccettazione });
  const addettoPillStyle =
    addettoPillStyleProp ??
    (fields.addettoAccettazione.trim()
      ? readablePillStyleFromHex(
          addettoDisplayColor(fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors),
        )
      : undefined);

  return (
    <>
      {sections.ingresso ? (
        <GestionaleInfoCard title="Ingresso">
          <GestionaleInfoRow
            label="Data ingresso"
            value={hubPanoramicaDisplayValue(fields.dataIngresso)}
            strong
          />
          {showAddettoAccettazione ? (
            <GestionaleInfoRow
              label={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
              value={
                <HubModalPanoramicaStatusPill
                  value={hubPanoramicaDisplayValue(fields.addettoAccettazione)}
                  pillStyle={addettoPillStyle}
                />
              }
            />
          ) : null}
          <GestionaleInfoRow label="Richiedente" value={hubPanoramicaDisplayValue(fields.richiedente)} />
        </GestionaleInfoCard>
      ) : null}

      {sections.anagrafica ? (
        <GestionaleInfoCard title="Anagrafica intervento">
          <SchedaIngressoPanoramicaAnagraficaContent fields={fields} />
        </GestionaleInfoCard>
      ) : null}

      {sections.intervento ? (
        <GestionaleInfoCard title="Intervento">
          <GestionaleInfoRow label="Km" value={hubPanoramicaDisplayValue(fields.km)} mono />
          <GestionaleInfoRow label="Ore lavoro" value={hubPanoramicaDisplayValue(fields.oreLavoro)} mono />
          <GestionaleInfoRow label="Livello carburante" value={hubPanoramicaDisplayValue(fields.livelloCarburante)} />
          <GestionaleInfoRow label="Descrizione anomalia" value={multilineValue(fields.descrizioneAnomalia)} />
          <GestionaleInfoRow label="Note intervento" value={multilineValue(fields.noteIntervento)} />
        </GestionaleInfoCard>
      ) : null}
    </>
  );
}
