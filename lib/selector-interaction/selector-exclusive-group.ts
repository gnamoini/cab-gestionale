type ExclusiveGroupMember = {
  id: symbol;
  close: () => void;
};

const exclusiveGroups = new Map<string, Set<ExclusiveGroupMember>>();

export function registerSelectorExclusiveGroup(
  groupId: string,
  memberId: symbol,
  close: () => void,
): () => void {
  let members = exclusiveGroups.get(groupId);
  if (!members) {
    members = new Set();
    exclusiveGroups.set(groupId, members);
  }
  const member: ExclusiveGroupMember = { id: memberId, close };
  members.add(member);
  return () => {
    members!.delete(member);
    if (members!.size === 0) exclusiveGroups.delete(groupId);
  };
}

/** Chiude tutti i selector del gruppo tranne quello che sta aprendo. */
export function closeOtherSelectorsInExclusiveGroup(groupId: string, keepId: symbol): void {
  const members = exclusiveGroups.get(groupId);
  if (!members) return;
  for (const member of members) {
    if (member.id === keepId) continue;
    member.close();
  }
}
