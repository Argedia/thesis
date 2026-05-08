import { normalizeStructureSnapshot, type StructureSnapshot } from "@thesis/core-engine";

export const goalMatches = (
  currentState: StructureSnapshot[],
  goalState: StructureSnapshot[]
): boolean => {
  const toSemanticState = (state: StructureSnapshot[]) =>
    [...state]
      .map((structure) => normalizeStructureSnapshot(structure))
      .map((structure) => ({
        id: structure.id,
        kind: structure.kind,
        values: structure.values.map((value) =>
          typeof value === "object" && value !== null && "value" in value ? value.value : value
        )
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

  const normalize = (state: StructureSnapshot[]) =>
    JSON.stringify(toSemanticState(state));

  return normalize(currentState) === normalize(goalState);
};
