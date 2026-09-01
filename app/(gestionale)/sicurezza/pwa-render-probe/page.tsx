"use client";

import { useCallback, useState } from "react";
import { PageLayout } from "@/components/design-system";
import { PwaRenderProbePanel } from "@/components/ops/pwa-render-probe-panel";
import { isPwaRenderAuditEnabled } from "@/lib/observability/pwa-render-audit-gate";
import { dsBtnSecondary, dsTypoBody, dsTypoCaption } from "@/lib/ui/design-system";

function AuditActions() {
  const [auditJson, setAuditJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runAudit = useCallback(async () => {
    setBusy(true);
    try {
      const mod = await import("@/lib/observability/pwa-render-diagnostics");
      mod.initPwaRenderDiagnostics();
      const json = await mod.exportPwaRenderAuditJson();
      setAuditJson(json);
      console.info("[cab:pwa-render-audit]", JSON.parse(json));
    } finally {
      setBusy(false);
    }
  }, []);

  const copyAudit = useCallback(async () => {
    if (!auditJson) return;
    await navigator.clipboard.writeText(auditJson);
  }, [auditJson]);

  return (
    <div className="mb-6 flex min-w-0 flex-nowrap items-center gap-2 sm:flex-wrap">
      <button type="button" className={dsBtnSecondary} disabled={busy} onClick={() => void runAudit()}>
        {busy ? "Raccolta…" : "Raccogli audit JSON"}
      </button>
      {auditJson ? (
        <button type="button" className={dsBtnSecondary} onClick={() => void copyAudit()}>
          Copia JSON
        </button>
      ) : null}
      <p className={dsTypoCaption}>
        Console: <code className="font-mono">await __cabPwaRenderAudit()</code>,{" "}
        <code className="font-mono">await __cabPwaRenderCacheParity()</code>
      </p>
    </div>
  );
}

export default function PwaRenderProbePage() {
  if (!isPwaRenderAuditEnabled()) {
    return (
      <PageLayout title="Audit rendering PWA">
        <p className={dsTypoBody}>
          Pagina diagnostica non attiva. Impostare{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_PWA_RENDER_AUDIT=1</code> e ridistribuire, oppure in
          console: <code className="font-mono text-sm">window.__cabForcePwaRenderAudit = true</code> poi ricaricare.
        </p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Audit rendering PWA">
      <p className={`${dsTypoBody} mb-4 max-w-3xl`}>
        Confrontare questa pagina in browser tab e PWA installata (Windows). Ogni casella isola una tecnica
        compositor. Screenshot side-by-side per cella con difetto visibile.
      </p>
      <AuditActions />
      <PwaRenderProbePanel />
    </PageLayout>
  );
}
