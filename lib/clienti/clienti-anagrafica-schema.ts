import { z } from "zod";
import { CLIENTE_CONTATTO_TIPO_OPTIONS } from "@/lib/clienti/clienti-anagrafica-types";

const sedeFieldsSchema = z.object({
  via: z.string().max(200).optional().default(""),
  numeroCivico: z.string().max(20).optional().default(""),
  cap: z.string().max(10).optional().default(""),
  citta: z.string().max(120).optional().default(""),
  provincia: z.string().max(10).optional().default(""),
  stato: z.string().max(60).optional().default("IT"),
});

export const clienteContattoSchema = z.object({
  id: z.string().uuid(),
  etichetta: z.string().trim().min(1).max(120),
  tipo: z.enum(CLIENTE_CONTATTO_TIPO_OPTIONS as [string, ...string[]]),
  valore: z.string().trim().min(1).max(500),
  ordine: z.number().int().min(0),
});

export const clienteAnagraficaUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  nomeDisplay: z.string().trim().min(1).max(200),
  ragioneSociale: z.string().max(300).optional().default(""),
  partitaIva: z.string().max(20).optional().default(""),
  codiceDestinatario: z.string().max(10).optional().default(""),
  sedeLegaleUgualeOperativa: z.boolean().optional().default(false),
  note: z.string().max(2000).optional().default(""),
  sedi: z.object({
    operativa: sedeFieldsSchema,
    legale: sedeFieldsSchema,
  }),
  contatti: z.array(clienteContattoSchema).max(50),
});

export type ClienteAnagraficaUpsertInput = z.infer<typeof clienteAnagraficaUpsertSchema>;
