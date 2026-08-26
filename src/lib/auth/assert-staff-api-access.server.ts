import "server-only";

import { getServerSession } from "@/src/lib/auth/get-server-session";
import { isClienteRole } from "@/lib/auth/rbac";
import { isStaffOnlyApiPath } from "@/lib/auth/staff-api-allowlist";

export async function assertStaffApiAccess(pathname: string): Promise<Response | null> {
  if (!isStaffOnlyApiPath(pathname)) return null;
  const session = await getServerSession();
  const user = session.user;
  if (!user) {
    return Response.json({ error: "Non autenticato." }, { status: 401 });
  }
  if (isClienteRole(user)) {
    return Response.json({ error: "Permesso negato." }, { status: 403 });
  }
  return null;
}
