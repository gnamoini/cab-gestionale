"use client";

import { useEffect, useState } from "react";
import { checkUsernameAvailabilityAction } from "@/src/actions/admin-users";
import { normalizeUsername, usernameFieldError } from "@/src/lib/auth/username";

export type UsernameAvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

export function useUsernameAvailability(
  rawUsername: string,
  options?: { excludeUserId?: string | null; enabled?: boolean },
): UsernameAvailabilityState {
  const enabled = options?.enabled !== false;
  const [state, setState] = useState<UsernameAvailabilityState>("idle");

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      return;
    }

    const username = normalizeUsername(rawUsername);
    if (!username) {
      setState("idle");
      return;
    }
    if (usernameFieldError(username)) {
      setState("invalid");
      return;
    }

    let cancelled = false;
    setState("checking");

    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await checkUsernameAvailabilityAction({
          username,
          excludeUserId: options?.excludeUserId,
        });
        if (cancelled) return;
        if (!res.ok) {
          setState("idle");
          return;
        }
        setState(res.available ? "available" : "taken");
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rawUsername, enabled, options?.excludeUserId]);

  return state;
}
