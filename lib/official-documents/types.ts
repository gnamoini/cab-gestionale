import type { OfficialDocumentEntityType } from "@/lib/official-documents/preview-url";
import type { PreventivoStato } from "@/lib/preventivi/types";

export type StaffOfficialPreventivoDocument = {
  kind: "preventivo";
  id: string;
  numero: string;
  stato: PreventivoStato;
  cliente: string;
  dataCreazione: string;
  totale: number;
  previewPath: string;
  hasPdf: boolean;
};

export type StaffOfficialDdtDocument = {
  kind: "ddt";
  id: string;
  numero: string | null;
  status: string;
  clienteLabel: string;
  dataDocumento: string;
  previewPath: string;
  hasPdf: boolean;
};

export type StaffOfficialDocument = StaffOfficialPreventivoDocument | StaffOfficialDdtDocument;

export type ClientOfficialPreventivoDocument = {
  kind: "preventivo";
  label: string;
  previewPath: string;
  stato: PreventivoStato;
};

export type ClientOfficialDdtDocument = {
  kind: "ddt";
  label: string;
  previewPath: string;
};

export type ClientOfficialDocument = ClientOfficialPreventivoDocument | ClientOfficialDdtDocument;

export type StaffLavorazioneDocumentsPayload = {
  preventivi: StaffOfficialPreventivoDocument[];
  ddt: StaffOfficialDdtDocument[];
};

export type ClientLavorazioneDocumentsPayload = {
  preventivi: ClientOfficialPreventivoDocument[];
  ddt: ClientOfficialDdtDocument[];
};

export type OfficialDocumentEntityTypeExport = OfficialDocumentEntityType;
