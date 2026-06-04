import { redirect } from "next/navigation";
import { ACCESS_DENIED_PATH, defaultHomePathForRole } from "@/lib/auth/rbac";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { verifyClientePortalScopeServer } from "@/src/lib/auth/cliente-portal-scope.server";
import { getServerCallerRole } from "@/src/lib/auth/server-permission-guards";

export default async function LavorazioniClientiLayout({ children }: { children: React.ReactNode }) {
  const allowed = await verifyClientLavorazioniAccessServer();
  if (!allowed) {
    const role = await getServerCallerRole();
    redirect(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(role))}&denied=lavorazioni_clienti`);
  }
  const scopeOk = await verifyClientePortalScopeServer();
  if (!scopeOk) {
    const role = await getServerCallerRole();
    redirect(
      `${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(role))}&denied=cliente_ref_missing`,
    );
  }
  return <>{children}</>;
}
