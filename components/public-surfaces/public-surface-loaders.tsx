"use client";

import dynamic from "next/dynamic";
import { LoginPageStructure } from "@/components/auth/login-page-structure";

function loginLoading() {
  return <LoginPageStructure mode="skeleton" />;
}

export const LoginFormLazy = dynamic(
  () => import("@/app/login/login-form").then((m) => ({ default: m.LoginForm })),
  { loading: loginLoading },
);

export const ResetPasswordFormLazy = dynamic(
  () =>
    import("@/app/login/reset-password/reset-password-form").then((m) => ({
      default: m.ResetPasswordForm,
    })),
  { loading: loginLoading },
);

export const NotFoundViewLazy = dynamic(
  () =>
    import("@/components/gestionale/not-found-view").then((m) => ({
      default: m.NotFoundView,
    })),
  { loading: loginLoading },
);

export const PrivacyPolicyViewLazy = dynamic(
  () =>
    import("@/components/legal/privacy-policy-view").then((m) => ({
      default: m.PrivacyPolicyView,
    })),
  { loading: loginLoading },
);

export const OfflinePageViewLazy = dynamic(
  () =>
    import("@/components/pwa/offline-page-view").then((m) => ({
      default: m.OfflinePageView,
    })),
  { loading: loginLoading },
);

export const GestionaleErrorFallbackLazy = dynamic(
  () =>
    import("@/components/observability/gestionale-error-fallback").then((m) => ({
      default: m.GestionaleErrorFallback,
    })),
  { loading: loginLoading },
);
