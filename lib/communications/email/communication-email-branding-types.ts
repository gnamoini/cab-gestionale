export type CommunicationEmailLogoLayout = "square" | "wide";

export type CommunicationEmailInlineLogo = {
  contentId: string;
  filename: string;
  content: Uint8Array;
  contentType: string;
};

export type CommunicationEmailBranding = {
  /** `cid:` per HTML inline oppure URL assoluto fallback. */
  logoSrc: string;
  logoLayout: CommunicationEmailLogoLayout;
  inlineLogo?: CommunicationEmailInlineLogo;
  primaryColor: string;
  websiteUrl: string;
  websiteHost: string;
  /** Origin pubblico app (Vercel / NEXT_PUBLIC_SITE_URL). */
  gestionaleAppUrl: string;
  gestionaleAppHost: string;
};
