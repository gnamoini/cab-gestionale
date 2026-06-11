"use client";

import { gateBeginSubmit } from "@/lib/form-ux-migration/form-ux-boundary-gate";
import {
  getSubmitToken as getSubmitTokenCore,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { FormUxFormId, FormUxMigrationMode } from "@/lib/form-ux-migration/types";

type FormUxMigrationOverrides = Partial<Record<string, FormUxMigrationMode>>;

type FormUxMigrationContextValue = {
  formId: FormUxFormId;
  modeOverrides: FormUxMigrationOverrides;
  beginSubmitTransaction: () => FormUxExecutionToken;
  getSubmitToken: () => FormUxExecutionToken | null;
};

const FormUxMigrationContext = createContext<FormUxMigrationContextValue | null>(null);

export type FormUxMigrationProviderProps = {
  formId: FormUxFormId;
  /** DEV-only per-field mode overrides (not persisted). */
  modeOverrides?: FormUxMigrationOverrides;
  children: ReactNode;
};

export function FormUxMigrationProvider({
  formId,
  modeOverrides = {},
  children,
}: FormUxMigrationProviderProps) {
  const beginSubmitTransaction = useCallback(() => gateBeginSubmit(formId), [formId]);
  const getSubmitToken = useCallback(() => getSubmitTokenCore(formId), [formId]);

  const value = useMemo(
    () => ({ formId, modeOverrides, beginSubmitTransaction, getSubmitToken }),
    [formId, modeOverrides, beginSubmitTransaction, getSubmitToken],
  );
  return (
    <FormUxMigrationContext.Provider value={value}>{children}</FormUxMigrationContext.Provider>
  );
}

export function useFormUxMigrationContext(): FormUxMigrationContextValue | null {
  return useContext(FormUxMigrationContext);
}
