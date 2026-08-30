export function computeRetrievalRescueMetrics(input: {
  structuredCodes: string[];
  fileSearchCodes: string[];
}): {
  structured_hits: number;
  file_search_hits: number;
  structured_only: number;
  file_search_rescued: number;
  both: number;
} {
  const structured = new Set(input.structuredCodes.map((c) => c.toUpperCase()));
  const fileSearch = new Set(input.fileSearchCodes.map((c) => c.toUpperCase()));
  let both = 0;
  let structuredOnly = 0;
  let rescued = 0;
  for (const code of structured) {
    if (fileSearch.has(code)) both += 1;
    else structuredOnly += 1;
  }
  for (const code of fileSearch) {
    if (!structured.has(code)) rescued += 1;
  }
  return {
    structured_hits: structured.size,
    file_search_hits: fileSearch.size,
    structured_only: structuredOnly,
    file_search_rescued: rescued,
    both,
  };
}
