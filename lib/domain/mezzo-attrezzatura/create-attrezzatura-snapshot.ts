export type AttrezzaturaDocumentSnapshot = Readonly<{
  id: string | null;
  marca: string;
  modello: string;
  matricola: string | null;
  tipoAttrezzatura: string | null;
  capturedAt: string;
}>;

export function createAttrezzaturaSnapshot(input: {
  id?: string | null;
  marca: string;
  modello: string;
  matricola?: string | null;
  tipoAttrezzatura?: string | null;
  capturedAt?: string;
}): AttrezzaturaDocumentSnapshot {
  const snap: AttrezzaturaDocumentSnapshot = {
    id: input.id ?? null,
    marca: input.marca.trim(),
    modello: input.modello.trim(),
    matricola: input.matricola?.trim() || null,
    tipoAttrezzatura: input.tipoAttrezzatura?.trim() || null,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
  return Object.freeze(structuredClone(snap));
}
