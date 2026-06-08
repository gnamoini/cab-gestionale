/** Snapshot immutabile; creato solo dopo prepareFormSubmit + ios guard. */
export type FormStateSnapshot<T> = Readonly<T>;

/** Sezioni multiple (es. lav-create: fields + meta). */
export type FormEngineSections = Record<string, unknown>;

export type FormEngineSnapshot<S extends FormEngineSections> = {
  readonly [K in keyof S]: Readonly<S[K]>;
};
