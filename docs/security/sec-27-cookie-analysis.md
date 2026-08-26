# SEC-27 — Cookie analysis (remember-me, theme, auth)

## Browser flow

| Cookie | Writer | Reader | HttpOnly | Secure (post-fix) |
|--------|--------|--------|----------|-------------------|
| `cab-auth-remember` | `setAuthRememberPreference` (pre-login) | `readAuthRememberPreference`, SSR cookie readers | No | HTTPS only |
| `cab-theme` | `writeThemeBootCookie`, theme boot IIFE | `resolveServerThemeMode` (SSR), `ThemeProvider` | No | HTTPS only |
| `sb-*-auth-token` | Supabase SSR (`@supabase/ssr`) | middleware, server-user-client, browser-client | Yes (SSR path) | Via Supabase options |

**Remember-me:** UI preference only (`1`/`0`). Not auth — tells Supabase cookie adapter whether to apply persistent `maxAge` on auth cookies after login.

**Theme:** Boot cache for first paint. SSR reads `cab-theme` cookie in `app/layout.tsx`; client syncs `localStorage` + cookie via boot script before React hydration.

## SSR flow

1. Request hits middleware → `readAuthRememberPreferenceFromCookies` → `applyRememberToCookiesToSet` on Supabase session refresh.
2. RSC/layout → `cookies().get("cab-theme")` → `resolveServerThemeMode` → `class="dark"` on `<html>`.
3. Auth cookies set server-side with HttpOnly via Supabase SSR helpers.

## HttpOnly limitations

- `cab-auth-remember` and `cab-theme` are **intentionally readable** in JS (login form, theme boot before bundle). HttpOnly would break boot script and remember checkbox persistence.
- Residual risk: any XSS can read/write these cookies and localStorage mirrors. They do not carry session secrets.
- Auth tokens remain HttpOnly on the SSR-managed path; XSS cannot exfiltrate JWT from `document.cookie` for those names.

## Residual risk

1. **XSS** — primary threat for non-HttpOnly prefs; mitigated by CSP and input hygiene elsewhere.
2. **Local dev HTTP** — `Secure` omitted on `http://localhost`; acceptable for dev.
3. **Logout scope** — SEC-22: client `signOut({ scope: "global" })` revokes refresh token server-side; invalid-session cleanup uses same scope.
4. **Remember-me ≠ session** — toggling remember without re-login does not retroactively change existing auth cookie maxAge until next `setSession`/`setAll`.

## References

- `lib/auth/auth-remember-preference.ts`
- `lib/theme/cab-theme-storage.ts`, `lib/theme/theme-boot-inline-script.ts`
- `src/lib/supabase/middleware-client.ts`, `browser-client.ts`, `server-user-client.ts`
- `docs/bootstrap-hydration.md`
