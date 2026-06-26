export const INDENT_STEP_PX = 28;
export const ROW_HEIGHT_PX = 54;
/** @deprecated removed in Phase 2 — replaced by pure clamp formula */
export const INDENT_ACTIVATION_INSET_PX = 12;

export const ELSE_BLOCK_ID_SUFFIX = "-else";
export const getElseBlockId = (ifBlockId: string): string => `${ifBlockId}${ELSE_BLOCK_ID_SUFFIX}`;
export const getIfBlockIdFromElse = (elseBlockId: string): string | null => {
	if (elseBlockId.endsWith(ELSE_BLOCK_ID_SUFFIX)) {
		return elseBlockId.slice(0, -ELSE_BLOCK_ID_SUFFIX.length);
	}
	return null;
};
