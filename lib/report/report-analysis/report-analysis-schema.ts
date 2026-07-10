import { z } from "zod";
import { REPORT_ANALYSIS_SNAPSHOT_FINGERPRINT_MAX } from "@/lib/report/report-analysis/report-analysis-config";

export const reportAnalysisGravitaSchema = z.enum(["info", "warning", "critical"]);

export const reportAnalysisPrioritaLevelSchema = z.enum(["alta", "media", "bassa"]);

export const reportAnalysisConfidenzaSchema = z.enum(["alta", "media", "bassa"]);

export const reportAnalysisKpiSchema = z.object({
  label: z.string().min(1).max(120),
  valore: z.string().min(1).max(64),
  osservazione: z.string().min(1).max(600),
});

export const reportAnalysisAnomaliaSchema = z.object({
  titolo: z.string().min(1).max(200),
  dettaglio: z.string().min(1).max(800),
  gravita: reportAnalysisGravitaSchema,
  confidenza: reportAnalysisConfidenzaSchema.describe(
    "Grado di confidenza dell'insight: alta (dati completi), media (parziali), bassa (pattern debole)",
  ),
});

export const reportAnalysisTrendSchema = z.object({
  titolo: z.string().min(1).max(200),
  dettaglio: z.string().min(1).max(800),
});

export const reportAnalysisCriticitaSchema = z.object({
  titolo: z.string().min(1).max(200),
  dettaglio: z.string().min(1).max(800),
  gravita: z.enum(["warning", "critical"]),
  confidenza: reportAnalysisConfidenzaSchema.describe(
    "Grado di confidenza dell'insight: alta (dati completi), media (parziali), bassa (pattern debole)",
  ),
});

export const reportAnalysisSuggerimentoSchema = z.object({
  azione: z.string().min(1).max(300),
  motivazione: z.string().min(1).max(600),
  priorita: reportAnalysisPrioritaLevelSchema,
  impattoAtteso: z
    .string()
    .min(1)
    .max(400)
    .describe("Impatto operativo o economico atteso dall'azione in una frase"),
});

export const reportAnalysisPrioritaImmediateSchema = z.object({
  azione: z.string().min(1).max(300),
  entro: z.string().min(1).max(64),
});

export const reportAnalysisValutazioneSchema = z.object({
  giudizio: z.string().min(1).max(800),
  punteggio: z.number().int().min(1).max(10),
});

export const reportAnalysisOutputSchema = z.object({
  generatedAt: z.string().min(1).max(40),
  executiveSummary: z.string().min(1).max(1200),
  kpiPrincipali: z.array(reportAnalysisKpiSchema).min(1).max(12),
  anomalieRilevate: z.array(reportAnalysisAnomaliaSchema).max(10),
  trendPositivi: z.array(reportAnalysisTrendSchema).max(10),
  criticita: z.array(reportAnalysisCriticitaSchema).max(10),
  suggerimentiOperativi: z.array(reportAnalysisSuggerimentoSchema).max(10),
  prioritaImmediate: z.array(reportAnalysisPrioritaImmediateSchema).max(8),
  valutazioneGenerale: reportAnalysisValutazioneSchema,
  dataQualityNotes: z.array(z.string().min(1).max(400)).max(5).optional(),
});

export type ReportAnalysisOutput = z.infer<typeof reportAnalysisOutputSchema>;
export type ReportAnalysisGravita = z.infer<typeof reportAnalysisGravitaSchema>;
export type ReportAnalysisPrioritaLevel = z.infer<typeof reportAnalysisPrioritaLevelSchema>;
export type ReportAnalysisConfidenza = z.infer<typeof reportAnalysisConfidenzaSchema>;

/** Context ottimizzato inviato al modello — solo KPI aggregati. */
export const reportAnalysisContextSchema = z.object({
  contextVersion: z.literal(1),
  meta: z.object({
    preset: z.string().max(64),
    compareMode: z.string().max(32),
    periodStart: z.string().max(32),
    periodEnd: z.string().max(32),
    compareStart: z.string().max(32).optional(),
    compareEnd: z.string().max(32).optional(),
  }),
  integrity: z.object({
    status: z.enum(["ok", "degraded", "blocked"]),
    findingCount: z.number().int().min(0),
    manualEntryCount: z.number().int().min(0),
    queryErrors: z.array(z.string().max(64)).max(8),
  }),
  executive: z.object({
    closedInPeriod: z.number().min(0),
    openCount: z.number().min(0),
    avgCloseDays: z.number().nullable(),
    avgCloseDaysCompare: z.number().nullable(),
    mezziInOfficina: z.number().min(0),
    totalMezzi: z.number().min(0),
    totalMaintenanceCost: z.number().min(0),
    ricambiCostPeriod: z.number().min(0),
    manodoperaCostPeriod: z.number().nullable(),
    manodoperaAvailable: z.boolean(),
  }),
  trends: z.object({
    monthlyClosed: z.array(z.object({ month: z.string().max(16), value: z.number().min(0) })).max(12),
    heuristicFaultsMonthly: z.array(z.object({ month: z.string().max(16), value: z.number().min(0) })).max(12),
  }),
  fleet: z.object({
    mezziOperativiProxy: z.number().min(0),
    avgDowntimeDays: z.number().nullable(),
    guastiByTipo: z.array(z.object({ tipo: z.string().max(80), count: z.number().min(0) })).max(5),
    mezziAltaFrequenzaGuasti: z.array(z.string().max(120)).max(5),
    disponibilitaPerCliente: z
      .array(
        z.object({
          cliente: z.string().max(120),
          totalMezzi: z.number().int().min(0),
          mezziInOfficina: z.number().int().min(0),
          disponibilitaPct: z.number().nullable(),
        }),
      )
      .max(12),
    peggiorDisponibilita: z
      .object({
        cliente: z.string().max(120),
        disponibilitaPct: z.number(),
      })
      .nullable()
      .optional(),
  }),
  alerts: z.array(
    z.object({
      id: z.string().max(64),
      severity: z.string().max(16),
      title: z.string().max(200),
    }),
  ).max(16),
  periodKpis: z.array(
    z.object({
      id: z.string().max(64),
      label: z.string().max(120),
      value: z.string().max(64),
    }),
  ).max(12),
  tops: z.object({
    mezzi: z.array(z.object({ label: z.string().max(120), interventi: z.number().min(0) })).max(5),
    clienti: z.array(z.object({ label: z.string().max(120), interventi: z.number().min(0) })).max(5),
    ricambi: z.array(z.object({ label: z.string().max(120), qtaUscita: z.number().min(0) })).max(5),
  }),
  compareDetail: z
    .object({
      openedCur: z.number().min(0),
      openedPrev: z.number().min(0),
      completedCur: z.number().min(0),
      completedPrev: z.number().min(0),
    })
    .optional(),
  operationalDiary: z
    .array(
      z.object({
        workDate: z.string().max(10),
        body: z.string().max(400),
      }),
    )
    .max(62)
    .optional(),
});

export type ReportAnalysisContext = z.infer<typeof reportAnalysisContextSchema>;

export const reportAnalysisRequestSchema = z.object({
  context: reportAnalysisContextSchema,
  snapshotFingerprint: z.string().min(1).max(REPORT_ANALYSIS_SNAPSHOT_FINGERPRINT_MAX),
});

export type ReportAnalysisRequest = z.infer<typeof reportAnalysisRequestSchema>;
