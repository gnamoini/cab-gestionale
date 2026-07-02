import { isStagingPublicSlice } from "@/lib/env/staging-public";

export type AppEnvironment = "development" | "staging" | "preview" | "production";

const ENV_LABELS: Record<AppEnvironment, string> = {
  development: "Development",
  staging: "Staging",
  preview: "Preview",
  production: "Production",
};

function readPublicEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function readAppVersion(): string {
  return readPublicEnv("NEXT_PUBLIC_APP_VERSION") || "dev";
}

export function readAppCommitShort(): string | null {
  const commit = readPublicEnv("NEXT_PUBLIC_APP_COMMIT");
  return commit || null;
}

export function readAppBuildTime(): string | null {
  const raw = readPublicEnv("NEXT_PUBLIC_APP_BUILD_TIME");
  return raw || null;
}

export function resolveAppEnvironment(): AppEnvironment {
  if (process.env.NODE_ENV === "development") return "development";
  if (isStagingPublicSlice()) return "staging";
  const vercelEnv = readPublicEnv("NEXT_PUBLIC_VERCEL_ENV").toLowerCase();
  if (vercelEnv === "preview") return "preview";
  return "production";
}

export function formatAppEnvironmentLabel(env: AppEnvironment = resolveAppEnvironment()): string {
  return ENV_LABELS[env];
}

function formatBuildTimeIt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Righe footer profilo — omette campi vuoti. */
export function formatAppBuildFooterLines(): string[] {
  const lines: string[] = [`v${readAppVersion()}`, formatAppEnvironmentLabel()];
  const commit = readAppCommitShort();
  if (commit) lines.push(commit);
  const buildTime = readAppBuildTime();
  if (buildTime) lines.push(`Build ${formatBuildTimeIt(buildTime)}`);
  return lines;
}
