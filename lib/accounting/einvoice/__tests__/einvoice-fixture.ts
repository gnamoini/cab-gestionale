import type { InvoiceEmissionSnapshot } from "@/lib/fatturazione/einvoice/invoice-emission-snapshot";

export function baseSnapshot(tipo: string, overrides?: Partial<InvoiceEmissionSnapshot>): InvoiceEmissionSnapshot {
  return {
    cedente: {
      ragione_sociale: "CAB Officina SRL",
      partita_iva: "12345678901",
      codice_fiscale: "12345678901",
      indirizzo: "Via Roma 1",
      cap: "00100",
      comune: "Roma",
      provincia: "RM",
      nazione: "IT",
      regime_fiscale: "RF01",
    },
    cliente: {
      ragione_sociale: "Cliente SPA",
      partita_iva: "98765432109",
      codice_destinatario: "ABCDEFG",
      indirizzo: "Via Milano 2",
      cap: "20100",
      comune: "Milano",
      provincia: "MI",
      nazione: "IT",
    },
    documento: {
      tipo_documento: tipo,
      numero: 42,
      anno: 2026,
      data_emissione: "2026-03-01",
      serie: "DEFAULT",
      currency: "EUR",
    },
    righe: [
      {
        descrizione: "Servizio officina",
        quantita: 1,
        prezzo_unitario: 100,
        imponibile: 100,
        iva: 22,
        vat_rate: 22,
      },
    ],
    totali: { imponibile: 100, iva: 22, totale: 122 },
    ...overrides,
  };
}
