import assert from "node:assert/strict";
import { preventivoEsistenteConfirmMessage } from "@/lib/preventivi/preventivo-esistente-confirm-message";

assert.match(preventivoEsistenteConfirmMessage(1), /già stato creato un preventivo/i);
assert.match(preventivoEsistenteConfirmMessage(2), /già stati creati 2 preventivi/i);
