import type { EditorBlock } from "../model";
import { collectVariableDeclarations } from "../model";

export class VariableValidationService {
  public isVariableNameTaken(
    blocks: EditorBlock[],
    name: string,
    excludeDeclarationId?: string
  ): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) {
      return false;
    }

    return collectVariableDeclarations(blocks).some((declaration) => {
      if (!declaration.name) {
        return false;
      }
      if (excludeDeclarationId && declaration.id === excludeDeclarationId) {
        return false;
      }
      return declaration.name.trim().toLocaleLowerCase() === normalized;
    });
  }
}
