import type { Metadata } from "next";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import {
  buildPwaMetadataIcons,
  PWA_DESCRIPTION,
  PWA_NAME,
  PWA_SHORT_NAME,
  resolveSiteMetadataBase,
} from "@/lib/pwa";

export const siteMetadata: Metadata = {
  metadataBase: resolveSiteMetadataBase(),
  applicationName: PWA_NAME,
  title: {
    default: CAB_APP_PRODUCT_NAME,
    template: `%s · ${CAB_APP_PRODUCT_NAME}`,
  },
  description: PWA_DESCRIPTION,
  icons: buildPwaMetadataIcons(),
  appleWebApp: {
    capable: true,
    title: PWA_SHORT_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: PWA_NAME,
    title: PWA_NAME,
    description: PWA_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: PWA_NAME,
    description: PWA_DESCRIPTION,
  },
};
