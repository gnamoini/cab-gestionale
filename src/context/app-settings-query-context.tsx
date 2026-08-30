"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  useCabAppSettingsPayloadQuery,
  type CabAppSettingsQueryPayload,
} from "@/src/hooks/gestionale/use-settings-queries";

const AppSettingsQueryContext = createContext<UseQueryResult<CabAppSettingsQueryPayload, Error> | null>(
  null,
);

/** Owner unico fetch settings STATIC — montare una volta sotto QueryProvider. */
export function AppSettingsQueryProvider({ children }: { children: ReactNode }) {
  const q = useCabAppSettingsPayloadQuery({ tier: "static", owner: true });
  const value = useMemo(() => q, [q]);
  return <AppSettingsQueryContext.Provider value={value}>{children}</AppSettingsQueryContext.Provider>;
}

export function useSharedAppSettingsQuery(): UseQueryResult<CabAppSettingsQueryPayload, Error> | null {
  return useContext(AppSettingsQueryContext);
}
