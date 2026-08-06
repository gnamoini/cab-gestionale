import type { InterventoTargetTypeScheda, SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoStringKey = Exclude<
  keyof SchedaIngressoFields,
  | "targetType"
  | "attrezzaturaId"
  | "interventoSuAttrezzatura"
  | "interventoSuTelaio"
  | "richiedenteFirma"
  | "addettoFirma"
>;

export function applySchedaIngressoTypedFields(
  out: SchedaIngressoFields,
  raw: Partial<SchedaIngressoFields>,
): void {
  if (raw.targetType === "telaio" || raw.targetType === "attrezzatura") {
    out.targetType = raw.targetType;
  }
  if (raw.attrezzaturaId !== undefined) {
    out.attrezzaturaId = raw.attrezzaturaId;
  }
  if (raw.interventoSuAttrezzatura !== undefined) {
    out.interventoSuAttrezzatura = Boolean(raw.interventoSuAttrezzatura);
  }
  if (raw.interventoSuTelaio !== undefined) {
    out.interventoSuTelaio = Boolean(raw.interventoSuTelaio);
  }
}

export function isSchedaIngressoFieldEmpty(
  key: keyof SchedaIngressoFields,
  value: SchedaIngressoFields[keyof SchedaIngressoFields],
): boolean {
  if (key === "dataIngresso") return false;
  if (key === "targetType") return value !== "telaio" && value !== "attrezzatura";
  if (key === "attrezzaturaId") return !value;
  const t = String(value ?? "").trim();
  if (!t) return true;
  if (t === "—") return true;
  if (key === "matricola" && t.toLowerCase() === "non assegnata") return true;
  return false;
}

export function schedaIngressoFieldHasClientValue(
  key: keyof SchedaIngressoFields,
  client: SchedaIngressoFields,
): boolean {
  if (key === "targetType") {
    return client.targetType === "telaio" || client.targetType === "attrezzatura";
  }
  if (key === "attrezzaturaId") return Boolean(client.attrezzaturaId);
  return Boolean(String(client[key] ?? "").trim());
}

export function copySchedaIngressoFieldFromClient(
  next: SchedaIngressoFields,
  client: SchedaIngressoFields,
  key: keyof SchedaIngressoFields,
): void {
  if (key === "targetType") {
    if (client.targetType === "telaio" || client.targetType === "attrezzatura") {
      next.targetType = client.targetType;
    }
    return;
  }
  if (key === "attrezzaturaId") {
    if (client.attrezzaturaId) next.attrezzaturaId = client.attrezzaturaId;
    return;
  }
  if (key === "richiedenteFirma") {
    if (client.richiedenteFirma) next.richiedenteFirma = client.richiedenteFirma;
    return;
  }
  if (key === "addettoFirma") {
    if (client.addettoFirma) next.addettoFirma = client.addettoFirma;
    return;
  }
  if (key === "addettoAccettazioneId") {
    if (client.addettoAccettazioneId) next.addettoAccettazioneId = client.addettoAccettazioneId;
    return;
  }
  if (key === "interventoSuAttrezzatura") {
    if (client.interventoSuAttrezzatura !== undefined) {
      next.interventoSuAttrezzatura = Boolean(client.interventoSuAttrezzatura);
    }
    return;
  }
  if (key === "interventoSuTelaio") {
    if (client.interventoSuTelaio !== undefined) {
      next.interventoSuTelaio = Boolean(client.interventoSuTelaio);
    }
    return;
  }
  const stringKey = key as SchedaIngressoStringKey;
  next[stringKey] = String(client[stringKey] ?? "");
}

export function normalizeInterventoTargetType(
  value: unknown,
): InterventoTargetTypeScheda | undefined {
  if (value === "telaio" || value === "attrezzatura") return value;
  return undefined;
}
