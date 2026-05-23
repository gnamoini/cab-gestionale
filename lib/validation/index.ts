export {
  buildEntityKey,
  entityAutocompleteKey,
  ENTITY_SIMILAR_SCORE_MIN,
  findExactEntityInPool,
  findSimilarEntityInPool,
  fuzzyMatchEntity,
  normalizeEntityString,
  scoreEntityMatch,
  type FuzzyEntityMatch,
  type FuzzyMatchEntityOptions,
  type NormalizeEntityStringOptions,
} from "@/lib/validation/global-entity-validation";

export {
  buildClienteEntityKey,
  buildMezzoIdentEntityKey,
  buildMezzoPersistEntityKey,
  buildNamedListEntityKey,
  buildNormalizedSearchHaystack,
  buildRicambioCodiceEntityKey,
  buildRicambioPersistEntityKey,
  type EntityValidationContext,
} from "@/lib/validation/entity-keys";

export {
  attachMagazzinoEntityKey,
  attachMezzoEntityKey,
  detectDuplicateEntityKey,
} from "@/lib/validation/entity-persistence";

export {
  findSimilarCliente,
  clienteEntityKeyForPersist,
} from "@/lib/validation/services/clienti-validation";

export {
  findSimilarMezzoCliente,
  findMezzoBySimilarIdent,
  mezzoEntityKeyForPersist,
} from "@/lib/validation/services/mezzi-validation";

export {
  findSimilarRicambioCodice,
  findSimilarRicambioMarca,
  findSimilarRicambioNome,
  ricambioEntityKeyForPersist,
} from "@/lib/validation/services/ricambi-validation";
