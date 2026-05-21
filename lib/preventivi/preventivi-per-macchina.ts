import type { PreventivoRow } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { mezzoFromLavorazione, preventivoMatchesMezzo } from "@/lib/mezzi/mezzi-hub-merge";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export function mezzoPerFiltroPreventivi(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzi: readonly MezzoGestito[],
): MezzoGestito {
  return findMezzoForLavorazione([...mezzi], lav) ?? mezzoFromLavorazione(lav);
}

export function mergePreventiviPerMacchina(
  localRows: readonly PreventivoRecord[],
  hubRows: readonly PreventivoRow[] | undefined,
  mezzo: MezzoGestito,
): PreventivoRecord[] {
  const byId = new Map<string, PreventivoRecord>();
  for (const p of localRows) {
    if (preventivoMatchesMezzo(mezzo, p)) byId.set(p.id, p);
  }
  for (const row of hubRows ?? []) {
    const stub = preventivoRowToRecordStub(row, null);
    if (preventivoMatchesMezzo(mezzo, stub)) byId.set(stub.id, stub);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime(),
  );
}

export function fmtPreventivoDataTabella(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtPreventivoMarcaModello(p: PreventivoRecord): string {
  const mm = `${p.marcaAttrezzatura ?? ""} ${p.modelloAttrezzatura ?? ""}`.trim();
  return mm || p.macchinaRiassunto?.trim() || "—";
}
