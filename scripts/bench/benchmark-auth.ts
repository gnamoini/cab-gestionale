import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { BrowserContext, Page } from "playwright";

export function benchCredentials(): { email: string; password: string } | null {
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

async function resolveAdminEmailViaServiceRole(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role_key", "admin")
    .limit(1);
  if (error || !profiles?.[0]?.id) return null;

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profiles[0].id);
  if (userErr) return null;
  return userData.user?.email?.trim() ?? null;
}

async function loginViaUi(page: Page, baseUrl: string, email: string, password: string): Promise<void> {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("smoke-login-identifier").fill(email);
  await page.getByTestId("smoke-login-password").fill(password);
  await page.getByTestId("smoke-login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}

async function applySessionCookies(
  context: BrowserContext,
  baseUrl: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase public env missing");

  const cookiesToSet: { name: string; value: string; options?: CookieOptions }[] = [];
  const serverClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { error } = await serverClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(`setSession: ${error.message}`);

  const { hostname } = new URL(baseUrl);
  await context.addCookies(
    cookiesToSet.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: hostname,
      path: cookie.options?.path ?? "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}

async function loginViaServiceRoleMagicLink(
  context: BrowserContext,
  page: Page,
  baseUrl: string,
  email: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Supabase env required for service-role login fallback");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("generateLink: missing hashed_token");

  const { data: verified, error: otpErr } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  const session = verified.session;
  if (!session?.access_token || !session.refresh_token) {
    throw new Error("verifyOtp: missing session tokens");
  }

  await applySessionCookies(context, baseUrl, session.access_token, session.refresh_token);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "commit", timeout: 90_000 });
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}

export async function ensureBenchLoggedIn(
  page: Page,
  context: BrowserContext,
  baseUrl: string,
): Promise<"smoke-password" | "service-role-magiclink"> {
  const creds = benchCredentials();
  if (creds) {
    await loginViaUi(page, baseUrl, creds.email, creds.password);
    return "smoke-password";
  }

  const adminEmail = await resolveAdminEmailViaServiceRole();
  if (!adminEmail) {
    throw new Error(
      "SMOKE_ADMIN_EMAIL/PASSWORD or SUPABASE_SERVICE_ROLE_KEY + admin profile required",
    );
  }
  await loginViaServiceRoleMagicLink(context, page, baseUrl, adminEmail);
  return "service-role-magiclink";
}
