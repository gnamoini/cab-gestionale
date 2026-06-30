import type { ClienteContatto } from "@/lib/clienti/clienti-anagrafica-types";

function reindex(contatti: ClienteContatto[]): ClienteContatto[] {
  return contatti.map((c, i) => ({ ...c, ordine: i }));
}

export function moveClienteContattoUp(contatti: ClienteContatto[], id: string): ClienteContatto[] {
  const idx = contatti.findIndex((c) => c.id === id);
  if (idx <= 0) return contatti;
  const next = [...contatti];
  const [row] = next.splice(idx, 1);
  next.splice(idx - 1, 0, row!);
  return reindex(next);
}

export function moveClienteContattoDown(contatti: ClienteContatto[], id: string): ClienteContatto[] {
  const idx = contatti.findIndex((c) => c.id === id);
  if (idx < 0 || idx >= contatti.length - 1) return contatti;
  const next = [...contatti];
  const [row] = next.splice(idx, 1);
  next.splice(idx + 1, 0, row!);
  return reindex(next);
}

export function removeClienteContatto(contatti: ClienteContatto[], id: string): ClienteContatto[] {
  return reindex(contatti.filter((c) => c.id !== id));
}

export function addClienteContatto(contatti: ClienteContatto[], row: ClienteContatto): ClienteContatto[] {
  return reindex([...contatti, row]);
}
