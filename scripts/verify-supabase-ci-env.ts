/**
 * Verifica connettività Supabase con env corrente (CI diagnostics).
 */
import { createHash } from "node:crypto";
import { fetchProductionReadinessDbSnapshot } from "../lib/production/fetch-production-readiness-db.impl";

function jwtRole(key: string | undefined): string {
  if (!key?.includes(".")) return "missing-or-not-jwt";
  try {
    const segment = key.split(".")[1] ?? "";
    const pad = "=".repeat((4 - (segment.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8"),
    ) as { role?: string; ref?: string };
    return payload.role ?? "unknown-role";
  } catch {
    return "invalid-jwt";
  }
}

function jwtRef(key: string | undefined): string {
  if (!key?.includes(".")) return "missing";
  try {
    const segment = key.split(".")[1] ?? "";
    const pad = "=".repeat((4 - (segment.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8"),
    ) as { ref?: string };
    return payload.ref ?? "unknown-ref";
  } catch {
    return "invalid-jwt";
  }
}

async function main(): Promise<void> {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`[verify-supabase-ci] missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const serviceSha8 = serviceKey
    ? createHash("sha256").update(serviceKey).digest("hex").slice(0, 8)
    : "missing";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const urlRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";

  console.log(
    `[verify-supabase-ci] lens url=${url.length} anon=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0} service=${serviceKey.length} anonRole=${jwtRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)} serviceRole=${jwtRole(serviceKey)} serviceSha8=${serviceSha8} urlRef=${urlRef} serviceJwtRef=${jwtRef(serviceKey)}`,
  );

  const snap = await fetchProductionReadinessDbSnapshot();
  if (!snap.connected) {
    console.error("[verify-supabase-ci] DB snapshot not connected (see fetch-production-readiness-db logs above)");
    process.exit(1);
  }
  console.log("[verify-supabase-ci] DB snapshot connected");
}

void main().catch((err) => {
  console.error("[verify-supabase-ci]", err instanceof Error ? err.message : err);
  process.exit(1);
});
