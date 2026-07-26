"use client";

import {
  LavorazioneReadOnlyPill,
} from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { addettoPillShellClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  addettoRefFromFields,
  getAddettoDisplayLabel,
  getAddettoPillStyle,
  type AddettoRef,
} from "@/lib/lavorazioni/addetto-display";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

export type AddettoDisplayPillProps = {
  ref: AddettoRef;
  addettiRecords?: readonly AddettoRecord[];
  addettoColors?: Record<string, string>;
  emptyLabel?: string;
  fullWidth?: boolean;
  dynamicWidth?: boolean;
  className?: string;
};

export function AddettoDisplayPill({
  ref: addettoRef,
  addettiRecords: recordsProp,
  addettoColors: colorsProp,
  emptyLabel = "—",
  fullWidth = true,
  dynamicWidth = false,
  className = "",
}: AddettoDisplayPillProps) {
  const global = useGlobalOptions({ enabled: !recordsProp || !colorsProp });
  const records = recordsProp ?? global.lavorazioni.addettiRecords;
  const colorMap = colorsProp ?? global.lavorazioni.addettoColors;
  const label = getAddettoDisplayLabel(records, addettoRef);
  const shellStyle = getAddettoPillStyle(records, addettoRef, colorMap);

  if (label === emptyLabel || !label.trim()) {
    return (
      <span className={`text-sm text-[color:var(--cab-text-muted)] ${className}`}>{emptyLabel}</span>
    );
  }

  return (
    <LavorazioneReadOnlyPill
      label={label}
      shellClass={`${addettoPillShellClass()} ${className}`}
      shellStyle={shellStyle}
      fullWidth={dynamicWidth ? false : fullWidth}
    />
  );
}

/** Variante compatta per timeline / celle dense. */
export function AddettoBadge({
  ref: addettoRef,
  addettiRecords: recordsProp,
  addettoColors: colorsProp,
  className = "",
}: Omit<AddettoDisplayPillProps, "fullWidth" | "dynamicWidth" | "emptyLabel">) {
  return (
    <AddettoDisplayPill
      ref={addettoRef}
      addettiRecords={recordsProp}
      addettoColors={colorsProp}
      fullWidth={false}
      dynamicWidth
      className={className}
    />
  );
}

export { addettoRefFromFields };
