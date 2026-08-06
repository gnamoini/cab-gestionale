import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildSearchDocumentFromFields } from "@/lib/search/build-document";

export function buildSearchDocumentMezzo(g: MezzoGestito): string {
  return buildSearchDocumentFromFields(
    [
      { kind: "customer", value: g.cliente },
      { kind: "customer", value: g.utilizzatore },
      { kind: "customer", value: g.cantiere },
      { kind: "category", value: g.tipoAttrezzatura },
      { kind: "brand", value: g.marca },
      { kind: "model", value: g.modello },
      { kind: "document", value: g.matricola },
      { kind: "plate", value: g.targa },
      { kind: "document", value: g.numeroScuderia },
      { kind: "brand", value: g.marcaTelaio },
      { kind: "model", value: g.modelloTelaio },
      { kind: "category", value: g.tipoTelaio },
      { kind: "document", value: g.vin },
    ],
    [],
  );
}
