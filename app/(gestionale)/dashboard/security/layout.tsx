import { redirect } from "next/navigation";
import { ACCESS_DENIED_PATH, defaultHomePathForRole } from "@/lib/auth/rbac";
import { getServerCallerRole, verifyServerPermission } from "@/src/lib/auth/server-permission-guards";

export default async function SecurityLayout({ children }: { children: React.ReactNode }) {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) {
    const role = await getServerCallerRole();
    redirect(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(defaultHomePathForRole(role))}&denied=security`);
  }
  return children;
}
