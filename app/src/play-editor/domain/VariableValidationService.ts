import type { EditorDocument } from "../model";
import { collectVariableDeclarations } from "../model";

export class VariableValidationService {
  public isVariableNameTaken(
    document: EditorDocument,
    name: string,
    excludeDeclarationId?: string
  ): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) {
      return false;
    }

    return collectVariableDeclarations(document).some((declaration) => {
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
