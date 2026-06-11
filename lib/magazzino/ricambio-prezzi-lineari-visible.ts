export function ricambioPrezziLineariVisible(params: {
  listinoOE: number;
  fornitoriAlternativi: readonly { prezzo: number }[];
}): boolean {
  if (params.listinoOE > 0) return true;
  return params.fornitoriAlternativi.some((r) => r.prezzo > 0);
}
