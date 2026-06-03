import assert from "node:assert/strict";
import {
  bunderDocumentSnapshot,
  isBunderDocumentDirty,
} from "@/lib/bunder/bunder-document-dirty";
import type { BunderCommercialDocument } from "@/lib/bunder/types";

const base: BunderCommercialDocument = {
  id: "b1",
  kind: "offerta_commerciale",
  numeroProgressivo: "OFV26/0001",
  dataDocumento: "2026-06-02",
  luogo: "Roma",
  aziendaDestinatario: "Cliente Srl",
  indirizzo: "Via Roma 1",
  cap: "00100",
  citta: "Roma",
  referente: "Mario",
  oggetto: "Fornitura",
  settore: "",
  intro: "",
  righe: [],
  condizioni: {
    iva: "",
    resa: "",
    trasporto: "",
    assemblaggio: "",
    consegna: "",
    pagamento: "",
    garanzia: "",
    validitaOfferta: "",
  },
  clausoleLegali: "",
  chiusura: "",
  noteFirma: "",
  riferimentoInterno: "",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
  createdBy: "Admin",
  lastEditedBy: "Admin",
};

const snap = bunderDocumentSnapshot(base);
assert.equal(isBunderDocumentDirty(base, snap), false);
assert.equal(isBunderDocumentDirty({ ...base, oggetto: "Modificato" }, snap), true);

console.log("bunder-document-dirty.test.ts OK");
