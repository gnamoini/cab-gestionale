"use client";

import { useEffect, useMemo } from "react";
import { createSubmitLock, type FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";

/** Submit lock per modali button-save o form con getter standalone (senza useFormEngine). */
export function useSubmitLock(): FormSubmitLock {
  const lock = useMemo(() => createSubmitLock(), []);
  useEffect(() => () => lock.release(), [lock]);
  return lock;
}
