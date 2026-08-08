import "../globals-gestionale-shell.css";

import { dehydrate } from "@tanstack/react-query";
import { DeferredFormUxBoundaryBootstrap } from "@/components/form-ux-migration/deferred-form-ux-boundary-bootstrap";
import { AppProvidersGestionale } from "@/components/app-providers-gestionale";
import { AppShell } from "@/components/gestionale/app-shell";
import { GestionaleAuthGate } from "@/components/gestionale/gestionale-auth-gate";
import { GestionaleSettingsReadyGate } from "@/components/gestionale/gestionale-settings-ready-gate";
import { GestionaleTopNoticeProvider } from "@/components/gestionale/gestionale-top-notice";
import { RbacPageGuard } from "@/components/gestionale/rbac-page-guard";
import { OperatorGlobalSettingsProvider } from "@/src/context/operator-global-settings-context";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionaleLayoutSettings,
} from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function GestionaleLayout({ children }: { children: React.ReactNode }) {
  const qc = createServerQueryClient();
  await prefetchGestionaleLayoutSettings(qc);

  return (
    <GestionaleHydrationBoundary state={dehydrate(qc)} boundary="layout">
      <AppProvidersGestionale>
        <AppShell>
          <DeferredFormUxBoundaryBootstrap />
          <GestionaleTopNoticeProvider>
            <GestionaleAuthGate>
              <GestionaleSettingsReadyGate>
                <OperatorGlobalSettingsProvider>
                  <RbacPageGuard>{children}</RbacPageGuard>
                </OperatorGlobalSettingsProvider>
              </GestionaleSettingsReadyGate>
            </GestionaleAuthGate>
          </GestionaleTopNoticeProvider>
        </AppShell>
      </AppProvidersGestionale>
    </GestionaleHydrationBoundary>
  );
}
