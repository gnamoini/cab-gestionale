import type { ClienteAnagrafica, ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";

/** Copia sede operativa → legale (checkbox attiva). */
export function syncSedeLegaleFromOperativa(operativa: ClienteSedeFields): ClienteSedeFields {
  return { ...operativa };
}

export function patchClienteSedeOperativa(
  model: ClienteAnagrafica,
  patch: Partial<ClienteSedeFields>,
): ClienteAnagrafica {
  const operativa = { ...model.sedi.operativa, ...patch };
  const legale = model.sedeLegaleUgualeOperativa
    ? syncSedeLegaleFromOperativa(operativa)
    : model.sedi.legale;
  return { ...model, sedi: { operativa, legale } };
}

export function patchClienteSedeLegale(
  model: ClienteAnagrafica,
  patch: Partial<ClienteSedeFields>,
): ClienteAnagrafica {
  return {
    ...model,
    sedi: { ...model.sedi, legale: { ...model.sedi.legale, ...patch } },
  };
}

export function setSedeLegaleUgualeOperativa(
  model: ClienteAnagrafica,
  uguale: boolean,
): ClienteAnagrafica {
  if (!uguale) {
    return { ...model, sedeLegaleUgualeOperativa: false };
  }
  return {
    ...model,
    sedeLegaleUgualeOperativa: true,
    sedi: {
      ...model.sedi,
      legale: syncSedeLegaleFromOperativa(model.sedi.operativa),
    },
  };
}
