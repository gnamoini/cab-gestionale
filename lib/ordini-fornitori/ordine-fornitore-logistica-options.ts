/** Valori fissi select logistica ordine fornitore. */

export const ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES = [
  { value: "cartoni", label: "Cartoni" },
  { value: "a_vista", label: "A vista" },
  { value: "colli", label: "Colli" },
  { value: "fusti", label: "Fusti" },
  { value: "pallet", label: "Pallet" },
  { value: "sacchi", label: "Sacchi" },
  { value: "sfusi", label: "Sfusi" },
  { value: "altro", label: "Altro" },
] as const;

export const ORDINE_FORNITORE_VETTORE_VALUES = [
  { value: "sda", label: "SDA" },
  { value: "tnt", label: "TNT" },
  { value: "poste_italiane", label: "Poste Italiane" },
  { value: "bartolini", label: "Bartolini" },
  { value: "artoni", label: "Artoni" },
  { value: "altro", label: "Altro" },
] as const;

export const ORDINE_FORNITORE_SPEDIZIONE_CURA_VALUES = [
  { value: "mittente", label: "Mittente" },
  { value: "destinatario", label: "Destinatario" },
  { value: "vettore", label: "Vettore" },
] as const;

export const ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES = [
  { value: "vendita", label: "Vendita" },
  { value: "acconto", label: "Acconto" },
  { value: "allestimento", label: "Allestimento" },
  { value: "c_lavorazione", label: "C/Lavorazione" },
  { value: "c_riparazione", label: "C/Riparazione" },
  { value: "c_riparazione_garanzia", label: "C/Riparazione in garanzia" },
  { value: "c_sostituzione", label: "C/Sostituzione" },
  { value: "c_sostituzione_manutenzione", label: "C/Sostituzione per manutenzione" },
  { value: "c_visione", label: "C/Visione" },
  { value: "campionatura", label: "Campionatura" },
  { value: "completamento_fornitura", label: "Completamento fornitura" },
  { value: "garanzia", label: "Garanzia" },
  { value: "noleggio", label: "Noleggio" },
  { value: "omaggio", label: "Omaggio" },
  { value: "preventivo", label: "Preventivo" },
  { value: "reso", label: "Reso" },
  { value: "reso_c_riparazione", label: "Reso c/riparazione effettuata" },
  { value: "trasferimento", label: "Trasferimento" },
] as const;

export const ORDINE_FORNITORE_PORTO_VALUES = [
  { value: "porto_franco", label: "Porto franco" },
  { value: "ex_works", label: "Ex-works" },
  { value: "porto_assegnato", label: "Porto assegnato" },
  { value: "porto_franco_addebito", label: "Porto franco con addebito" },
] as const;

export const ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES = [
  { value: "bonifico_anticipato", label: "Bonifico anticipato" },
  { value: "bonifico_30", label: "Bonifico 30 gg" },
  { value: "bonifico_60", label: "Bonifico 60 gg" },
  { value: "bonifico_90", label: "Bonifico 90 gg" },
  { value: "riba", label: "Ri.Ba." },
  { value: "contanti", label: "Contanti" },
  { value: "assegno", label: "Assegno" },
] as const;
