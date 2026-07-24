"use server";

import { spawnSync } from "node:child_process";
import { tailOutput } from "@/lib/ci/gate-output";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";
import { fetchProductionReadinessDbSnapshot } from "@/lib/production/fetch-production-readiness-db";
import { validateProductionReadiness } from "@/lib/production/production-readiness";
import type { ProductionReadinessCategory, ProductionReadinessResult } from "@/lib/production/production-readiness-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { invalidateServerRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth.server";

import {
  resolvePilotSettingsState,
  type PilotControlStatus,
} from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";

export type ChecklistStatus = "ok" | "fail" | "skip";

export type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  explanation?: string;
  category: ProductionReadinessCategory | "build" | "test" | "runtime";
  source?: string;
};

export type SecurityReleaseControlPayload = {
  pilot: PilotControlStatus;
  readiness: ProductionReadinessResult;
  checklist: ChecklistItem[];
};

async function readPilotDbFlag(): Promise<boolean> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
    .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
    .maybeSingle();
  if (error) return false;
  return parseOperatorGlobalSettingsDbEnabled(data?.value);
}

function runLocalCheck(
  cmd: string,
  args: string[],
  timeoutMs: number,
  env?: NodeJS.ProcessEnv,
): { ok: boolean; output: string } {
  const r = spawnSync(cmd, args, {
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd(),
    env: { ...process.env, ...env },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  return { ok: r.status === 0, output: out };
}

const DEV_BUILD_SKIP_EXPLANATION =
  "Build Next.js non eseguibile con il dev server attivo (conflitto .next). Fermare npm run dev ed eseguire npm run ci:build in terminale, oppure affidarsi al workflow release-gate in CI.";

function shouldSkipBuildInDev(): boolean {
  return process.env.NODE_ENV === "development" && process.env.SECURITY_RELEASE_RUN_BUILD !== "1";
}

function findingSource(detail?: string): string | undefined {
  if (!detail) return undefined;
  const m = detail.match(/[A-Za-z0-9_./-]+\.(ts|tsx|sql):\d+/);
  return m?.[0] ?? detail;
}

function failItem(
  id: string,
  label: string,
  category: ChecklistItem["category"],
  explanation: string,
  source?: string,
): ChecklistItem {
  return { id, label, category, status: "fail", explanation, source };
}

function okItem(id: string, label: string, category: ChecklistItem["category"], source?: string): ChecklistItem {
  return { id, label, category, status: "ok", source };
}

function skipItem(
  id: string,
  label: string,
  category: ChecklistItem["category"],
  source?: string,
  explanation = "Non eseguito in questa run. Usa «Esegui checklist completa».",
): ChecklistItem {
  return {
    id,
    label,
    category,
    status: "skip",
    explanation,
    source,
  };
}

function ensureSecurityRole(allowed: boolean): { ok: false; message: string } | null {
  if (!allowed) return { ok: false, message: "Accesso riservato agli utenti con can_manage_security." };
  return null;
}

export async function getPilotControlStatusAction(): Promise<
  { ok: true; status: PilotControlStatus } | { ok: false; message: string }
> {
  const allowed = await verifyServerPageWrite("sicurezza");
  const denied = ensureSecurityRole(allowed);
  if (denied) return denied;

  const dbEnabled = await readPilotDbFlag();
  return {
    ok: true,
    status: resolvePilotSettingsState(dbEnabled),
  };
}

export async function setPilotDbOverrideAction(
  enabled: boolean,
): Promise<{ ok: true; status: PilotControlStatus } | { ok: false; message: string }> {
  const allowed = await verifyServerPageWrite("sicurezza");
  const denied = ensureSecurityRole(allowed);
  if (denied) return denied;

  const sb = await createSupabaseServerUserClient();
  const payload = { enabled };
  const { error } = await sb.from("app_settings").upsert(
    {
      module: OPERATOR_GLOBAL_SETTINGS_MODULE,
      key: OPERATOR_GLOBAL_SETTINGS_KEY,
      value: payload,
    },
    { onConflict: "module,key" },
  );
  if (error) return { ok: false, message: error.message };

  invalidateServerRuntimeTruth();

  return {
    ok: true,
    status: resolvePilotSettingsState(enabled),
  };
}

export async function runSecurityReleaseControlAction(
  includeBuildChecks = true,
): Promise<{ ok: true; payload: SecurityReleaseControlPayload } | { ok: false; message: string }> {
  const allowed = await verifyServerPageWrite("sicurezza");
  const denied = ensureSecurityRole(allowed);
  if (denied) return denied;

  const dbEnabled = await readPilotDbFlag();
  const pilot = resolvePilotSettingsState(dbEnabled);

  const dbSnapshot = await fetchProductionReadinessDbSnapshot();
  const { scanProductionReadinessCode } = await import("@/lib/production/production-readiness-scan");
  const readiness = validateProductionReadiness({
    db: dbSnapshot,
    codeScan: scanProductionReadinessCode(),
    requireDb: false,
  });

  const blockersById = new Map(readiness.findings.blockers.map((f) => [f.id, f]));
  const warningsById = new Map(readiness.findings.warnings.map((f) => [f.id, f]));

  const checklist: ChecklistItem[] = [];
  const failFromFinding = (id: string, label: string, fallback: string, category: ChecklistItem["category"]) => {
    const f = blockersById.get(id) ?? warningsById.get(id);
    if (f) {
      checklist.push(failItem(id, label, category, f.message, findingSource(f.detail)));
      return true;
    }
    return false;
  };

  if (
    !failFromFinding(
      "security-portal-acl-missing",
      "Sicurezza RLS attiva (app_settings restricted)",
      "Guard app_settings assente",
      "security",
    ) &&
    !failFromFinding(
      "security-user-permissions-rls-missing",
      "Sicurezza RLS attiva (app_settings restricted)",
      "Enforcement user_permissions assente",
      "security",
    )
  ) {
    checklist.push(okItem("rls-restricted", "Sicurezza RLS attiva (app_settings restricted)", "security", "supabase/migrations"));
  }

  if (dbSnapshot.documentiBucketPublic === false) {
    checklist.push(okItem("bucket-private", "Bucket documenti private (public = false)", "storage", "storage.buckets.documenti"));
  } else {
    checklist.push(
      failItem(
        "bucket-private",
        "Bucket documenti private (public = false)",
        "storage",
        "Bucket documenti non privato o non verificabile.",
        "storage.buckets.documenti",
      ),
    );
  }

  if (
    !failFromFinding(
      "storage-legacy-document-urls",
      "Solo signed URL attivi per documenti",
      "URL legacy trovati in documenti.url_file",
      "storage",
    ) &&
    !failFromFinding(
      "storage-public-url-in-code",
      "Solo signed URL attivi per documenti",
      "Pattern public URL nel codice",
      "storage",
    ) &&
    !failFromFinding(
      "storage-resolve-documento-legacy",
      "Solo signed URL attivi per documenti",
      "API resolveDocumento legacy presente",
      "storage",
    )
  ) {
    checklist.push(okItem("signed-url-only", "Solo signed URL attivi per documenti", "storage", "lib/documenti/documenti-db-mapper.ts"));
  }

  if (
    !failFromFinding(
      "security-user-permissions-rls-missing",
      "user_permissions enforced in RLS",
      "user_permissions non enforced",
      "rbac",
    ) &&
    !failFromFinding(
      "security-user-permissions-module-mismatch",
      "user_permissions enforced in RLS",
      "Moduli UI/DB non allineati",
      "rbac",
    )
  ) {
    checklist.push(okItem("user-permissions-rls", "user_permissions enforced in RLS", "rbac", "supabase/migrations"));
  }

  // Heuristic runtime check: nessun finding security relativo a leak/login.
  if (readiness.findings.blockers.some((f) => f.category === "security")) {
    checklist.push(
      failItem(
        "login-enumeration",
        "login enumeration mitigata (no leak ruoli)",
        "runtime",
        "Sono presenti blocker security: verificare il flusso login e i messaggi di errore.",
      ),
    );
  } else {
    checklist.push(okItem("login-enumeration", "login enumeration mitigata (no leak ruoli)", "runtime"));
  }

  if (warningsById.has("ux-realtime-polling-fallback")) {
    const f = warningsById.get("ux-realtime-polling-fallback");
    checklist.push(
      failItem(
        "realtime-stable",
        "realtime stabilizzato (no polling doppio)",
        "runtime",
        f?.message ?? "Fallback polling attivo insieme al realtime channel.",
        findingSource(f?.detail),
      ),
    );
  } else {
    checklist.push(okItem("realtime-stable", "realtime stabilizzato (no polling doppio)", "runtime", "src/components/gestionale-realtime-bridge.tsx"));
  }

  if (readiness.findings.blockers.some((f) => f.id.includes("magazzino"))) {
    checklist.push(
      failItem(
        "stock-race",
        "scorta magazzino stabile (no race optimistic)",
        "runtime",
        "Rilevati blocker collegati al magazzino/consistenza scorte.",
      ),
    );
  } else {
    checklist.push(okItem("stock-race", "scorta magazzino stabile (no race optimistic)", "runtime", "src/lib/react-query"));
  }

  if (includeBuildChecks) {
    const tsc = runLocalCheck("npm", ["run", "ci:tsc"], 120_000);
    checklist.push(
      tsc.ok
        ? okItem("tsc-ok", "build TypeScript OK", "build", "npm run ci:tsc")
        : failItem("tsc-ok", "build TypeScript OK", "build", "Typecheck fallito.", tailOutput(tsc.output)),
    );

    if (shouldSkipBuildInDev()) {
      checklist.push(
        skipItem("next-build-ok", "build Next.js OK", "build", "npm run ci:build", DEV_BUILD_SKIP_EXPLANATION),
      );
    } else {
      const nextBuild = runLocalCheck("npm", ["run", "ci:build"], 300_000, { NODE_ENV: "production" });
      checklist.push(
        nextBuild.ok
          ? okItem("next-build-ok", "build Next.js OK", "build", "npm run ci:build")
          : failItem("next-build-ok", "build Next.js OK", "build", "Build Next.js fallita.", tailOutput(nextBuild.output)),
      );
    }

    const permTest = runLocalCheck("npm", ["run", "test:permissions"], 120_000);
    checklist.push(
      permTest.ok
        ? okItem("permissions-test-ok", "test permissions OK", "test", "npm run test:permissions")
        : failItem(
            "permissions-test-ok",
            "test permissions OK",
            "test",
            "Test permissions fallito.",
            tailOutput(permTest.output),
          ),
    );
  } else {
    checklist.push(skipItem("tsc-ok", "build TypeScript OK", "build", "npm run ci:tsc"));
    checklist.push(skipItem("next-build-ok", "build Next.js OK", "build", "npm run ci:build"));
    checklist.push(skipItem("permissions-test-ok", "test permissions OK", "test", "npm run test:permissions"));
  }

  return { ok: true, payload: { pilot, readiness, checklist } };
}
