/** Output Physical Parser — rigenerabile, non SSOT. */

export type PageObject = {
  index: number;
  bytes: Uint8Array;
  rotation?: number;
  isEmpty: boolean;
  isDuplicateOf?: number;
  byteSize: number;
};
