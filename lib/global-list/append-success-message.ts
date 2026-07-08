import type {
  GlobalSettingsListContext,
  GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";

/** Messaggio toast leggero dopo append inline riuscito (solo valore nuovo). */
export function appendGlobalListSuccessMessage(
  listKey: GlobalSettingsListKey,
  ctx?: GlobalSettingsListContext,
): string {
  if (ctx?.hierarchyKind === "marca") return "Marca aggiunta e selezionata";
  if (ctx?.hierarchyKind === "modello") return "Modello aggiunto e selezionato";

  switch (listKey) {
    case "mezzi:clienti":
      return "Cliente aggiunto e selezionato";
    case "mezzi:cantieri":
      return "Cantiere aggiunto e selezionato";
    case "mezzi:utilizzatori":
      return "Utilizzatore aggiunto e selezionato";
    case "mezzi:tipiAttrezzatura":
      return "Tipo attrezzatura aggiunto e selezionato";
    case "mezzi:tipiTelaio":
      return "Tipo telaio aggiunto e selezionato";
    case "magazzino:categorie":
      return "Categoria aggiunta e selezionata";
    case "magazzino:marche":
      return "Marca aggiunta e selezionata";
    case "magazzino:fornitori":
    case "magazzino:fornitoriOrdine":
      return "Fornitore aggiunto e selezionato";
    case "magazzino:produttori":
      return "Produttore aggiunto e selezionato";
    case "magazzino:mezziCompatibili":
      return "Mezzo compatibile aggiunto e selezionato";
    case "lavorazioni:addetti":
      return "Addetto aggiunto e selezionato";
    default:
      return "Valore aggiunto e selezionato";
  }
}
