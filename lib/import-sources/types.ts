export type ImportSourceRef =
  | { type: "import_file"; id: string }
  | { type: "legacy_document"; id: string };

export type ResolvedImportSource =
  | {
      kind: "import_file";
      importFileId: string;
      bytes: Uint8Array;
      mime: string;
      fileName: string;
      contentHash: string;
      storagePath: string;
      bucket: string;
    }
  | {
      kind: "legacy_document";
      documentoId: string;
      bytes: Uint8Array;
      mime: string;
      fileName: string;
      contentHash: string;
      storagePath: string;
      bucket: string;
    };

export function importSourceRefFromAnalyzeBody(body: {
  source?: ImportSourceRef;
  importFileId?: string;
  documentoId?: string;
}): ImportSourceRef | null {
  if (body.source?.type === "import_file" || body.source?.type === "legacy_document") {
    return body.source;
  }
  if (body.importFileId) return { type: "import_file", id: body.importFileId };
  if (body.documentoId) return { type: "legacy_document", id: body.documentoId };
  return null;
}
