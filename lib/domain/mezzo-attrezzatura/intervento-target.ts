/** Target intervento lavorazione — colonna DB `target_type`. */
export type InterventoTargetType = "telaio" | "attrezzatura";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LavorazioneTargetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LavorazioneTargetValidationError";
  }
}

export type LavorazioneTargetInsert = {
  target_type: InterventoTargetType;
  attrezzatura_id: string | null;
};

/** Replica CHECK `lavorazioni_target_coerente` — fail-fast prima dell'INSERT. */
export function validateLavorazioneTargetForInsert(
  targetType: unknown,
  attrezzaturaId: unknown,
): LavorazioneTargetInsert {
  if (targetType !== "telaio" && targetType !== "attrezzatura") {
    throw new LavorazioneTargetValidationError("Target intervento obbligatorio (telaio o attrezzatura).");
  }

  const attId =
    attrezzaturaId === null || attrezzaturaId === undefined
      ? null
      : typeof attrezzaturaId === "string"
        ? attrezzaturaId.trim()
        : "";

  if (targetType === "telaio") {
    if (attId) {
      throw new LavorazioneTargetValidationError(
        "Target telaio non ammette attrezzatura_id sulla lavorazione.",
      );
    }
    return { target_type: "telaio", attrezzatura_id: null };
  }

  if (!attId || !UUID_RE.test(attId)) {
    throw new LavorazioneTargetValidationError(
      "Target attrezzatura richiede attrezzatura_id valido.",
    );
  }

  return { target_type: "attrezzatura", attrezzatura_id: attId };
}

export function resolveTargetTypeFromScheda(input: {
  targetType?: InterventoTargetType | null;
  marcaAttrezzatura?: string;
  attrezzaturaId?: string | null;
  matricola?: string;
  tipoAttrezzatura?: string;
}): InterventoTargetType {
  if (input.targetType === "telaio" || input.targetType === "attrezzatura") {
    return input.targetType;
  }
  const hasAttrezzatura = Boolean(
    input.marcaAttrezzatura?.trim() ||
      input.attrezzaturaId?.trim() ||
      input.matricola?.trim() ||
      input.tipoAttrezzatura?.trim(),
  );
  return hasAttrezzatura ? "attrezzatura" : "telaio";
}

export function interventoTargetLabel(
  targetType: InterventoTargetType,
  attrezzaturaLabel?: string,
): string {
  if (targetType === "telaio") return "Telaio";
  const label = attrezzaturaLabel?.trim();
  return label || "Attrezzatura";
}

export function interventoTargetBadge(
  targetType: InterventoTargetType,
  attrezzaturaShort?: string,
): string {
  if (targetType === "telaio") return "TELAIO";
  return attrezzaturaShort?.trim().toUpperCase().slice(0, 12) || "ATT.";
}
