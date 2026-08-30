"use client";

import { GestionaleNumericField, type GestionaleNumericFieldProps } from "@/components/gestionale/gestionale-numeric-field";
import type { RicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import { RICAMBIO_UNITA_MISURA_DEFAULT } from "@/lib/magazzino/ricambio-unita-misura";
import { resolveQuantityPreset } from "@/lib/core/numeric-input-policy";

export type GestionaleQuantityFieldProps = Omit<GestionaleNumericFieldProps, "preset"> & {
  unitaMisura?: RicambioUnitaMisura;
};

export function GestionaleQuantityField({
  unitaMisura = RICAMBIO_UNITA_MISURA_DEFAULT,
  ...rest
}: GestionaleQuantityFieldProps) {
  return <GestionaleNumericField preset={resolveQuantityPreset(unitaMisura)} {...rest} />;
}
