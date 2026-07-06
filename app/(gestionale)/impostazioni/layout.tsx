import { redirect } from "next/navigation";
import { ACCESS_DENIED_PATH, defaultHomePathForRole } from "@/lib/auth/rbac";
import { getServerCallerRole, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export default async function ImpostazioniLayout({ children }: { children: React.ReactNode }) {
  const allowed = await verifyServerPageWrite("impostazioni");
  if (!allowed) {
    const role = await getServerCallerRole();
    redirect(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(role))}&denied=impostazioni`);
  }
  return children;
}
