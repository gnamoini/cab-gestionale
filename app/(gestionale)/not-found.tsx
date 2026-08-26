export { notFoundPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { NotFoundViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function GestionaleNotFound() {
  return <NotFoundViewLazy variant="embedded" />;
}
