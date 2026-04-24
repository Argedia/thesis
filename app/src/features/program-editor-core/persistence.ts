import type {
  EditorDocument,
  SerializedEditorDocument,
  SerializedEditorDocumentV2
} from "./types";
import { createEditorDocument } from "./tree";
import {
  deserializeEditorDocument as deserializeViaAdapter,
  serializeEditorDocument,
  type LegacySerializedEditorDocument
} from "./adapters/index";

export const serializeProgramDocument = (document: EditorDocument): SerializedEditorDocument =>
  serializeEditorDocument(document);

export const deserializeProgramDocument = (
  payload: SerializedEditorDocument | SerializedEditorDocumentV2 | LegacySerializedEditorDocument
): EditorDocument => deserializeViaAdapter(payload);

export const createEmptyEditorDocument = () => createEditorDocument();
