export type FormSubmitLock = {
  isLocked: () => boolean;
  acquire: () => boolean;
  release: () => void;
};

export function createSubmitLock(): FormSubmitLock {
  let locked = false;
  return {
    isLocked: () => locked,
    acquire: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    release: () => {
      locked = false;
    },
  };
}
