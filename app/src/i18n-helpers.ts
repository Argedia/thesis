import type { StructureKind } from "@thesis/core-engine";
import type { BuilderOperation } from "./features/program-editor-core/types";
import { i18n } from "./i18n";

export const t = (key: string, options?: Record<string, unknown>): string =>
	i18n.t(key, options) as string;

export const translateStructureKind = (kind: StructureKind): string =>
	t(`structures.${kind}`);

export const translateOperationName = (operation: BuilderOperation): string =>
	t(`operations.${operation}`);
