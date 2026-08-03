import "server-only";

import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import type { ManualOverrideReason } from "@/lib/document-capture/model/provenance";
import { hashDocumentModelContent } from "@/lib/document-capture/model/document-model-hash";
import type { PipelineState } from "@/lib/document-capture/model/pipeline-state";
import { INITIAL_PIPELINE_STATE } from "@/lib/document-capture/model/pipeline-state";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function loadDocumentModel(captureId: string): Promise<DigitalDocument | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture")
    .select("document_model")
    .eq("id", captureId)
    .maybeSingle();
  return (data?.document_model as DigitalDocument | null) ?? null;
}

export async function loadPipelineState(captureId: string): Promise<PipelineState> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture")
    .select("pipeline_state")
    .eq("id", captureId)
    .maybeSingle();
  return (data?.pipeline_state as PipelineState | null) ?? { ...INITIAL_PIPELINE_STATE };
}

export async function savePipelineState(captureId: string, pipelineState: PipelineState): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb
    .from("document_capture")
    .update({ pipeline_state: pipelineState })
    .eq("id", captureId);
  if (error) throw new Error(error.message);
}

export async function saveDocumentModelAndPipelineState(input: {
  captureId: string;
  document: DigitalDocument;
  pipelineState: PipelineState;
}): Promise<void> {
  const doc = { ...input.document };
  doc.metadata = { ...doc.metadata, contentHash: hashDocumentModelContent(doc) };
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb
    .from("document_capture")
    .update({
      document_model: doc,
      pipeline_state: input.pipelineState,
    })
    .eq("id", input.captureId);
  if (error) throw new Error(error.message);
}

export type DocumentModelFieldPatch = {
  fieldKey: string;
  newValue: string | null;
  overrideReason?: ManualOverrideReason;
  pageIndex?: number;
};

export async function patchDocumentModelFields(input: {
  captureId: string;
  userId: string;
  patches: readonly DocumentModelFieldPatch[];
}): Promise<DigitalDocument> {
  const doc = await loadDocumentModel(input.captureId);
  if (!doc) throw new Error("DocumentModel non presente");

  for (const patch of input.patches) {
    let previousValue: string | null = null;
    let found = false;

    outer: for (const page of doc.pages) {
      for (const section of page.sections) {
        for (const field of section.fields) {
          if (field.key === patch.fieldKey) {
            previousValue = field.value;
            field.value = patch.newValue;
            field.provenance = {
              ...field.provenance,
              source: "manual",
              manuallyEdited: true,
              overrideReason: patch.overrideReason,
            };
            found = true;
            break outer;
          }
        }
      }
    }

    if (!found) {
      const pageIndex = patch.pageIndex ?? 0;
      let page = doc.pages.find((p) => p.index === pageIndex);
      if (!page) {
        page = { index: pageIndex, physical: { isEmpty: false }, sections: [] };
        doc.pages.push(page);
      }
      const sectionType = patch.fieldKey.split(".")[0] ?? "ingresso";
      let section = page.sections.find((s) => s.sectionType === sectionType);
      if (!section) {
        section = { sectionType, fields: [] };
        page.sections.push(section);
      }
      section.fields.push({
        key: patch.fieldKey,
        value: patch.newValue,
        confidence: 1,
        provenance: {
          source: "manual",
          pageIndex,
          manuallyEdited: true,
          overrideReason: patch.overrideReason,
        },
      });
    }

    await mutateCaptureWithEvent({
      captureId: input.captureId,
      eventType: "field_overridden",
      idempotencyKey: `field_overridden:${patch.fieldKey}:${hashDocumentModelContent(doc)}`,
      payload: {
        userId: input.userId,
        fieldKey: patch.fieldKey,
        previousValue,
        newValue: patch.newValue,
        overrideReason: patch.overrideReason,
        pageIndex: patch.pageIndex,
      },
    });
  }

  doc.metadata.updatedAt = new Date().toISOString();
  doc.metadata.updatedBy = input.userId;
  doc.metadata.contentHash = hashDocumentModelContent(doc);

  if (input.patches.length > 1) {
    await mutateCaptureWithEvent({
      captureId: input.captureId,
      eventType: "document_edited",
      idempotencyKey: `document_edited:${doc.metadata.contentHash}`,
      payload: { userId: input.userId, patchCount: input.patches.length },
    });
  }

  await saveDocumentModelAndPipelineState({
    captureId: input.captureId,
    document: doc,
    pipelineState: await loadPipelineState(input.captureId),
  });
  return doc;
}
