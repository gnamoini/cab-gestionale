import type { CookieOptions } from "@supabase/ssr";

export const AUTH_COOKIE_SUFFIX = "-auth-token" as const;

/** Allineato a `@supabase/ssr` DEFAULT_COOKIE_OPTIONS (400 giorni). */
export const AUTH_PERSISTENT_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export type AuthCookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.includes(AUTH_COOKIE_SUFFIX);
}

export function resolveAuthCookieOptions(
  options: CookieOptions | undefined,
  remember: boolean,
): CookieOptions | undefined {
  if (!options) return options;
  if (options.maxAge === 0) return options;

  if (!remember) {
    const { maxAge: _maxAge, expires: _expires, ...sessionOptions } = options;
    return sessionOptions;
  }

  return {
    ...options,
    maxAge: options.maxAge ?? AUTH_PERSISTENT_COOKIE_MAX_AGE,
    expires: undefined,
  };
}

export function applyRememberToCookiesToSet(
  cookiesToSet: AuthCookieToSet[],
  remember: boolean,
): AuthCookieToSet[] {
  return cookiesToSet.map(({ name, value, options }) => ({
    name,
    value,
    options: isSupabaseAuthCookieName(name)
      ? resolveAuthCookieOptions(options, remember)
      : options,
  }));
}
