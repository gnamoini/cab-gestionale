import { buildSearchDocumentFromParts } from "@/lib/search/build-document";
import type { SearchDomainConfig } from "@/lib/search/types";

export type SecurityUserSearchRow = {
  nome: string;
  username?: string | null;
  email?: string | null;
  roleLabel?: string;
};

export const securityUsersSearchConfig: SearchDomainConfig<SecurityUserSearchRow> = {
  domain: "security-users",
  executionMode: "client",
  fields: [
    { kind: "customer", clientField: "nome", searchable: true, indexed: true, fts: true, trgm: true, exact: true },
    { kind: "generic", clientField: "username", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "generic", clientField: "email", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
  ],
  buildDocument: (row) =>
    buildSearchDocumentFromParts([row.nome, row.username, row.email, row.roleLabel]),
};
