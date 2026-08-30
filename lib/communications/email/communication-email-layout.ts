import type { CommunicationEmailLogoLayout } from "@/lib/communications/email/communication-email-branding-types";
import { COMM_EMAIL_THEME } from "@/lib/communications/email/communication-email-theme";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";

export type CommunicationEmailCtaButton = {
  label: string;
  href: string;
};

export type CommunicationEmailLayoutInput = {
  displayName: string;
  bodyText: string;
  logoSrc: string;
  logoLayout: CommunicationEmailLogoLayout;
  primaryColor: string;
  websiteUrl: string;
  websiteHost: string;
  gestionaleAppUrl: string;
  gestionaleAppHost: string;
  /** Default: "Comunicazione automatica". */
  headerTagline?: string;
  ctaButton?: CommunicationEmailCtaButton;
  footerNote?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoCell(input: CommunicationEmailLayoutInput): string {
  const logo = escapeHtml(input.logoSrc);
  const alt = escapeHtml(input.displayName.trim() || CAB_APP_PRODUCT_NAME);

  if (input.logoLayout === "square") {
    return `<img src="${logo}" width="56" height="56" alt="${alt}" style="display:block;width:56px;height:56px;border:0;border-radius:12px;"/>`;
  }

  return `<img src="${logo}" width="168" alt="${alt}" style="display:block;width:168px;max-width:168px;height:auto;border:0;border-radius:8px;"/>`;
}

function headerBlock(input: CommunicationEmailLayoutInput): string {
  const t = COMM_EMAIL_THEME;
  const name = escapeHtml(input.displayName.trim() || CAB_APP_PRODUCT_NAME);
  const tagline = escapeHtml(input.headerTagline?.trim() || "Comunicazione automatica");
  const logoHtml = logoCell(input);

  if (input.logoLayout === "wide") {
    return `
          <tr>
            <td align="center" style="padding:24px 24px 8px;border-bottom:1px solid ${t.border};">
              ${logoHtml}
              <div style="margin-top:14px;font-size:17px;font-weight:600;line-height:1.35;color:${t.text};font-family:${t.fontStack};">${name}</div>
              <div style="margin-top:4px;font-size:12px;line-height:1.4;color:${t.textMuted};font-family:${t.fontStack};">${tagline}</div>
            </td>
          </tr>`;
  }

  return `
          <tr>
            <td style="padding:24px 24px 16px;border-bottom:1px solid ${t.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="56" valign="middle" style="padding-right:14px;width:56px;">${logoHtml}</td>
                  <td valign="middle" style="font-family:${t.fontStack};">
                    <div style="font-size:17px;font-weight:600;line-height:1.35;color:${t.text};">${name}</div>
                    <div style="margin-top:4px;font-size:12px;line-height:1.4;color:${t.textMuted};">${tagline}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function ctaBlock(input: CommunicationEmailLayoutInput, primary: string): string {
  const cta = input.ctaButton;
  if (!cta?.href?.trim() || !cta.label?.trim()) return "";
  const href = escapeHtml(cta.href.trim());
  const label = escapeHtml(cta.label.trim());
  const t = COMM_EMAIL_THEME;
  return `
          <tr>
            <td align="center" style="padding:0 24px 8px;font-family:${t.fontStack};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px;background:${primary};">
                    <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function footerNoteBlock(input: CommunicationEmailLayoutInput): string {
  const note = input.footerNote?.trim();
  if (!note) return "";
  const t = COMM_EMAIL_THEME;
  return `
          <tr>
            <td style="padding:0 24px 8px;font-family:${t.fontStack};font-size:13px;line-height:1.5;color:${t.textMuted};">${escapeHtml(note)}</td>
          </tr>`;
}

/** Layout HTML allineato ai token CAB (`globals-core.css`). Logo via CID inline. */
export function buildCommunicationEmailHtml(input: CommunicationEmailLayoutInput): string {
  const t = COMM_EMAIL_THEME;
  const body = escapeHtml(input.bodyText);
  const primary = escapeHtml(input.primaryColor || t.primaryDefault);
  const website = escapeHtml(input.websiteUrl);
  const host = escapeHtml(input.websiteHost);
  const appUrl = escapeHtml(input.gestionaleAppUrl);
  const appHost = escapeHtml(input.gestionaleAppHost);
  const linkStyle = `color:${primary};text-decoration:none;font-weight:600;`;
  const footerSep = `<span style="color:${t.borderStrong};"> · </span>`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
</head>
<body style="margin:0;padding:0;background:${t.bgApp};font-family:${t.fontStack};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.bgApp};width:100%;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusLg};box-shadow:${t.shadowSm};overflow:hidden;">
          <tr>
            <td style="height:4px;line-height:4px;background:${primary};font-size:0;">&nbsp;</td>
          </tr>
          ${headerBlock(input)}
          <tr>
            <td style="padding:24px 24px 16px;font-family:${t.fontStack};font-size:15px;line-height:1.6;color:${t.text};white-space:pre-wrap;">${body}</td>
          </tr>
          ${ctaBlock(input, primary)}
          ${footerNoteBlock(input)}
          <tr>
            <td align="center" style="padding:16px 24px 22px;border-top:1px solid ${t.border};font-family:${t.fontStack};font-size:12px;line-height:1.5;color:${t.textMuted};">
              <a href="${website}" style="${linkStyle}">${host}</a>${footerSep}<a href="${appUrl}" style="${linkStyle}">${appHost}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
