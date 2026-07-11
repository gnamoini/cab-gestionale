/** Token societari e geografici da rimuovere in canonicalizzazione. */
export const LEGAL_SUFFIX_TOKENS = [
  "srl",
  "spa",
  "snc",
  "sas",
  "ss",
  "scarl",
  "sca",
  "scrl",
  "coop",
  "consorzio",
  "azienda",
  "group",
  "holding",
  "italia",
  "italy",
  "industrial",
  "trucks",
  "truck",
] as const;

export const LEGAL_SUFFIX_REPLACERS: ReadonlyArray<[RegExp, string]> = [
  [/\bs\.?\s*r\.?\s*l\.?\b/gi, " srl "],
  [/\bs\.?\s*p\.?\s*a\.?\b/gi, " spa "],
  [/\bs\.?\s*n\.?\s*c\.?\b/gi, " snc "],
  [/\bs\.?\s*a\.?\s*s\.?\b/gi, " sas "],
];
