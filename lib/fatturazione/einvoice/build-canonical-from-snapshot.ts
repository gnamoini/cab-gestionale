import type { CanonicalElectronicInvoice, InvoiceLine, Party, VatSummary } from "@/lib/accounting/einvoice/canonical/model";
import type { SchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
import { isSchemaSupportedDocumentType } from "@/lib/accounting/einvoice/canonical/document-types";
import { resolveEsigibilitaIva } from "@/lib/vat/vat-einvoice-context";
import type { DocumentFiscalContext, VatConfiguration } from "@/lib/vat/types";
import type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function mapPartyFromRecord(
  record: Record<string, unknown>,
  opts?: { isSupplier?: boolean },
): Party {
  const piva = str(record.partita_iva);
  const cf = str(record.codice_fiscale);
  const isPa = Boolean(record.pubblica_amministrazione ?? record.is_pa ?? record.isPublicAdministration);
  return {
    vatIdentity: piva ? { countryCode: str(record.nazione) || "IT", vatNumber: piva } : null,
    fiscalCode: cf || null,
    denomination: str(record.ragione_sociale ?? record.cliente_label) || null,
    firstName: str(record.nome) || null,
    lastName: str(record.cognome) || null,
    address: record.indirizzo
      ? {
          street: str(record.indirizzo),
          postalCode: str(record.cap),
          city: str(record.comune),
          province: str(record.provincia) || null,
          country: str(record.nazione) || "IT",
        }
      : null,
    recipientCode: str(record.codice_destinatario ?? record.codice_sdi) || null,
    pec: str(record.pec) || null,
    fiscalRegime: opts?.isSupplier ? str(record.regime_fiscale) || "RF01" : null,
    isPublicAdministration: isPa,
  };
}

function resolveTransmissionFormat(cliente: Record<string, unknown>, codice: string): "FPR12" | "FPA12" {
  if (Boolean(cliente.pubblica_amministrazione ?? cliente.is_pa)) return "FPA12";
  if (codice.length === 6 && codice !== "000000") return "FPA12";
  return "FPR12";
}

function vatSummaryKey(line: InvoiceLine, esigibilita: string | null, regulatoryRef: string | null): string {
  return [line.vatNature ?? `rate:${line.vatRate}`, esigibilita ?? "", regulatoryRef ?? ""].join("|");
}

function buildVatSummariesFromLines(
  lines: InvoiceLine[],
  fiscalContext: DocumentFiscalContext | null,
): VatSummary[] {
  const stubConfig: VatConfiguration = {
    configuration_id: "00000000-0000-4000-8000-000000000000",
    vat_code_id: "00000000-0000-4000-8000-000000000000",
    vat_code: "STUB",
    description: "Stub",
    rate: 0,
    nature_code: null,
    operation_type_code: "IMPONIBILE",
    direction: "sales",
    deductibility_rate: 100,
    vat_account_id: null,
    vat_register_id: null,
    valid_from: "2000-01-01",
    valid_to: null,
    normative_reference: null,
  };
  const esigibilita = resolveEsigibilitaIva(stubConfig, fiscalContext ?? {});
  const map = new Map<string, VatSummary>();

  for (const line of lines) {
    const key = vatSummaryKey(line, esigibilita, null);
    const existing = map.get(key) ?? {
      vatRate: line.vatRate,
      vatNature: line.vatNature,
      taxableAmount: 0,
      taxAmount: 0,
      vatCollectability: esigibilita,
      regulatoryReference: null,
    };
    existing.taxableAmount += line.netAmount;
    existing.taxAmount += line.vatAmount;
    map.set(key, existing);
  }
  return [...map.values()];
}

export type CanonicalBuildMeta = {
  documentType?: string;
  origine?: string | null;
  references?: CanonicalElectronicInvoice["references"];
  payment?: CanonicalElectronicInvoice["payment"];
  stampDuty?: CanonicalElectronicInvoice["stampDuty"];
  publicAdministration?: CanonicalElectronicInvoice["publicAdministration"];
  fiscalContext?: DocumentFiscalContext | null;
};

export function buildCanonicalFromSnapshot(
  invoiceId: string,
  companyId: string,
  snapshot: InvoiceEmissionSnapshot,
  meta?: CanonicalBuildMeta,
): CanonicalElectronicInvoice {
  const doc = snapshot.documento ?? {};
  const totali = snapshot.totali ?? {};
  const righe = snapshot.righe ?? [];
  const clienteRecord = (snapshot.cliente ?? {}) as Record<string, unknown>;
  const cedenteRecord = (snapshot.cedente ?? {}) as Record<string, unknown>;

  const lines: InvoiceLine[] = righe.map((r, i) => ({
    lineNumber: i + 1,
    description: str(r.descrizione),
    quantity: num(r.quantita) || 1,
    unitPrice: num(r.prezzo_unitario),
    netAmount: num(r.imponibile),
    vatAmount: num(r.iva),
    vatRate: r.vat_rate != null ? num(r.vat_rate) : null,
    vatNature: r.vat_nature ? str(r.vat_nature) : null,
    vatCodeId: r.vat_code_id ? str(r.vat_code_id) : null,
    unitOfMeasure: r.unita_misura ? str(r.unita_misura) : null,
    administrationReference: r.riferimento_amministrazione ? str(r.riferimento_amministrazione) : null,
  }));

  const tipoRaw = str(doc.tipo_documento) || "TD01";
  const tipo: SchemaSupportedDocumentType = isSchemaSupportedDocumentType(tipoRaw) ? tipoRaw : "TD01";

  const supplier = mapPartyFromRecord(cedenteRecord, { isSupplier: true });
  const customer = mapPartyFromRecord(clienteRecord);
  const destCode = str(customer.recipientCode).toUpperCase();
  const transmissionFormat = resolveTransmissionFormat(clienteRecord, destCode);
  const fiscalContext = meta?.fiscalContext ?? null;

  const vatSummaries = buildVatSummariesFromLines(lines, fiscalContext);
  const anno = num(doc.anno);
  const numero = doc.numero != null ? String(doc.numero) : "";

  return {
    schemaVersion: "1.3.1",
    transmissionFormat,
    transmission: {
      sender: {
        countryCode: "IT",
        vatNumber: supplier.vatIdentity?.vatNumber ?? null,
        fiscalCode: supplier.fiscalCode ?? null,
      },
      recipientCode: destCode,
      recipientPec: destCode === "0000000" ? customer.pec : null,
      progressiveTransmissionId: `${anno}-${numero}`,
    },
    supplier,
    customer,
    document: {
      type: tipo,
      number: numero,
      date: str(doc.data_emissione),
      currency: str(doc.currency) || "EUR",
      performanceDate: doc.data_effettuazione ? str(doc.data_effettuazione) : null,
      totalDocumentAmount: num(totali.totale),
    },
    lines,
    vatSummaries,
    totals: {
      netAmount: num(totali.imponibile),
      vatAmount: num(totali.iva),
      grossAmount: num(totali.totale),
      currency: str(doc.currency) || "EUR",
    },
    payment: meta?.payment ?? null,
    references: meta?.references ?? null,
    stampDuty: meta?.stampDuty ?? null,
    publicAdministration: meta?.publicAdministration ?? null,
    metadata: {
      invoiceId,
      companyId,
      cabDocumentKind: meta?.documentType ?? "fattura",
    },
  };
}
