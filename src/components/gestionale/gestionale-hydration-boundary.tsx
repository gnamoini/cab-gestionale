"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props = {
  state: DehydratedState;
  children: ReactNode;
};

/** Bridge dehydrate server → React Query client hooks. */
export function GestionaleHydrationBoundary({ state, children }: Props) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
