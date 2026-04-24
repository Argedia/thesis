import { normalizeStructureSnapshot, type StructureSnapshot } from "@thesis/core-engine";

export const goalMatches = (
  currentState: StructureSnapshot[],
  goalState: StructureSnapshot[]
): boolean => {
  const normalize = (state: StructureSnapshot[]) =>
    JSON.stringify(
      [...state]
        .map((structure) => normalizeStructureSnapshot(structure))
        .sort((left, right) => left.id.localeCompare(right.id))
    );

  return normalize(currentState) === normalize(goalState);
};
