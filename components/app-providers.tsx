"use client";

import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";
import { AppProvidersCore } from "@/components/app-providers-core";

export function AppProviders({
  children,
  initialAuthSnapshot,
}: {
  children: React.ReactNode;
  initialAuthSnapshot?: ServerAuthSnapshot;
}) {
  return <AppProvidersCore initialAuthSnapshot={initialAuthSnapshot}>{children}</AppProvidersCore>;
}
