import { randomUUID } from "node:crypto";

export type DescriptionSuggestion = {
  id: string;
  preventivoId?: string;
  technicalSourceNorm: string;
  suggestedFrom: string;
  suggestedTo: string;
  suggestionType: "line_rephrase" | "full_mapping";
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  appliedToKb: boolean;
  kbEntrySlug?: string;
  createdBy?: string;
  createdAt: string;
};

const suggestions: DescriptionSuggestion[] = [];

export function queueDescriptionSuggestion(input: Omit<DescriptionSuggestion, "id" | "status" | "appliedToKb" | "createdAt">): DescriptionSuggestion {
  const row: DescriptionSuggestion = {
    ...input,
    id: randomUUID(),
    status: "pending",
    appliedToKb: false,
    createdAt: new Date().toISOString(),
  };
  suggestions.unshift(row);
  return row;
}

export function listPendingSuggestions(): DescriptionSuggestion[] {
  return suggestions.filter((s) => s.status === "pending");
}

export function approveDescriptionSuggestion(id: string, reviewedBy: string): DescriptionSuggestion | null {
  const row = suggestions.find((s) => s.id === id);
  if (!row || row.status !== "pending") return null;
  row.status = "approved";
  row.reviewedBy = reviewedBy;
  row.reviewedAt = new Date().toISOString();
  return row;
}

export function rejectDescriptionSuggestion(id: string, reviewedBy: string): DescriptionSuggestion | null {
  const row = suggestions.find((s) => s.id === id);
  if (!row || row.status !== "pending") return null;
  row.status = "rejected";
  row.reviewedBy = reviewedBy;
  row.reviewedAt = new Date().toISOString();
  return row;
}

export function resetDescriptionSuggestionsDev(): void {
  suggestions.length = 0;
}
