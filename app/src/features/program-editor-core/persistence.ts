import type {
  EditorDocument,
  LegacySerializedEditorDocument,
  SerializedEditorDocument
} from "./types";
import { createEditorDocument } from "./tree";
import { deserializeEditorDocument as deserializeViaAdapter, serializeEditorDocument } from "./adapters";

export const serializeProgramDocument = (document: EditorDocument): SerializedEditorDocument =>
  serializeEditorDocument(document);

export const deserializeProgramDocument = (
  payload: SerializedEditorDocument | LegacySerializedEditorDocument
): EditorDocument => deserializeViaAdapter(payload);

export const createEmptyEditorDocument = () => createEditorDocument();
