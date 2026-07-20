/**
 * Feature flags Report V2 — governance rollout.
 * Distinguish configured (exists in registry) vs enabled (active).
 * Narrative: default ON; server uses REPORT_V2_NARRATIVE, client uses NEXT_PUBLIC_*.
 */

export const REPORT_V2_FLAGS = [
  "reportV2Contracts",
  "reportV2Datasets",
  "reportV2Executive",
  "reportV2DomainDto",
  "reportV2Sections",
  "reportV2Insights",
  "reportV2AiContext",
  "reportV2Narrative",
  "operationalBriefEnabled",
] as const;

export type ReportV2Flag = (typeof REPORT_V2_FLAGS)[number];

const FLAG_ENV: Record<ReportV2Flag, string> = {
  reportV2Contracts: "NEXT_PUBLIC_REPORT_V2_CONTRACTS",
  reportV2Datasets: "NEXT_PUBLIC_REPORT_V2_DATASETS",
  reportV2Executive: "NEXT_PUBLIC_REPORT_V2_EXECUTIVE",
  reportV2DomainDto: "NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO",
  reportV2Sections: "NEXT_PUBLIC_REPORT_V2_SECTIONS",
  reportV2Insights: "NEXT_PUBLIC_REPORT_V2_INSIGHTS",
  reportV2AiContext: "NEXT_PUBLIC_REPORT_V2_AI_CONTEXT",
  reportV2Narrative: "NEXT_PUBLIC_REPORT_V2_NARRATIVE",
  operationalBriefEnabled: "NEXT_PUBLIC_OPERATIONAL_BRIEF_ENABLED",
};

/** Server-only env for narrative API gate (not exposed to client bundle). */
export const REPORT_V2_NARRATIVE_SERVER_ENV = "REPORT_V2_NARRATIVE";

const FLAG_DEFAULT: Partial<Record<ReportV2Flag, boolean>> = {
  reportV2Narrative: true,
  reportV2Executive: true,
  reportV2Insights: true,
  operationalBriefEnabled: true,
};

export function isReportV2FlagConfigured(flag: string): flag is ReportV2Flag {
  return (REPORT_V2_FLAGS as readonly string[]).includes(flag);
}

export function parseReportV2FlagEnabled(value: unknown): boolean | null {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return null;
}

function parseEnvBoolean(raw: string | undefined): boolean | null {
  const trimmed = raw?.trim();
  if (trimmed === "1" || trimmed === "true") return true;
  if (trimmed === "0" || trimmed === "false") return false;
  return null;
}

/** Static reads — Next.js only inlines literal `process.env.NEXT_PUBLIC_*` on the client. */
function readEnvFlag(flag: ReportV2Flag): boolean | null {
  switch (flag) {
    case "reportV2Contracts":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_CONTRACTS);
    case "reportV2Datasets":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_DATASETS);
    case "reportV2Executive":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE);
    case "reportV2DomainDto":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO);
    case "reportV2Sections":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_SECTIONS);
    case "reportV2Insights":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS);
    case "reportV2AiContext":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT);
    case "reportV2Narrative":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE);
    case "operationalBriefEnabled":
      return parseEnvBoolean(process.env.NEXT_PUBLIC_OPERATIONAL_BRIEF_ENABLED);
    default: {
      const _exhaustive: never = flag;
      return parseEnvBoolean(process.env[FLAG_ENV[_exhaustive]]);
    }
  }
}

function readServerNarrativeEnv(): boolean | null {
  return parseEnvBoolean(process.env[REPORT_V2_NARRATIVE_SERVER_ENV]);
}

function resolveFlagEnabled(flag: ReportV2Flag, dbFlag?: boolean | null): boolean {
  const env = readEnvFlag(flag);
  if (env != null) return env;
  if (dbFlag != null) return dbFlag;
  return FLAG_DEFAULT[flag] ?? false;
}

/** Env > db > default. Non-narrative flags default off. */
export function isReportV2FlagEnabled(flag: ReportV2Flag, dbFlag?: boolean | null): boolean {
  if (flag === "reportV2Narrative") {
    return resolveReportV2NarrativeEnabledClient(dbFlag);
  }
  return resolveFlagEnabled(flag, dbFlag);
}

export function resolveReportV2ContractsEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2Contracts", dbFlag);
}

export function resolveReportV2DatasetsEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2Datasets", dbFlag);
}

export function resolveReportV2ExecutiveEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2Executive", dbFlag);
}

export function resolveReportV2DomainDtoEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2DomainDto", dbFlag);
}

export function resolveReportV2SectionsEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2Sections", dbFlag);
}

export function resolveReportV2InsightsEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2Insights", dbFlag);
}

export function resolveReportV2AiContextEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("reportV2AiContext", dbFlag);
}

/** Server narrative gate — reads REPORT_V2_NARRATIVE. Env > db > default (ON). */
export function resolveReportV2NarrativeEnabled(dbFlag?: boolean | null): boolean {
  const env = readServerNarrativeEnv();
  if (env != null) return env;
  if (dbFlag != null) return dbFlag;
  return FLAG_DEFAULT.reportV2Narrative ?? false;
}

/** Client narrative UI — reads NEXT_PUBLIC_REPORT_V2_NARRATIVE. Env > db > default (ON). */
export function resolveReportV2NarrativeEnabledClient(dbFlag?: boolean | null): boolean {
  const env = readEnvFlag("reportV2Narrative");
  if (env != null) return env;
  if (dbFlag != null) return dbFlag;
  return FLAG_DEFAULT.reportV2Narrative ?? false;
}

export function resolveOperationalBriefEnabled(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("operationalBriefEnabled", dbFlag);
}

export function resolveOperationalBriefEnabledClient(dbFlag?: boolean | null): boolean {
  return resolveFlagEnabled("operationalBriefEnabled", dbFlag);
}
