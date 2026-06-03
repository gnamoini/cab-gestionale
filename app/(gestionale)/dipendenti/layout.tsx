import { redirect } from "next/navigation";
import { ACCESS_DENIED_PATH, defaultHomePathForRole } from "@/lib/auth/rbac";
import { getServerCallerRole, verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";

export default async function DipendentiLayout({ children }: { children: React.ReactNode }) {
  const allowed = await verifyServerModuleCan("dipendenti", "read");
  if (!allowed) {
    const role = await getServerCallerRole();
    redirect(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(role))}&denied=dipendenti`);
  }
  return children;
}
