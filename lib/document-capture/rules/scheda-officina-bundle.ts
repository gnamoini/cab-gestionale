import {
  conflicts,
  rule,
  severity,
  whenSection,
} from "@/lib/document-capture/rules/dsl";
import { SCHEDA_OFFICINA_RULE_SET_VERSION } from "@/lib/document-capture/model/versions";

export { SCHEDA_OFFICINA_RULE_SET_VERSION };

export const schedaOfficinaBundleRules = [
  rule(
    "km_required_ingresso",
    "scheda_officina_bundle",
    [whenSection("ingresso")],
    {
      requireFieldKey: "ingresso.km",
      severity: severity.warning,
      message: "Km assente su scheda ingresso",
    },
  ),
  rule("mixed_schede_collision", "scheda_officina_bundle", [conflicts("lav", "ric")], {
    severity: severity.error,
    message: "Collisione chiavi lavorazioni/ricambi (namespace lav/ric)",
  }),
];
