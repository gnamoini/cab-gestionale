import { FormUxBoundaryBootstrap } from "@/components/form-ux-migration/form-ux-boundary-bootstrap";

import { AppProvidersGestionale } from "@/components/app-providers-gestionale";

import { AppShell } from "@/components/gestionale/app-shell";

import { GestionaleAuthGate } from "@/components/gestionale/gestionale-auth-gate";

import { GestionaleSettingsReadyGate } from "@/components/gestionale/gestionale-settings-ready-gate";

import { GestionaleTopNoticeProvider } from "@/components/gestionale/gestionale-top-notice";

import { RbacPageGuard } from "@/components/gestionale/rbac-page-guard";

import { OperatorGlobalSettingsProvider } from "@/src/context/operator-global-settings-context";



export default async function GestionaleLayout({ children }: { children: React.ReactNode }) {

  return (

    <AppProvidersGestionale>

      <AppShell>

        <FormUxBoundaryBootstrap />

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

  );

}

