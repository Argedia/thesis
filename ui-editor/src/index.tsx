import {
	normalizeStructureSnapshot,
	type DataValue,
	type DataNode,
	type EngineEvent,
	type StructureKind,
	type StructureSnapshot
} from "@thesis/core-engine";
import type { EditorPanelId, PlayerPanelId } from "@thesis/game-system";
import i18next from "i18next";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const cardStyle: CSSProperties = {
	border: "4px solid #ffffff",
	borderRadius: "28px",
	padding: "1rem",
	background: "#fff4dc"
};

export interface BoardHeapObjectSnapshot {
	heapId: string;
	typeName: string;
	fields: Array<{
		name: string;
		displayValue: string | number | boolean;
		isRef: boolean;
		refHeapId?: string;
	}>;
}

export interface StructuresBoardProps {
	structures: StructureSnapshot[];
	handValue?: string | number | null;
	variables?: BoardVariableSnapshot[];
	heapObjects?: BoardHeapObjectSnapshot[];
	events?: EngineEvent[];
	showStructureConfigActions?: boolean;
	onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
	stepDurationMs?: number;
	isPreview?: boolean;
}

export interface StructureConfigClickPayload {
	structureId: string;
	clientX: number;
	clientY: number;
}

export interface BoardVariableSnapshot {
	id: string;
	name: string;
	scope: string;
	valueKind: "primitive" | "pointer" | "typed-object" | "routine-reference" | "routine-object";
	displayValue: string | number | boolean;
	declaredTypeRef?:
	| { kind: "primitive"; primitive: "text" | "boolean" | "value" }
	| { kind: "structure"; structureKind: StructureKind }
	| { kind: "user"; typeRoutineId: string }
	| null;
	objectFields?: Array<{
		name: string;
		displayValue: string | number | boolean;
	}>;
	referenceTargetId?: string;
	referenceTargetName?: string;
	heapRefId?: string;
}

type CardHitbox = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	minW: number;
	minH: number;
	tooltip?: string;
};

const t = (key: string, options?: Record<string, unknown>) =>
	i18next.t(key, options) as string;

const getStructureKindBadge = (kind: StructureKind): { icon: "stack" | "queue" | "list" | "doubly-linked-list" | "circular-list"; tooltip: string } => {
	switch (kind) {
		case "stack":
			return { icon: "stack", tooltip: t("structures.stack") };
		case "queue":
			return { icon: "queue", tooltip: t("structures.queue") };
		case "doubly-linked-list":
			return { icon: "doubly-linked-list", tooltip: t("structures.doubly-linked-list") };
		case "circular-list":
			return { icon: "circular-list", tooltip: t("structures.circular-list") };
		case "list":
		default:
			return { icon: "list", tooltip: t("structures.list") };
	}
};

const drawStructureKindIcon = (
	ctx: CanvasRenderingContext2D,
	icon: "stack" | "queue" | "list" | "doubly-linked-list" | "circular-list",
	x: number,
	y: number,
	size: number,
	color: string
) => {
	const left = x;
	const top = y;
	const s = size;
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = Math.max(1.4, s * 0.1);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	const strokeRect = (rx: number, ry: number, rw: number, rh: number) => {
		ctx.strokeRect(left + rx, top + ry, rw, rh);
	};

	const strokeLine = (x1: number, y1: number, x2: number, y2: number) => {
		ctx.beginPath();
		ctx.moveTo(left + x1, top + y1);
		ctx.lineTo(left + x2, top + y2);
		ctx.stroke();
	};

	switch (icon) {
		case "stack":
			strokeLine(s * 0.22, s * 0.28, s * 0.78, s * 0.28);
			strokeLine(s * 0.22, s * 0.5, s * 0.78, s * 0.5);
			strokeLine(s * 0.22, s * 0.72, s * 0.78, s * 0.72);
			break;
		case "queue":
			strokeRect(s * 0.12, s * 0.24, s * 0.18, s * 0.52);
			strokeRect(s * 0.39, s * 0.24, s * 0.18, s * 0.52);
			strokeRect(s * 0.66, s * 0.24, s * 0.18, s * 0.52);
			strokeLine(s * 0.84, s * 0.5, s * 0.98, s * 0.5);
			break;
		case "list":
			strokeRect(s * 0.08, s * 0.28, s * 0.26, s * 0.44);
			strokeLine(s * 0.4, s * 0.5, s * 0.6, s * 0.5);
			strokeRect(s * 0.66, s * 0.28, s * 0.26, s * 0.44);
			break;
		case "doubly-linked-list":
			strokeRect(s * 0.08, s * 0.28, s * 0.26, s * 0.44);
			strokeLine(s * 0.4, s * 0.42, s * 0.6, s * 0.42);
			strokeLine(s * 0.4, s * 0.58, s * 0.6, s * 0.58);
			strokeRect(s * 0.66, s * 0.28, s * 0.26, s * 0.44);
			break;
		case "circular-list":
			ctx.beginPath();
			ctx.arc(left + s * 0.5, top + s * 0.5, s * 0.28, Math.PI * 0.2, Math.PI * 1.75);
			ctx.stroke();
			strokeLine(s * 0.63, s * 0.15, s * 0.86, s * 0.15);
			strokeLine(s * 0.86, s * 0.15, s * 0.86, s * 0.38);
			break;
	}

	ctx.restore();
};

const boardWrapperStyle: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	height: "100%",
	minHeight: 0,
};

const boardCanvasFrameStyle: CSSProperties = {
	flex: "1 1 auto",
	width: "100%",
	height: "100%",
	minHeight: 0,
	border: "0",
	borderRadius: "22px",
	overflow: "hidden"
};

const drawRoundedRect = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
) => {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
};

type ListTransitionKind =
	| "none"
	| "append"
	| "prepend"
	| "remove_first"
	| "remove_last"
	| "other";

type StackQueueTransitionKind = "none" | "push" | "pop" | "enqueue" | "dequeue" | "other";

const nodeEquals = (left: DataNode, right: DataNode): boolean =>
	left.value === right.value && (left.color ?? "") === (right.color ?? "");

const detectListTransitionKind = (previous: DataNode[], current: DataNode[]): ListTransitionKind => {
	if (previous.length === current.length) {
		return previous.every((node, index) => nodeEquals(node, current[index]!)) ? "none" : "other";
	}

	if (current.length === previous.length + 1) {
		const appended = previous.every((node, index) => nodeEquals(node, current[index]!));
		if (appended) return "append";
		const prepended = previous.every((node, index) => nodeEquals(node, current[index + 1]!));
		if (prepended) return "prepend";
		return "other";
	}

	if (previous.length === current.length + 1) {
		const removedLast = current.every((node, index) => nodeEquals(node, previous[index]!));
		if (removedLast) return "remove_last";
		const removedFirst = current.every((node, index) => nodeEquals(node, previous[index + 1]!));
		if (removedFirst) return "remove_first";
		return "other";
	}

	return "other";
};

const normalizePhaseProgress = (value: number): number => Math.max(0, Math.min(1, value));
const easeInOut = (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const detectStackQueueTransitionKind = (
	kind: "stack" | "queue",
	previous: DataNode[],
	current: DataNode[]
): StackQueueTransitionKind => {
	if (previous.length === current.length) return "none";
	if (kind === "stack") {
		if (current.length === previous.length + 1) {
			// push: all previous items still present, new item on top (end of array)
			const allSame = previous.every((node, i) => nodeEquals(node, current[i]!));
			return allSame ? "push" : "other";
		}
		if (previous.length === current.length + 1) {
			// pop: top item removed
			const allSame = current.every((node, i) => nodeEquals(node, previous[i]!));
			return allSame ? "pop" : "other";
		}
	}
	if (kind === "queue") {
		if (current.length === previous.length + 1) {
			// enqueue: appended to back (end of array)
			const allSame = previous.every((node, i) => nodeEquals(node, current[i]!));
			return allSame ? "enqueue" : "other";
		}
		if (previous.length === current.length + 1) {
			// dequeue: removed from front (start of array)
			const allSame = current.every((node, i) => nodeEquals(node, previous[i + 1]!));
			return allSame ? "dequeue" : "other";
		}
	}
	return "other";
};

const getOperationFromStepId = (stepId: string): string | null => {
	const parts = stepId.split("-");
	if (parts.length < 3) return null;
	return parts[1] ?? null;
};

export function StructuresBoard({
	structures,
	variables = [],
	heapObjects = [],
	events = [],
	showStructureConfigActions = false,
	onStructureConfigClick,
	stepDurationMs = 1000,
	isPreview = false
}: StructuresBoardProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const structureConfigHitboxesRef = useRef<
		Array<{ id: string; x: number; y: number; width: number; height: number }>
	>([]);

	// pan/zoom state — mutable refs to avoid re-render on every drag
	const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const scaleRef = useRef<number>(1);
	const isPanningRef = useRef<boolean>(false);
	const panStartRef = useRef<{ px: number; py: number; ox: number; oy: number }>({ px: 0, py: 0, ox: 0, oy: 0 });
	// per-card free positions (card-id → {x,y} in content space)
	const cardPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
	// per-card custom sizes (card-id → {w,h} in content space)
	const cardSizesRef = useRef<Map<string, { w: number; h: number }>>(new Map());
	// localStorage key for this board layout (derived from stable structure+variable ids)
	const layoutStorageKeyRef = useRef<string | null>(null);
	const hasAutoFittedRef = useRef(false);
	const previousStructureIdsRef = useRef<string[] | null>(null);
	// card drag state
	const cardDragRef = useRef<{ id: string; startCx: number; startCy: number; startCardX: number; startCardY: number } | null>(null);
	// card resize state
	const cardResizeRef = useRef<{ id: string; startCx: number; startCy: number; startW: number; startH: number; minW: number; minH: number } | null>(null);
	// all card hitboxes in content space (rebuilt each draw)
	const cardHitboxesRef = useRef<CardHitbox[]>([]);
	// content bounds for fit-to-view
	const contentBoundsRef = useRef<{ w: number; h: number }>({ w: 600, h: 400 });
	// trigger redraw
	const redrawRef = useRef<(() => void) | null>(null);
	const listSnapshotsRef = useRef<Record<string, DataNode[]>>({});
	const listReadHighlightRef = useRef<{
		structureId: string;
		structureKind: string;
		operation: "get_head" | "get_tail" | "peek" | "size" | "is_empty" | "get_at" | "contains" | "find";
		readValue?: import("@thesis/core-engine").DataValue;
		startedAt: number;
		durationMs: number;
	} | null>(null);
	const listTransitionRef = useRef<{
		active: boolean;
		startAt: number;
		durationMs: number;
		from: Record<string, DataNode[]>;
		to: Record<string, DataNode[]>;
	}>({
		active: false,
		startAt: 0,
		durationMs: stepDurationMs * 0.42,
		from: {},
		to: {}
	});

	const stackQueueSnapshotsRef = useRef<Record<string, DataNode[]>>({});
	const stackQueueTransitionRef = useRef<{
		active: boolean;
		startAt: number;
		durationMs: number;
		transitions: Record<string, { kind: StackQueueTransitionKind; from: DataNode[]; to: DataNode[] }>;
	}>({
		active: false,
		startAt: 0,
		durationMs: stepDurationMs * 0.34,
		transitions: {}
	});

	const fitToView = () => {
		const host = hostRef.current;
		if (!host) return;
		const vw = host.clientWidth;
		const vh = host.clientHeight;
		const hitboxes = cardHitboxesRef.current;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		if (hitboxes.length > 0) {
			for (const hb of hitboxes) {
				minX = Math.min(minX, hb.x);
				minY = Math.min(minY, hb.y);
				maxX = Math.max(maxX, hb.x + hb.w);
				maxY = Math.max(maxY, hb.y + hb.h);
			}
		} else {
			const { w, h } = contentBoundsRef.current;
			minX = 0; minY = 0; maxX = w; maxY = h;
		}
		const cw = maxX - minX;
		const ch = maxY - minY;
		const pad = 32;
		const s = Math.min(1, (vw - pad * 2) / Math.max(cw, 1), (vh - pad * 2) / Math.max(ch, 1));
		scaleRef.current = s;
		panRef.current = { x: (vw - cw * s) / 2 - minX * s, y: (vh - ch * s) / 2 - minY * s };
		redrawRef.current?.();
	};

	const prevIsPreviewRef = useRef(false);

	useEffect(() => {
		const host = hostRef.current;
		const canvas = canvasRef.current;
		if (!host || !canvas) {
			return;
		}

		// Derive stable localStorage key from sorted structure+variable ids
		const layoutKey = "board-layout:" + [...structures.map((s) => s.id), ...variables.map((v) => v.id)].sort().join(",");
		if (layoutStorageKeyRef.current !== layoutKey) {
			layoutStorageKeyRef.current = layoutKey;
			// Load persisted layout for this board configuration
			try {
				const saved = localStorage.getItem(layoutKey);
				if (saved) {
					const parsed = JSON.parse(saved) as {
						positions?: Record<string, { x: number; y: number }>;
						sizes?: Record<string, { w: number; h: number }>;
					};
					if (parsed.positions) {
						cardPositionsRef.current = new Map(Object.entries(parsed.positions));
					}
					if (parsed.sizes) {
						cardSizesRef.current = new Map(Object.entries(parsed.sizes));
					}
				}
			} catch {
				// ignore malformed storage
			}
		}

		const justExitedPreview = prevIsPreviewRef.current && !isPreview;
		prevIsPreviewRef.current = isPreview;

		const normalizedForTransition = structures.map((structure) => normalizeStructureSnapshot(structure));
		const nextListSnapshots: Record<string, DataNode[]> = {};
		normalizedForTransition.forEach((structure) => {
			if (structure.kind !== "list" && structure.kind !== "doubly-linked-list" && structure.kind !== "circular-list") return;
			nextListSnapshots[structure.id] = structure.values.map((value) => ({ ...(value as DataNode) }));
		});

		if (justExitedPreview) {
			listSnapshotsRef.current = nextListSnapshots;
			const nextSQ: Record<string, DataNode[]> = {};
			normalizedForTransition.forEach((s) => {
				if (s.kind !== "stack" && s.kind !== "queue") return;
				nextSQ[s.id] = s.values.map((v) => ({ ...(v as DataNode) }));
			});
			stackQueueSnapshotsRef.current = nextSQ;
			listTransitionRef.current = { ...listTransitionRef.current, active: false, from: {}, to: {} };
			stackQueueTransitionRef.current = { ...stackQueueTransitionRef.current, active: false, transitions: {} };
		}

		const previousListSnapshots = listSnapshotsRef.current;
		const hasPreviousListState = Object.keys(previousListSnapshots).length > 0;
		const listStateChanged = (() => {
			const previousIds = Object.keys(previousListSnapshots);
			const nextIds = Object.keys(nextListSnapshots);
			if (previousIds.length !== nextIds.length) return true;
			for (const id of nextIds) {
				const before = previousListSnapshots[id] ?? [];
				const after = nextListSnapshots[id] ?? [];
				if (before.length !== after.length) return true;
				for (let index = 0; index < after.length; index += 1) {
					const beforeNode = before[index];
					const afterNode = after[index];
					if (
						!beforeNode ||
						!afterNode ||
						beforeNode.value !== afterNode.value ||
						(beforeNode.color ?? "") !== (afterNode.color ?? "")
					) {
						return true;
					}
				}
			}
			return false;
		})();

		if (hasPreviousListState && listStateChanged && events.length > 0 && !isPreview) {
			listTransitionRef.current = {
				active: true,
				startAt: performance.now(),
				durationMs: stepDurationMs * 0.42,
				from: previousListSnapshots,
				to: nextListSnapshots
			};
		} else if (!hasPreviousListState) {
			listTransitionRef.current = {
				...listTransitionRef.current,
				active: false,
				from: {},
				to: {}
			};
		}

		if (!isPreview) listSnapshotsRef.current = nextListSnapshots;

		// Stack/queue transition detection
		const nextSQSnapshots: Record<string, DataNode[]> = {};
		normalizedForTransition.forEach((structure) => {
			if (structure.kind !== "stack" && structure.kind !== "queue") return;
			nextSQSnapshots[structure.id] = structure.values.map((value) => ({ ...(value as DataNode) }));
		});
		const prevSQSnapshots = stackQueueSnapshotsRef.current;
		const hasPrevSQ = Object.keys(prevSQSnapshots).length > 0;
		if (hasPrevSQ) {
			const newTransitions: Record<string, { kind: StackQueueTransitionKind; from: DataNode[]; to: DataNode[] }> = {};
			let anyChanged = false;
			normalizedForTransition.forEach((structure) => {
				if (structure.kind !== "stack" && structure.kind !== "queue") return;
				const prev = prevSQSnapshots[structure.id] ?? [];
				const curr = nextSQSnapshots[structure.id] ?? [];
				const kind = detectStackQueueTransitionKind(structure.kind, prev, curr);
				if (kind !== "none") {
					newTransitions[structure.id] = { kind, from: prev, to: curr };
					anyChanged = true;
				}
			});
			if (anyChanged && events.length > 0 && !isPreview) {
				stackQueueTransitionRef.current = {
					active: true,
					startAt: performance.now(),
					durationMs: stepDurationMs * 0.34,
					transitions: newTransitions
				};
			}
		} else {
			stackQueueTransitionRef.current = { ...stackQueueTransitionRef.current, active: false, transitions: {} };
		}
		if (!isPreview) stackQueueSnapshotsRef.current = nextSQSnapshots;

		const latestEvent = events[events.length - 1];
		if (latestEvent?.type === "VALUE_READ") {
			const operation = getOperationFromStepId(latestEvent.stepId);
			const isReadOp = operation === "get_head" || operation === "get_tail" || operation === "peek" ||
				operation === "size" || operation === "is_empty" || operation === "get_at" ||
				operation === "contains" || operation === "find";
			if (isReadOp) {
				const targetStructure = normalizedForTransition.find(s => s.id === latestEvent.structureId);
				if (targetStructure) {
					listReadHighlightRef.current = {
						structureId: latestEvent.structureId,
						structureKind: targetStructure.kind,
						operation: operation as "get_head" | "get_tail" | "peek" | "size" | "is_empty" | "get_at" | "contains" | "find",
						readValue: latestEvent.value,
						startedAt: performance.now(),
						durationMs: stepDurationMs * 0.52
					};
				}
			}
		}

		const shouldAnimateListPointers = structures.some(
			(structure) => structure.kind === "list" || structure.kind === "doubly-linked-list" || structure.kind === "circular-list"
				|| structure.kind === "stack" || structure.kind === "queue"
		);

		const draw = () => {
			const now = performance.now();
			const pointerDashOffset = -((now / 70) % 24);
			const pointerPulse = 0.7 + 0.3 * Math.sin(now / 260);
			const normalizedStructures = structures.map((structure) => normalizeStructureSnapshot(structure));

			// remove stale card positions/sizes for cards that no longer exist
			const validIds = new Set<string>([
				...normalizedStructures.map((s) => `structure:${s.id}`),
				...variables.map((v) => `variable:${v.id}`),
				...heapObjects.map((o) => `heap:${o.heapId}`)
			]);
			for (const key of cardPositionsRef.current.keys()) {
				if (!validIds.has(key)) cardPositionsRef.current.delete(key);
			}
			for (const key of cardSizesRef.current.keys()) {
				if (!validIds.has(key)) cardSizesRef.current.delete(key);
			}

			const vw = Math.max(host.clientWidth, 320);
			const vh = Math.max(host.clientHeight, 360);

			// --- layout in content-space (scale=1) ---
			const CARD_W = 280;
			const CARD_H = 196;
			const GUTTER = 20;
			const PAD = 20;
			const HEAP_CARD_W = 150;
			const HEAP_CARD_H = 56;
			const HEAP_GUTTER = 8;

			const mainCardCount = normalizedStructures.length + variables.length;
			const columns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(mainCardCount))));
			const mainRows = Math.max(1, Math.ceil(mainCardCount / columns));
			const mainW = columns * CARD_W + (columns - 1) * GUTTER + PAD * 2;
			const mainH = mainRows * CARD_H + (mainRows - 1) * GUTTER + PAD * 2;

			const heapCols = Math.max(1, Math.min(6, heapObjects.length));
			const heapRows2 = heapObjects.length > 0 ? Math.ceil(heapObjects.length / heapCols) : 0;
			const heapStripH = heapRows2 > 0 ? heapRows2 * HEAP_CARD_H + (heapRows2 - 1) * HEAP_GUTTER + HEAP_GUTTER * 2 + 18 : 0;

			const contentW = Math.max(mainW, PAD * 2 + heapCols * HEAP_CARD_W + (heapCols - 1) * HEAP_GUTTER);
			const contentH = mainH + heapStripH;
			contentBoundsRef.current = { w: contentW, h: contentH };

			// viewport transform
			const scale = scaleRef.current;
			const pan = panRef.current;

			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.floor(vw * dpr);
			canvas.height = Math.floor(vh * dpr);
			canvas.style.width = `${vw}px`;
			canvas.style.height = `${vh}px`;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// background + grid (screen space)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, vw, vh);
			ctx.fillStyle = "#dbeeff";
			ctx.fillRect(0, 0, vw, vh);

			const gridStep = Math.max(20, Math.round(40 * scale));
			const gridOffX = ((pan.x % gridStep) + gridStep) % gridStep;
			const gridOffY = ((pan.y % gridStep) + gridStep) % gridStep;
			ctx.strokeStyle = "rgba(74, 109, 145, 0.16)";
			ctx.lineWidth = 1;
			for (let gx = gridOffX; gx < vw; gx += gridStep) {
				ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, vh); ctx.stroke();
			}
			for (let gy = gridOffY; gy < vh; gy += gridStep) {
				ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(vw, gy); ctx.stroke();
			}

			// apply pan/zoom transform for content
			ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * pan.x, dpr * pan.y);

			const layoutScale = 1; // content is always drawn at scale=1, canvas transform handles zoom

			const structureConfigHitboxes: Array<{
				id: string;
				x: number;
				y: number;
				width: number;
				height: number;
			}> = [];

			const cellWidth = CARD_W;
			const cellHeight = CARD_H;
			const horizontalPadding = PAD;
			const verticalPadding = PAD;
			const gutter = GUTTER;
			const mainContentHeight = mainH;

			const HANDLE = 12; // resize handle size px

			// helper: get card position, seeding default from grid layout if not yet placed
			const getCardPos = (id: string, defaultX: number, defaultY: number): { x: number; y: number } => {
				if (!cardPositionsRef.current.has(id)) {
					cardPositionsRef.current.set(id, { x: defaultX, y: defaultY });
				}
				return cardPositionsRef.current.get(id)!;
			};

			// helper: get card size, seeding from default if not yet resized
			const getCardSize = (id: string, defaultW: number, defaultH: number): { w: number; h: number } => {
				if (!cardSizesRef.current.has(id)) {
					cardSizesRef.current.set(id, { w: defaultW, h: defaultH });
				}
				return cardSizesRef.current.get(id)!;
			};

			const drawResizeHandle = (fx: number, fy: number, fw: number, fh: number) => {
				const hx = fx + fw - HANDLE;
				const hy = fy + fh - HANDLE;
				ctx.fillStyle = "rgba(100,140,180,0.25)";
				ctx.beginPath();
				ctx.moveTo(hx + HANDLE, hy);
				ctx.lineTo(hx + HANDLE, hy + HANDLE);
				ctx.lineTo(hx, hy + HANDLE);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = "rgba(80,120,160,0.5)";
				ctx.lineWidth = 1;
				ctx.stroke();
			};

			const newHitboxes: CardHitbox[] = [];

			// Compute ideal sizes for all structures (used for bin-pack and getCardSize defaults)
			const HEADER_H = 56;
			const MARGIN = 2;
			const idealSizes = normalizedStructures.map((structure) => {
				const n = structure.values.length;
				let w: number;
				let h: number;
				if (structure.kind === "stack") {
					w = 220;
					h = HEADER_H + 22 + (n + MARGIN) * (34 + 6) + 16;
				} else if (structure.kind === "queue") {
					w = 28 + (n + MARGIN) * (58 + 8) + 20;
					h = 248;
				} else {
					w = 30 + (n + MARGIN) * (58 + 16) + 24;
					h = 248;
				}
				return { w: Math.max(200, Math.min(600, w)), h: Math.max(180, Math.min(500, h)) };
			});

			const currentStructureIds = normalizedStructures.map((structure) => structure.id);
			const previousStructureIds = previousStructureIdsRef.current;
			if (previousStructureIds) {
				const addedStructureIds = currentStructureIds.filter((id) => !previousStructureIds.includes(id));
				addedStructureIds.forEach((id) => {
					const cardKey = `structure:${id}`;
					const structureIndex = normalizedStructures.findIndex((structure) => structure.id === id);
					const nextSize = idealSizes[structureIndex] ?? { w: CARD_W, h: CARD_H };
					const visibleCenterX = (vw / 2 - panRef.current.x) / Math.max(scaleRef.current, 0.001);
					const visibleCenterY = (vh / 2 - panRef.current.y) / Math.max(scaleRef.current, 0.001);
					cardPositionsRef.current.set(cardKey, {
						x: visibleCenterX - nextSize.w / 2,
						y: visibleCenterY - nextSize.h / 2
					});
				});
			}
			previousStructureIdsRef.current = currentStructureIds;

			// Bin-pack positions: row by row, wrap when exceeding max canvas width
			const BIN_MAX_W = Math.max(800, vw * 1.4);
			const binPackedPositions = (() => {
				const positions: Array<{ x: number; y: number }> = [];
				let curX = PAD;
				let curY = PAD;
				let rowH = 0;
				for (const { w, h } of idealSizes) {
					if (curX > PAD && curX + w > BIN_MAX_W) {
						curX = PAD;
						curY += rowH + GUTTER;
						rowH = 0;
					}
					positions.push({ x: curX, y: curY });
					curX += w + GUTTER;
					rowH = Math.max(rowH, h);
				}
				return positions;
			})();

			normalizedStructures.forEach((structure, index) => {
				const packed = binPackedPositions[index] ?? { x: PAD, y: PAD };
				const pos = getCardPos(`structure:${structure.id}`, packed.x, packed.y);

				const { w: defW, h: defH } = idealSizes[index] ?? { w: cellWidth, h: cellHeight };
				const sz = getCardSize(`structure:${structure.id}`, defW, defH);
				const frameX = pos.x;
				const frameY = pos.y;
				const frameWidth = sz.w;
				const frameHeight = sz.h;
				const kindBadge = getStructureKindBadge(structure.kind);
				newHitboxes.push({
					id: `structure:${structure.id}`,
					x: frameX,
					y: frameY,
					w: frameWidth,
					h: frameHeight,
					minW: 200,
					minH: 210,
					tooltip: kindBadge.tooltip
				});
				const structureColor =
					structure.properties?.color ??
					(structure.kind === "stack"
						? "#ffd36e"
						: structure.kind === "queue"
							? "#a8dcff"
							: "#d7c3ff");
				const labelColor =
					structure.kind === "stack"
						? "#b78312"
						: structure.kind === "queue"
							? "#2f7cb8"
							: "#7c52ba";

				const radius = Math.round(26 * layoutScale);
				const titleFont = Math.max(18, Math.round(24 * layoutScale));
				const metaFont = Math.max(11, Math.round(14 * layoutScale));
				const labelPad = Math.round(18 * layoutScale);
				const headerH = Math.round(56 * layoutScale);
				const graphicTop = frameY + headerH;

				// Card background
				ctx.fillStyle = "rgba(255,255,255,0.9)";
				drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, radius);
				ctx.fill();
				ctx.strokeStyle = "#d3e4f4";
				ctx.lineWidth = 2;
				ctx.stroke();

				// Header band background (top rounded, flat bottom)
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(frameX + radius, frameY);
				ctx.lineTo(frameX + frameWidth - radius, frameY);
				ctx.arcTo(frameX + frameWidth, frameY, frameX + frameWidth, frameY + radius, radius);
				ctx.lineTo(frameX + frameWidth, graphicTop);
				ctx.lineTo(frameX, graphicTop);
				ctx.arcTo(frameX, frameY + radius, frameX + radius, frameY, radius);
				ctx.closePath();
				ctx.fillStyle = "rgba(240,246,252,0.95)";
				ctx.fill();
				ctx.restore();

				// Separator line between header and body
				ctx.strokeStyle = "#d3e4f4";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(frameX + Math.round(12 * layoutScale), graphicTop);
				ctx.lineTo(frameX + frameWidth - Math.round(12 * layoutScale), graphicTop);
				ctx.stroke();

				const iconSize = Math.round(15 * layoutScale);
				const row1Y = frameY + Math.round(34 * layoutScale);
				drawStructureKindIcon(
					ctx,
					kindBadge.icon,
					frameX + labelPad,
					row1Y - iconSize + Math.round(1 * layoutScale),
					iconSize,
					labelColor
				);

				// Structure ID (row 2, left — always within header band)
				ctx.font = `900 ${titleFont}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#355070";
				ctx.fillText(structure.id, frameX + labelPad + iconSize + Math.round(10 * layoutScale), row1Y);

				if (showStructureConfigActions) {
					const actionWidth = Math.max(24, Math.round(28 * layoutScale));
					const actionHeight = Math.max(24, Math.round(28 * layoutScale));
					const actionX = frameX + frameWidth - actionWidth - Math.round(12 * layoutScale);
					const actionY = frameY + Math.round(12 * layoutScale);

					ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
					drawRoundedRect(ctx, actionX, actionY, actionWidth, actionHeight, Math.max(6, Math.round(8 * layoutScale)));
					ctx.fill();
					ctx.strokeStyle = "rgba(158, 197, 229, 0.82)";
					ctx.lineWidth = 2;
					ctx.stroke();

					ctx.fillStyle = "#355070";
					ctx.font = `900 ${Math.max(13, Math.round(16 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
					ctx.textAlign = "center";
					ctx.fillText("⚙", actionX + actionWidth / 2, actionY + actionHeight * 0.68);
					ctx.textAlign = "start";

					structureConfigHitboxes.push({
						id: structure.id,
						x: actionX,
						y: actionY,
						width: actionWidth,
						height: actionHeight
					});
				}

				// Clip all subsequent drawing to the body region (below header)
				ctx.save();
				ctx.beginPath();
				ctx.rect(frameX, graphicTop, frameWidth, frameHeight - headerH);
				ctx.clip();

				if (structure.kind === "stack") {
					const slotWidth = Math.min(Math.round(120 * layoutScale), frameWidth * 0.34);
					const slotHeight = Math.max(24, Math.round(34 * layoutScale));
					const slotGap = Math.round(6 * layoutScale);
					const towerX = frameX + frameWidth * 0.5 - slotWidth * 0.5;
					const baseY = frameY + frameHeight - Math.round(22 * layoutScale);
					const topY = graphicTop + Math.round(4 * layoutScale);
					const bodyH = baseY - topY;
					const maxFit = Math.max(1, Math.floor(bodyH / (slotHeight + slotGap)));

					// animation state
					const sqTrans = stackQueueTransitionRef.current;
					const sqEntry = sqTrans.active ? sqTrans.transitions[structure.id] : undefined;
					const sqProgress = sqTrans.active
						? normalizePhaseProgress((now - sqTrans.startAt) / sqTrans.durationMs)
						: 1;
					const eased = easeInOut(sqProgress);

					const totalItems = structure.values.length;
					const hasOverflow = totalItems > maxFit;
					const maxVisible = hasOverflow ? Math.max(1, maxFit - 1) : maxFit;
					const hiddenCount = Math.max(0, totalItems - maxVisible);
					const visibleValues = structure.values.slice(hiddenCount);

					ctx.strokeStyle = "#7b93ab";
					ctx.lineWidth = Math.max(3, Math.round(5 * layoutScale));
					ctx.beginPath();
					ctx.moveTo(towerX, topY);
					ctx.lineTo(towerX, baseY);
					ctx.moveTo(towerX + slotWidth, topY);
					ctx.lineTo(towerX + slotWidth, baseY);
					ctx.moveTo(towerX - Math.round(10 * layoutScale), baseY);
					ctx.lineTo(towerX + slotWidth + Math.round(10 * layoutScale), baseY);
					ctx.stroke();

					const drawStackSlot = (item: DataNode, itemY: number, alpha: number) => {
						ctx.save();
						ctx.globalAlpha = alpha;
						ctx.fillStyle = item.color ?? structureColor;
						drawRoundedRect(
							ctx,
							towerX + Math.round(8 * layoutScale),
							itemY,
							slotWidth - Math.round(16 * layoutScale),
							slotHeight,
							Math.max(8, Math.round(10 * layoutScale))
						);
						ctx.fill();
						ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
						ctx.lineWidth = 2;
						ctx.stroke();
						ctx.fillStyle = "#355070";
						ctx.font = `800 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText(String(item.value), towerX + slotWidth / 2, itemY + Math.round(slotHeight * 0.66));
						ctx.textAlign = "start";
						ctx.restore();
					};

					visibleValues.forEach((node, valueIndex) => {
						const finalItemY = baseY - slotHeight - valueIndex * (slotHeight + slotGap);
						const item = node as DataNode;
						const isTopItem = valueIndex === visibleValues.length - 1;
						if (sqEntry && isTopItem && sqEntry.kind === "push" && eased < 1) {
							// slide in from above
							const startItemY = topY - slotHeight;
							const itemY = startItemY + (finalItemY - startItemY) * eased;
							drawStackSlot(item, itemY, eased);
						} else {
							drawStackSlot(item, finalItemY, 1);
						}
					});

					// CIMA label above top item
					if (visibleValues.length > 0) {
						const topItemY = baseY - slotHeight - (visibleValues.length - 1) * (slotHeight + slotGap);
						ctx.save();
						ctx.fillStyle = "#7b93ab";
						ctx.font = `700 ${Math.max(8, Math.round(10 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText("CIMA", towerX + slotWidth / 2, topItemY - Math.round(4 * layoutScale));
						ctx.textAlign = "start";
						ctx.restore();
					}

					// ghost for pop: show removed top item sliding up and fading
					if (sqEntry && sqEntry.kind === "pop" && eased < 1) {
						const fromValues = sqEntry.from;
						const removedItem = fromValues[fromValues.length - 1] as DataNode | undefined;
						if (removedItem) {
							const restCount = sqEntry.to.length;
							const ghostBaseY = baseY - slotHeight - restCount * (slotHeight + slotGap);
							const ghostY = ghostBaseY - eased * slotHeight * 2;
							drawStackSlot(removedItem, ghostY, 1 - eased);
						}
					}

					if (hiddenCount > 0) {
						const overflowSlotY = baseY - slotHeight - maxVisible * (slotHeight + slotGap);
						ctx.fillStyle = "#6d8297";
						ctx.font = `700 ${Math.max(11, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText(`+${hiddenCount}`, towerX + slotWidth / 2, overflowSlotY + Math.round(slotHeight * 0.66));
						ctx.textAlign = "start";
					}

					// read highlight animations for stack
					const stackReadHL = listReadHighlightRef.current;
					if (stackReadHL && stackReadHL.structureId === structure.id && stackReadHL.structureKind === "stack") {
						const rp = normalizePhaseProgress((now - stackReadHL.startedAt) / stackReadHL.durationMs);
						if (rp >= 1) {
							listReadHighlightRef.current = null;
						} else {
							const pulse = 0.5 + 0.5 * Math.sin(rp * Math.PI * 4);
							const op = stackReadHL.operation;
							if (op === "peek") {
								// eye on top slot
								const topItemY = baseY - slotHeight - (visibleValues.length - 1) * (slotHeight + slotGap);
								const eyeCx = towerX + slotWidth + Math.round(14 * layoutScale);
								const eyeCy = topItemY + slotHeight / 2;
								const eyeRx = Math.round(9 * layoutScale);
								const eyeRy = Math.round(6 * layoutScale);
								ctx.save();
								ctx.globalAlpha = 0.55 + 0.4 * pulse;
								ctx.strokeStyle = "#7c52ba";
								ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
								ctx.beginPath();
								ctx.ellipse(eyeCx, eyeCy, eyeRx, eyeRy, 0, 0, Math.PI * 2);
								ctx.stroke();
								ctx.fillStyle = "#7c52ba";
								ctx.beginPath();
								ctx.arc(eyeCx, eyeCy, Math.round(3 * layoutScale), 0, Math.PI * 2);
								ctx.fill();
								// lash lines top
								ctx.beginPath();
								ctx.moveTo(eyeCx, eyeCy - eyeRy);
								ctx.lineTo(eyeCx, eyeCy - eyeRy - Math.round(3 * layoutScale));
								ctx.stroke();
								// connector line to slot
								ctx.setLineDash([Math.round(3 * layoutScale), Math.round(3 * layoutScale)]);
								ctx.beginPath();
								ctx.moveTo(towerX + slotWidth, topItemY + slotHeight / 2);
								ctx.lineTo(eyeCx - eyeRx, eyeCy);
								ctx.stroke();
								ctx.setLineDash([]);
								ctx.restore();
							} else if (op === "size" || op === "is_empty") {
								const totalSlots = structure.values.length;
								const isEmpty = op === "is_empty";
								const isEmptyTrue = isEmpty && stackReadHL.readValue === true;
								const rulerColor = isEmpty ? (isEmptyTrue ? "#2a8a5a" : "#c0302a") : "#2a6aaa";
								const rulerX = towerX - Math.round(18 * layoutScale);
								const rulerTop = totalSlots > 0 ? baseY - totalSlots * (slotHeight + slotGap) : baseY - Math.round(10 * layoutScale);
								const rulerBottom = baseY;
								ctx.save();
								ctx.globalAlpha = 0.5 + 0.4 * pulse;
								ctx.strokeStyle = rulerColor;
								ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
								ctx.beginPath();
								ctx.moveTo(rulerX, rulerTop);
								ctx.lineTo(rulerX, rulerBottom);
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(rulerX - Math.round(5 * layoutScale), rulerTop);
								ctx.lineTo(rulerX + Math.round(5 * layoutScale), rulerTop);
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(rulerX - Math.round(5 * layoutScale), rulerBottom);
								ctx.lineTo(rulerX + Math.round(5 * layoutScale), rulerBottom);
								ctx.stroke();
								for (let t = 0; t <= totalSlots; t++) {
									const ty = rulerBottom - t * (slotHeight + slotGap);
									ctx.beginPath();
									ctx.moveTo(rulerX - Math.round(3 * layoutScale), ty);
									ctx.lineTo(rulerX + Math.round(3 * layoutScale), ty);
									ctx.stroke();
								}
								ctx.fillStyle = rulerColor;
								ctx.font = `700 ${Math.max(10, Math.round(12 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
								ctx.textAlign = "center";
								const labelY = rulerTop - Math.round(6 * layoutScale);
								if (isEmpty) {
									// checkmark or X symbol
									const sym = isEmptyTrue ? "✓" : "✗";
									ctx.font = `900 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
									ctx.fillText(sym, rulerX, labelY);
								} else {
									ctx.fillText(String(totalSlots), rulerX, labelY);
								}
								ctx.textAlign = "start";
								ctx.restore();
							}
						}
					}
				} else if (structure.kind === "queue") {
					const itemWidth = Math.max(36, Math.round(58 * layoutScale));
					const itemHeight = itemWidth;
					const laneX = frameX + Math.round(20 * layoutScale);
					const laneY = frameY + frameHeight - Math.round(30 * layoutScale);
					const startX = frameX + Math.round(28 * layoutScale);
					const itemStep = itemWidth + Math.round(8 * layoutScale);
					const maxVisible = Math.max(
						1,
						Math.floor((frameWidth - Math.round(56 * layoutScale)) / itemStep)
					);

					// animation state
					const sqTrans = stackQueueTransitionRef.current;
					const sqEntry = sqTrans.active ? sqTrans.transitions[structure.id] : undefined;
					const sqProgress = sqTrans.active
						? normalizePhaseProgress((now - sqTrans.startAt) / sqTrans.durationMs)
						: 1;
					const eased = easeInOut(sqProgress);

					ctx.strokeStyle = "#7b93ab";
					ctx.lineWidth = Math.max(3, Math.round(5 * layoutScale));
					ctx.beginPath();
					ctx.moveTo(laneX, laneY);
					ctx.lineTo(frameX + frameWidth - Math.round(20 * layoutScale), laneY);
					ctx.stroke();

					const drawQueueItem = (item: DataNode, itemX: number, alpha: number) => {
						const itemY = laneY - itemHeight - Math.round(8 * layoutScale);
						ctx.save();
						ctx.globalAlpha = alpha;
						ctx.fillStyle = item.color ?? structureColor;
						drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, Math.max(8, Math.round(12 * layoutScale)));
						ctx.fill();
						ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
						ctx.lineWidth = 2;
						ctx.stroke();
						ctx.fillStyle = "#355070";
						ctx.font = `800 ${Math.max(12, Math.round(16 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText(String(item.value), itemX + itemWidth / 2, itemY + Math.round(itemHeight * 0.62));
						ctx.textAlign = "start";
						ctx.restore();
					};

					structure.values.slice(0, maxVisible).forEach((node, valueIndex) => {
						const finalX = startX + valueIndex * itemStep;
						const item = node as DataNode;
						const isLastItem = valueIndex === Math.min(structure.values.length, maxVisible) - 1;
						if (sqEntry && isLastItem && sqEntry.kind === "enqueue" && eased < 1) {
							// slide in from right
							const offscreenX = startX + maxVisible * itemStep;
							const itemX = offscreenX + (finalX - offscreenX) * eased;
							drawQueueItem(item, itemX, eased);
						} else if (sqEntry && sqEntry.kind === "dequeue" && eased < 1) {
							// items shift left during dequeue
							const shiftedX = finalX - itemStep * (1 - eased);
							drawQueueItem(item, shiftedX, 1);
						} else {
							drawQueueItem(item, finalX, 1);
						}
					});

					// FRENTE label above front item
					if (structure.values.length > 0) {
						const frontItemY = laneY - itemHeight - Math.round(8 * layoutScale);
						ctx.save();
						ctx.fillStyle = "#7b93ab";
						ctx.font = `700 ${Math.max(8, Math.round(10 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText("FRENTE", startX + itemWidth / 2, frontItemY - Math.round(4 * layoutScale));
						ctx.textAlign = "start";
						ctx.restore();
					}

					// ghost for dequeue: show removed front item sliding left and fading
					if (sqEntry && sqEntry.kind === "dequeue" && eased < 1) {
						const removedItem = sqEntry.from[0] as DataNode | undefined;
						if (removedItem) {
							const ghostX = startX - eased * itemStep;
							drawQueueItem(removedItem, ghostX, 1 - eased);
						}
					}

					if (structure.values.length > maxVisible) {
						ctx.fillStyle = "#6d8297";
						ctx.font = `700 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.fillText(
							`+${structure.values.length - maxVisible}`,
							frameX + frameWidth - Math.round(54 * layoutScale),
							graphicTop + Math.round(24 * layoutScale)
						);
					}

					// read highlight animations for queue
					const queueReadHL = listReadHighlightRef.current;
					if (queueReadHL && queueReadHL.structureId === structure.id && queueReadHL.structureKind === "queue") {
						const rp = normalizePhaseProgress((now - queueReadHL.startedAt) / queueReadHL.durationMs);
						if (rp >= 1) {
							listReadHighlightRef.current = null;
						} else {
							const pulse = 0.5 + 0.5 * Math.sin(rp * Math.PI * 4);
							const op = queueReadHL.operation;
							const itemY = laneY - itemHeight - Math.round(8 * layoutScale);
							if (op === "peek") {
								// eye above the front (first) item
								const frontX = startX + itemWidth / 2;
								const eyeCy = itemY - Math.round(14 * layoutScale);
								const eyeRx = Math.round(9 * layoutScale);
								const eyeRy = Math.round(6 * layoutScale);
								ctx.save();
								ctx.globalAlpha = 0.55 + 0.4 * pulse;
								ctx.strokeStyle = "#7c52ba";
								ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
								ctx.beginPath();
								ctx.ellipse(frontX, eyeCy, eyeRx, eyeRy, 0, 0, Math.PI * 2);
								ctx.stroke();
								ctx.fillStyle = "#7c52ba";
								ctx.beginPath();
								ctx.arc(frontX, eyeCy, Math.round(3 * layoutScale), 0, Math.PI * 2);
								ctx.fill();
								// connector line down to item
								ctx.setLineDash([Math.round(3 * layoutScale), Math.round(3 * layoutScale)]);
								ctx.beginPath();
								ctx.moveTo(frontX, eyeCy + eyeRy);
								ctx.lineTo(frontX, itemY);
								ctx.stroke();
								ctx.setLineDash([]);
								ctx.restore();
							} else if (op === "size" || op === "is_empty") {
								const total = structure.values.length;
								const isEmpty = op === "is_empty";
								const isEmptyTrue = isEmpty && queueReadHL.readValue === true;
								const rulerColor = isEmpty ? (isEmptyTrue ? "#2a8a5a" : "#c0302a") : "#2a6aaa";
								const totalVisible = Math.min(total, maxVisible);
								const rulerY = laneY + Math.round(12 * layoutScale);
								const rulerLeft = startX;
								const rulerRight = total > 0
									? startX + totalVisible * itemStep - Math.round(8 * layoutScale)
									: startX + Math.round(10 * layoutScale);
								ctx.save();
								ctx.globalAlpha = 0.5 + 0.4 * pulse;
								ctx.strokeStyle = rulerColor;
								ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
								ctx.beginPath();
								ctx.moveTo(rulerLeft, rulerY);
								ctx.lineTo(rulerRight, rulerY);
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(rulerLeft, rulerY - Math.round(5 * layoutScale));
								ctx.lineTo(rulerLeft, rulerY + Math.round(5 * layoutScale));
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(rulerRight, rulerY - Math.round(5 * layoutScale));
								ctx.lineTo(rulerRight, rulerY + Math.round(5 * layoutScale));
								ctx.stroke();
								for (let t = 0; t <= totalVisible; t++) {
									const tx = rulerLeft + t * itemStep - (t > 0 ? Math.round(8 * layoutScale) / 2 : 0);
									ctx.beginPath();
									ctx.moveTo(tx, rulerY - Math.round(3 * layoutScale));
									ctx.lineTo(tx, rulerY + Math.round(3 * layoutScale));
									ctx.stroke();
								}
								ctx.fillStyle = rulerColor;
								ctx.textAlign = "center";
								const labelX = (rulerLeft + rulerRight) / 2;
								const labelY = rulerY + Math.round(14 * layoutScale);
								if (isEmpty) {
									ctx.font = `900 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
									ctx.fillText(isEmptyTrue ? "✓" : "✗", labelX, labelY);
								} else {
									ctx.font = `700 ${Math.max(10, Math.round(12 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
									ctx.fillText(String(total), labelX, labelY);
								}
								ctx.textAlign = "start";
								ctx.restore();
							}
						}
					}
				} else {
					const itemWidth = Math.max(36, Math.round(58 * layoutScale));
					const itemHeight = Math.max(28, Math.round(42 * layoutScale));
					const laneX = frameX + Math.round(26 * layoutScale);
					const laneY = frameY + frameHeight - Math.round(30 * layoutScale);
					const startX = frameX + Math.round(30 * layoutScale);
					const maxVisible = Math.max(
						1,
						Math.floor((frameWidth - Math.round(60 * layoutScale)) / (itemWidth + Math.round(16 * layoutScale)))
					);

					ctx.strokeStyle = "#8e79c2";
					ctx.lineWidth = Math.max(2, Math.round(4 * layoutScale));
					ctx.beginPath();
					ctx.moveTo(laneX, laneY);
					ctx.lineTo(frameX + frameWidth - Math.round(24 * layoutScale), laneY);
					ctx.stroke();

					const listTransition = listTransitionRef.current;
					const transitionProgressRaw = listTransition.active
						? (now - listTransition.startAt) / listTransition.durationMs
						: 1;
					const transitionProgress = Math.max(0, Math.min(1, transitionProgressRaw));
					if (listTransition.active && transitionProgress >= 1) {
						listTransition.active = false;
					}

					const currentValues = structure.values.slice(0, maxVisible).map((value) => value as DataNode);
					const previousValues = (
						listTransition.active
							? (listTransition.from[structure.id] ?? currentValues)
							: currentValues
					)
						.slice(0, maxVisible)
						.map((value) => value as DataNode);
					const transitionKind = detectListTransitionKind(previousValues, currentValues);
					const isAppendTransition = listTransition.active && transitionKind === "append";
					const isPrependTransition = listTransition.active && transitionKind === "prepend";
					const isRemoveFirstTransition = listTransition.active && transitionKind === "remove_first";
					const isRemoveLastTransition = listTransition.active && transitionKind === "remove_last";
					const appendCreateEnd = 0.3;
					const appendConnectEnd = 0.72;
					const appendCreateProgress = normalizePhaseProgress(transitionProgress / appendCreateEnd);
					const appendConnectProgress = normalizePhaseProgress(
						(transitionProgress - appendCreateEnd) / (appendConnectEnd - appendCreateEnd)
					);
					const appendTailProgress = normalizePhaseProgress(
						(transitionProgress - appendConnectEnd) / (1 - appendConnectEnd)
					);
					const prependCreateEnd = 0.3;
					const prependConnectEnd = 0.72;
					const prependCreateProgress = normalizePhaseProgress(transitionProgress / prependCreateEnd);
					const prependConnectProgress = normalizePhaseProgress(
						(transitionProgress - prependCreateEnd) / (prependConnectEnd - prependCreateEnd)
					);
					const prependHeadProgress = normalizePhaseProgress(
						(transitionProgress - prependConnectEnd) / (1 - prependConnectEnd)
					);
					const removeDetachEnd = 0.55;
					const removeFadeProgress = normalizePhaseProgress(
						(transitionProgress - removeDetachEnd) / (1 - removeDetachEnd)
					);

					const buildKeyedNodes = (values: DataNode[]) => {
						const counter = new Map<string, number>();
						return values.map((node, index) => {
							const signature = `${String(node.value)}|${node.color ?? ""}`;
							const occurrence = counter.get(signature) ?? 0;
							counter.set(signature, occurrence + 1);
							return {
								key: `${signature}|${occurrence}`,
								node,
								index
							};
						});
					};

					const previousKeyed = buildKeyedNodes(previousValues);
					const currentKeyed = buildKeyedNodes(currentValues);
					const previousHeadKey = previousKeyed[0]?.key ?? null;
					const previousTailKey = previousKeyed[previousKeyed.length - 1]?.key ?? null;
					const currentHeadKey = currentKeyed[0]?.key ?? null;
					const currentTailKey = currentKeyed[currentKeyed.length - 1]?.key ?? null;
					const previousByKey = new Map(previousKeyed.map((entry) => [entry.key, entry]));
					const currentByKey = new Map(currentKeyed.map((entry) => [entry.key, entry]));

					const allKeys = new Set<string>([
						...previousKeyed.map((entry) => entry.key),
						...currentKeyed.map((entry) => entry.key)
					]);

					const indexToX = (index: number) =>
						startX + index * (itemWidth + Math.round(16 * layoutScale));
					const baseY = laneY - itemHeight - Math.round(10 * layoutScale);

					type RenderNode = {
						key: string;
						node: DataNode;
						x: number;
						y: number;
						alpha: number;
						connectAlpha: number;
						nullArrowAlpha: number;
						toIndex: number | null;
						fromIndex: number | null;
					};

					const renderedNodes: RenderNode[] = [];
					allKeys.forEach((key) => {
						const previousEntry = previousByKey.get(key);
						const currentEntry = currentByKey.get(key);
						if (previousEntry && currentEntry) {
							const fromX = indexToX(previousEntry.index);
							const toX = indexToX(currentEntry.index);
							renderedNodes.push({
								key,
								node: currentEntry.node,
								x: fromX + (toX - fromX) * transitionProgress,
								y: baseY,
								alpha: 1,
								connectAlpha: 1,
								nullArrowAlpha: 0,
								toIndex: currentEntry.index,
								fromIndex: previousEntry.index
							});
							return;
						}
						if (previousEntry) {
							const fromX = indexToX(previousEntry.index);
							const isRemovedHead = previousEntry.key === previousHeadKey;
							const isRemovedTail = previousEntry.key === previousTailKey;
							const shouldHoldNode =
								(isRemoveFirstTransition && isRemovedHead) ||
								(isRemoveLastTransition && isRemovedTail);
							if (shouldHoldNode) {
								if (transitionProgress < removeDetachEnd) {
									renderedNodes.push({
										key,
										node: previousEntry.node,
										x: fromX,
										y: baseY,
										alpha: 1,
										connectAlpha: normalizePhaseProgress(1 - transitionProgress / removeDetachEnd),
										nullArrowAlpha: isRemovedTail ? 1 : 0,
										toIndex: null,
										fromIndex: previousEntry.index
									});
									return;
								}
								renderedNodes.push({
									key,
									node: previousEntry.node,
									x: fromX + Math.round(10 * layoutScale) * removeFadeProgress,
									y: baseY - Math.round(12 * layoutScale) * removeFadeProgress,
									alpha: Math.max(0, 1 - removeFadeProgress),
									connectAlpha: 0,
									nullArrowAlpha: isRemovedTail ? Math.max(0, 1 - removeFadeProgress) : 0,
									toIndex: null,
									fromIndex: previousEntry.index
								});
								return;
							}
							renderedNodes.push({
								key,
								node: previousEntry.node,
								x: fromX + Math.round(10 * layoutScale) * transitionProgress,
								y: baseY - Math.round(10 * layoutScale) * transitionProgress,
								alpha: Math.max(0, 1 - transitionProgress),
								connectAlpha: Math.max(0, 1 - transitionProgress),
								nullArrowAlpha: 0,
								toIndex: null,
								fromIndex: previousEntry.index
							});
							return;
						}
						if (currentEntry) {
							const toX = indexToX(currentEntry.index);
							if (listTransition.active && !previousEntry) {
								const introX = toX + Math.round(34 * layoutScale);
								const introY = baseY - Math.round(20 * layoutScale);
								if (isAppendTransition) {
									if (transitionProgress < appendCreateEnd) {
										renderedNodes.push({
											key,
											node: currentEntry.node,
											x: introX,
											y: introY,
											alpha: Math.max(0.25, appendCreateProgress),
											connectAlpha: 0,
											nullArrowAlpha: 1,
											toIndex: currentEntry.index,
											fromIndex: null
										});
										return;
									}
									if (transitionProgress < appendConnectEnd) {
										renderedNodes.push({
											key,
											node: currentEntry.node,
											x: introX + (toX - introX) * appendConnectProgress,
											y: introY + (baseY - introY) * appendConnectProgress,
											alpha: 1,
											connectAlpha: appendConnectProgress,
											nullArrowAlpha: Math.max(0, 1 - appendConnectProgress * 0.25),
											toIndex: currentEntry.index,
											fromIndex: null
										});
										return;
									}
									renderedNodes.push({
										key,
										node: currentEntry.node,
										x: toX,
										y: baseY,
										alpha: 1,
										connectAlpha: 1,
										nullArrowAlpha: 1,
										toIndex: currentEntry.index,
										fromIndex: null
									});
									return;
								}
								if (isPrependTransition) {
									const prependIntroX = toX - Math.round(34 * layoutScale);
									const prependIntroY = baseY - Math.round(20 * layoutScale);
									if (transitionProgress < prependCreateEnd) {
										renderedNodes.push({
											key,
											node: currentEntry.node,
											x: prependIntroX,
											y: prependIntroY,
											alpha: Math.max(0.25, prependCreateProgress),
											connectAlpha: 0,
											nullArrowAlpha: 1,
											toIndex: currentEntry.index,
											fromIndex: null
										});
										return;
									}
									if (transitionProgress < prependConnectEnd) {
										renderedNodes.push({
											key,
											node: currentEntry.node,
											x: prependIntroX + (toX - prependIntroX) * prependConnectProgress,
											y: prependIntroY + (baseY - prependIntroY) * prependConnectProgress,
											alpha: 1,
											connectAlpha: prependConnectProgress,
											nullArrowAlpha: Math.max(0, 1 - prependConnectProgress * 0.25),
											toIndex: currentEntry.index,
											fromIndex: null
										});
										return;
									}
									renderedNodes.push({
										key,
										node: currentEntry.node,
										x: toX,
										y: baseY,
										alpha: 1,
										connectAlpha: 1,
										nullArrowAlpha: 0,
										toIndex: currentEntry.index,
										fromIndex: null
									});
									return;
								}

								renderedNodes.push({
									key,
									node: currentEntry.node,
									x: introX + (toX - introX) * transitionProgress,
									y: introY + (baseY - introY) * transitionProgress,
									alpha: Math.max(0.2, transitionProgress),
									connectAlpha: transitionProgress,
									nullArrowAlpha: Math.max(0, 1 - transitionProgress * 0.5),
									toIndex: currentEntry.index,
									fromIndex: null
								});
								return;
							}
							renderedNodes.push({
								key,
								node: currentEntry.node,
								x: toX + Math.round(10 * layoutScale) * (1 - transitionProgress),
								y: baseY + Math.round(10 * layoutScale) * (1 - transitionProgress),
								alpha: Math.max(0, transitionProgress),
								connectAlpha: transitionProgress,
								nullArrowAlpha: Math.max(0, 1 - transitionProgress),
								toIndex: currentEntry.index,
								fromIndex: null
							});
						}
					});

					renderedNodes.sort((left, right) => left.x - right.x);
					const renderByKey = new Map(renderedNodes.map((entry) => [entry.key, entry]));

					const drawPointer = (from: RenderNode, to: RenderNode, alpha: number) => {
						if (alpha <= 0) return;
						const centerY = from.y + itemHeight / 2;
						const startPointerX = from.x + itemWidth + Math.round(2 * layoutScale);
						const endPointerX = to.x - Math.round(8 * layoutScale);
						const arrowHalf = Math.max(4, Math.round(6 * layoutScale));
						const opacity = alpha * (0.55 + 0.4 * pointerPulse);

						ctx.save();
						ctx.strokeStyle = `rgba(124, 82, 186, ${opacity})`;
						ctx.lineWidth = Math.max(2, Math.round(3 * layoutScale));
						ctx.setLineDash([Math.max(4, Math.round(6 * layoutScale)), Math.max(3, Math.round(5 * layoutScale))]);
						ctx.lineDashOffset = pointerDashOffset;
						ctx.beginPath();
						ctx.moveTo(startPointerX, centerY);
						ctx.lineTo(endPointerX, centerY);
						ctx.stroke();
						ctx.restore();

						ctx.fillStyle = `rgba(124, 82, 186, ${Math.min(1, alpha * (0.76 + 0.2 * pointerPulse))})`;
						ctx.beginPath();
						ctx.moveTo(endPointerX + Math.round(5 * layoutScale), centerY);
						ctx.lineTo(endPointerX - Math.round(3 * layoutScale), centerY - arrowHalf);
						ctx.lineTo(endPointerX - Math.round(3 * layoutScale), centerY + arrowHalf);
						ctx.closePath();
						ctx.fill();
					};

					for (let i = 1; i < previousKeyed.length; i += 1) {
						const left = renderByKey.get(previousKeyed[i - 1]!.key);
						const right = renderByKey.get(previousKeyed[i]!.key);
						if (!left || !right) continue;
						drawPointer(left, right, 1 - transitionProgress);
					}
					for (let i = 1; i < currentKeyed.length; i += 1) {
						const left = renderByKey.get(currentKeyed[i - 1]!.key);
						const right = renderByKey.get(currentKeyed[i]!.key);
						if (!left || !right) continue;
						const targetAlpha =
							isAppendTransition && transitionProgress < appendCreateEnd
								? 0
								: transitionProgress * Math.min(left.connectAlpha, right.connectAlpha);
						drawPointer(left, right, targetAlpha);
					}

					renderedNodes.forEach((entry) => {
						if (entry.alpha <= 0) return;
						ctx.save();
						ctx.globalAlpha = entry.alpha;
						ctx.fillStyle = entry.node.color ?? structureColor;
						drawRoundedRect(ctx, entry.x, entry.y, itemWidth, itemHeight, Math.max(8, Math.round(12 * layoutScale)));
						ctx.fill();
						ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
						ctx.lineWidth = 2;
						ctx.stroke();

						ctx.fillStyle = "#355070";
						ctx.font = `800 ${Math.max(11, Math.round(15 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.textAlign = "center";
						ctx.fillText(
							String(entry.node.value),
							entry.x + itemWidth / 2,
							entry.y + Math.round(itemHeight * 0.64)
						);
						ctx.textAlign = "start";
						ctx.restore();

						if (entry.nullArrowAlpha > 0) {
							const nullStartX = entry.x + itemWidth + Math.round(2 * layoutScale);
							const nullEndX = nullStartX + Math.round(16 * layoutScale);
							const nullY = entry.y + itemHeight / 2;
							const arrowHalf = Math.max(4, Math.round(6 * layoutScale));
							const opacity = entry.nullArrowAlpha * (0.65 + 0.25 * pointerPulse);

							ctx.save();
							ctx.strokeStyle = `rgba(124, 82, 186, ${opacity})`;
							ctx.lineWidth = Math.max(2, Math.round(3 * layoutScale));
							ctx.beginPath();
							ctx.moveTo(nullStartX, nullY);
							ctx.lineTo(nullEndX, nullY);
							ctx.stroke();

							ctx.fillStyle = `rgba(124, 82, 186, ${opacity})`;
							ctx.beginPath();
							ctx.moveTo(nullEndX + Math.round(5 * layoutScale), nullY);
							ctx.lineTo(nullEndX - Math.round(3 * layoutScale), nullY - arrowHalf);
							ctx.lineTo(nullEndX - Math.round(3 * layoutScale), nullY + arrowHalf);
							ctx.closePath();
							ctx.fill();
							ctx.restore();
						}
					});

					if (currentValues.length > 0) {
						const firstCurrentKey = currentKeyed[0]?.key;
						const lastCurrentKey = currentKeyed[currentKeyed.length - 1]?.key;
						const previousLastKey = previousKeyed[previousKeyed.length - 1]?.key;
						const firstEntry = firstCurrentKey ? (renderByKey.get(firstCurrentKey) ?? null) : null;
						const lastEntry = lastCurrentKey ? (renderByKey.get(lastCurrentKey) ?? null) : null;
						const previousLastEntry = previousLastKey ? (renderByKey.get(previousLastKey) ?? null) : null;

						const drawMarker = (label: "HEAD" | "TAIL", entry: RenderNode, alpha: number) => {
							if (alpha <= 0) return;
							const pointerTopY = entry.y - Math.round(18 * layoutScale);
							ctx.save();
							ctx.globalAlpha = alpha;
							ctx.fillStyle = "#7c52ba";
							ctx.strokeStyle = "#7c52ba";
							ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
							ctx.font = `800 ${Math.max(9, Math.round(11 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
							if (label === "HEAD") {
								ctx.textAlign = "start";
								ctx.fillText("HEAD", entry.x + Math.round(2 * layoutScale), pointerTopY - Math.round(2 * layoutScale));
								ctx.beginPath();
								ctx.moveTo(entry.x + Math.round(16 * layoutScale), pointerTopY);
								ctx.lineTo(entry.x + Math.round(16 * layoutScale), entry.y - Math.round(2 * layoutScale));
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(entry.x + Math.round(16 * layoutScale), entry.y + Math.round(2 * layoutScale));
								ctx.lineTo(entry.x + Math.round(11 * layoutScale), entry.y - Math.round(5 * layoutScale));
								ctx.lineTo(entry.x + Math.round(21 * layoutScale), entry.y - Math.round(5 * layoutScale));
								ctx.closePath();
								ctx.fill();
							} else {
								ctx.textAlign = "right";
								ctx.fillText(
									"TAIL",
									entry.x + itemWidth - Math.round(2 * layoutScale),
									pointerTopY - Math.round(2 * layoutScale)
								);
								ctx.beginPath();
								ctx.moveTo(entry.x + itemWidth - Math.round(16 * layoutScale), pointerTopY);
								ctx.lineTo(entry.x + itemWidth - Math.round(16 * layoutScale), entry.y - Math.round(2 * layoutScale));
								ctx.stroke();
								ctx.beginPath();
								ctx.moveTo(entry.x + itemWidth - Math.round(16 * layoutScale), entry.y + Math.round(2 * layoutScale));
								ctx.lineTo(entry.x + itemWidth - Math.round(21 * layoutScale), entry.y - Math.round(5 * layoutScale));
								ctx.lineTo(entry.x + itemWidth - Math.round(11 * layoutScale), entry.y - Math.round(5 * layoutScale));
								ctx.closePath();
								ctx.fill();
							}
							ctx.restore();
							ctx.textAlign = "start";
						};

						const previousHeadEntry = previousHeadKey ? (renderByKey.get(previousHeadKey) ?? null) : null;
						const previousTailEntry = previousTailKey ? (renderByKey.get(previousTailKey) ?? null) : null;

						if (isPrependTransition && previousHeadEntry && firstEntry && previousHeadKey !== currentHeadKey) {
							if (transitionProgress < prependConnectEnd) {
								drawMarker("HEAD", previousHeadEntry, 1);
							} else {
								const blendedHeadEntry = {
									...firstEntry,
									x: previousHeadEntry.x + (firstEntry.x - previousHeadEntry.x) * prependHeadProgress,
									y: previousHeadEntry.y + (firstEntry.y - previousHeadEntry.y) * prependHeadProgress
								};
								drawMarker("HEAD", blendedHeadEntry, 1);
							}
						} else if (isRemoveFirstTransition && previousHeadEntry && firstEntry && previousHeadKey !== currentHeadKey) {
							const headDetachProgress = normalizePhaseProgress(transitionProgress / removeDetachEnd);
							const blendedHeadEntry = {
								...firstEntry,
								x: previousHeadEntry.x + (firstEntry.x - previousHeadEntry.x) * headDetachProgress,
								y: previousHeadEntry.y + (firstEntry.y - previousHeadEntry.y) * headDetachProgress
							};
							drawMarker("HEAD", blendedHeadEntry, 1);
						} else if (firstEntry) {
							drawMarker("HEAD", firstEntry, Math.max(0.7, firstEntry.alpha));
						}

						if (isAppendTransition && previousLastEntry && lastEntry && previousTailKey !== currentTailKey) {
							const drawOldTailNullArrow = (alpha: number) => {
								if (alpha <= 0) return;
								const terminalStartX = previousLastEntry.x + itemWidth + Math.round(2 * layoutScale);
								const terminalEndX = terminalStartX + Math.round(16 * layoutScale);
								const terminalY = previousLastEntry.y + itemHeight / 2;
								const arrowHalf = Math.max(4, Math.round(6 * layoutScale));
								const opacity = alpha * (0.66 + 0.3 * pointerPulse);
								ctx.save();
								ctx.strokeStyle = `rgba(124, 82, 186, ${opacity})`;
								ctx.lineWidth = Math.max(2, Math.round(3 * layoutScale));
								ctx.beginPath();
								ctx.moveTo(terminalStartX, terminalY);
								ctx.lineTo(terminalEndX, terminalY);
								ctx.stroke();
								ctx.fillStyle = `rgba(124, 82, 186, ${opacity})`;
								ctx.beginPath();
								ctx.moveTo(terminalEndX + Math.round(5 * layoutScale), terminalY);
								ctx.lineTo(terminalEndX - Math.round(3 * layoutScale), terminalY - arrowHalf);
								ctx.lineTo(terminalEndX - Math.round(3 * layoutScale), terminalY + arrowHalf);
								ctx.closePath();
								ctx.fill();
								ctx.restore();
							};

							if (transitionProgress < appendConnectEnd) {
								drawMarker("TAIL", previousLastEntry, 1);
								if (transitionProgress < appendCreateEnd) {
									drawOldTailNullArrow(1);
								} else {
									drawOldTailNullArrow(Math.max(0, 1 - appendConnectProgress));
								}
							} else {
								const blendedTailEntry = {
									...lastEntry,
									x: previousLastEntry.x + (lastEntry.x - previousLastEntry.x) * appendTailProgress,
									y: previousLastEntry.y + (lastEntry.y - previousLastEntry.y) * appendTailProgress
								};
								drawMarker("TAIL", blendedTailEntry, 1);
							}
						} else if (isRemoveLastTransition && previousTailEntry && lastEntry && previousTailKey !== currentTailKey) {
							const tailDetachProgress = normalizePhaseProgress(transitionProgress / removeDetachEnd);
							const blendedTailEntry = {
								...lastEntry,
								x: previousTailEntry.x + (lastEntry.x - previousTailEntry.x) * tailDetachProgress,
								y: previousTailEntry.y + (lastEntry.y - previousTailEntry.y) * tailDetachProgress
							};
							drawMarker("TAIL", blendedTailEntry, 1);
						} else if (lastEntry) {
							drawMarker("TAIL", lastEntry, Math.max(0.7, lastEntry.alpha));
						}

						const readHighlight = listReadHighlightRef.current;
						if (readHighlight && readHighlight.structureId === structure.id) {
							const readProgress =
								(now - readHighlight.startedAt) / readHighlight.durationMs;
							if (readProgress >= 1) {
								listReadHighlightRef.current = null;
							} else {
								const pulse = 0.5 + 0.5 * Math.sin(readProgress * Math.PI * 4);
								const opacity = 0.22 + 0.22 * pulse;
								const drawNodePulse = (entry: RenderNode | null) => {
									if (!entry) return;
									ctx.save();
									ctx.fillStyle = `rgba(124, 82, 186, ${opacity})`;
									drawRoundedRect(
										ctx,
										entry.x - Math.round(4 * layoutScale),
										entry.y - Math.round(4 * layoutScale),
										itemWidth + Math.round(8 * layoutScale),
										itemHeight + Math.round(8 * layoutScale),
										Math.max(10, Math.round(14 * layoutScale))
									);
									ctx.fill();
									ctx.restore();
								};

								if (readHighlight.operation === "get_head") {
									drawNodePulse(firstEntry);
								} else if (readHighlight.operation === "get_tail") {
									drawNodePulse(lastEntry);
								} else {
									ctx.save();
									ctx.fillStyle = `rgba(124, 82, 186, ${0.1 + 0.14 * pulse})`;
									drawRoundedRect(
										ctx,
										frameX + Math.round(14 * layoutScale),
										graphicTop + Math.round(4 * layoutScale),
										frameWidth - Math.round(28 * layoutScale),
										frameHeight - headerH - Math.round(16 * layoutScale),
										Math.max(10, Math.round(14 * layoutScale))
									);
									ctx.fill();
									ctx.restore();
								}
							}
						}

						if (
							currentValues.length === structure.values.length &&
							lastEntry &&
							(
								(!isAppendTransition || transitionProgress >= appendConnectEnd) &&
								(!isRemoveLastTransition || transitionProgress >= removeDetachEnd)
							)
						) {
							const terminalStartX = lastEntry.x + itemWidth + Math.round(2 * layoutScale);
							const terminalEndX = terminalStartX + Math.round(16 * layoutScale);
							const terminalY = lastEntry.y + itemHeight / 2;
							const arrowHalf = Math.max(4, Math.round(6 * layoutScale));

							ctx.strokeStyle = `rgba(124, 82, 186, ${0.66 + 0.3 * pointerPulse})`;
							ctx.lineWidth = Math.max(2, Math.round(3 * layoutScale));
							ctx.beginPath();
							ctx.moveTo(terminalStartX, terminalY);
							ctx.lineTo(terminalEndX, terminalY);
							ctx.stroke();

							ctx.fillStyle = `rgba(124, 82, 186, ${0.66 + 0.3 * pointerPulse})`;
							ctx.beginPath();
							ctx.moveTo(terminalEndX + Math.round(5 * layoutScale), terminalY);
							ctx.lineTo(terminalEndX - Math.round(3 * layoutScale), terminalY - arrowHalf);
							ctx.lineTo(terminalEndX - Math.round(3 * layoutScale), terminalY + arrowHalf);
							ctx.closePath();
							ctx.fill();
						}
					}

					if (structure.values.length > maxVisible) {
						ctx.fillStyle = "#6d8297";
						ctx.font = `700 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.fillText(
							`+${structure.values.length - maxVisible}`,
							frameX + frameWidth - Math.round(54 * layoutScale),
							graphicTop + Math.round(24 * layoutScale)
						);
					}
				}

				if (structure.values.length === 0) {
					ctx.fillStyle = "#9eb0bf";
					ctx.font = `700 ${Math.max(11, Math.round(15 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
					ctx.textAlign = "center";
					ctx.fillText(
						t("common.empty"),
						frameX + frameWidth / 2,
						graphicTop + (frameHeight - headerH) / 2 + Math.round(8 * layoutScale)
					);
					ctx.textAlign = "start";
				}

				// End body clip
				ctx.restore();

				drawResizeHandle(frameX, frameY, frameWidth, frameHeight);
			});

			const variableAnchors = new Map<
				string,
				{ leftX: number; rightX: number; midY: number }
			>();

			variables.forEach((variable, variableIndex) => {
				const index = normalizedStructures.length + variableIndex;
				const column = index % columns;
				const row = Math.floor(index / columns);
				const defX = horizontalPadding + column * (cellWidth + gutter);
				const defY = verticalPadding + row * (cellHeight + gutter);
				const pos = getCardPos(`variable:${variable.id}`, defX, defY);
				const sz = getCardSize(`variable:${variable.id}`, cellWidth, cellHeight);
				const frameX = pos.x;
				const frameY = pos.y;
				const frameWidth = sz.w;
				const frameHeight = sz.h;
				newHitboxes.push({ id: `variable:${variable.id}`, x: frameX, y: frameY, w: frameWidth, h: frameHeight, minW: 180, minH: 140 });
				const accent =
					variable.valueKind === "pointer"
						? "#a58ad5"
						: variable.valueKind === "typed-object"
							? "#ecb76f"
							: variable.valueKind === "routine-reference"
								? "#80a8dd"
								: "#7fbd98";

				ctx.fillStyle = "rgba(255,255,255,0.95)";
				drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, Math.round(26 * layoutScale));
				ctx.fill();
				ctx.strokeStyle = accent;
				ctx.lineWidth = 2;
				ctx.stroke();

				ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = accent;
				ctx.fillText(
					t("common.variables").toUpperCase(),
					frameX + Math.round(20 * layoutScale),
					frameY + Math.round(24 * layoutScale)
				);

				ctx.font = `900 ${Math.max(18, Math.round(28 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#355070";
				ctx.fillText(variable.name, frameX + Math.round(18 * layoutScale), frameY + Math.round(58 * layoutScale));

				const typeLabel =
					variable.declaredTypeRef?.kind === "primitive"
						? variable.declaredTypeRef.primitive.toUpperCase()
						: variable.declaredTypeRef?.kind === "structure"
							? variable.declaredTypeRef.structureKind.toUpperCase()
							: variable.declaredTypeRef?.kind === "user"
								? t("blocks.type").toUpperCase()
								: t("blocks.value").toUpperCase();
				ctx.font = `700 ${Math.max(10, Math.round(12 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#6d8297";
				ctx.fillText(typeLabel, frameX + Math.round(20 * layoutScale), frameY + Math.round(78 * layoutScale));

				ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#355070";
				ctx.fillText(`${variable.scope}`, frameX + Math.round(20 * layoutScale), frameY + Math.round(98 * layoutScale));

				ctx.fillStyle = "#edf5ff";
				drawRoundedRect(
					ctx,
					frameX + Math.round(20 * layoutScale),
					frameY + Math.round(108 * layoutScale),
					frameWidth - Math.round(40 * layoutScale),
					Math.max(22, Math.round(28 * layoutScale)),
					Math.max(8, Math.round(12 * layoutScale))
				);
				ctx.fill();
				ctx.fillStyle = "#355070";
				ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillText(
					String(variable.displayValue),
					frameX + Math.round(30 * layoutScale),
					frameY + Math.round(126 * layoutScale)
				);

				if (variable.objectFields && variable.objectFields.length > 0) {
					const maxFields = Math.min(variable.objectFields.length, 3);
					for (let fieldIndex = 0; fieldIndex < maxFields; fieldIndex += 1) {
						const field = variable.objectFields[fieldIndex]!;
						const itemY = frameY + Math.round(144 * layoutScale) + fieldIndex * Math.round(18 * layoutScale);
						ctx.fillStyle = "#f6f9ff";
						drawRoundedRect(
							ctx,
							frameX + Math.round(20 * layoutScale),
							itemY,
							frameWidth - Math.round(40 * layoutScale),
							Math.max(12, Math.round(16 * layoutScale)),
							Math.max(6, Math.round(8 * layoutScale))
						);
						ctx.fill();
						ctx.font = `700 ${Math.max(9, Math.round(11 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
						ctx.fillStyle = "#4f79b6";
						ctx.textAlign = "start";
						ctx.fillText(field.name, frameX + Math.round(28 * layoutScale), itemY + Math.round(12 * layoutScale));
						ctx.textAlign = "right";
						ctx.fillText(
							String(field.displayValue),
							frameX + frameWidth - Math.round(30 * layoutScale),
							itemY + Math.round(12 * layoutScale)
						);
						ctx.textAlign = "start";
					}
				}

				variableAnchors.set(variable.id, {
					leftX: frameX + 6,
					rightX: frameX + frameWidth - 6,
					midY: frameY + frameHeight * 0.5
				});
				drawResizeHandle(frameX, frameY, frameWidth, frameHeight);
			});

			variables.forEach((variable) => {
				if (variable.valueKind !== "pointer" || !variable.referenceTargetId) {
					return;
				}
				const source = variableAnchors.get(variable.id);
				const target = variableAnchors.get(variable.referenceTargetId);
				if (!source || !target) {
					return;
				}
				const startX = source.rightX;
				const endX = target.leftX;
				const startY = source.midY;
				const endY = target.midY;
				const controlOffset = Math.max(26, Math.abs(endX - startX) * 0.32);
				ctx.strokeStyle = "#8c74c8";
				ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
				ctx.beginPath();
				ctx.moveTo(startX, startY);
				ctx.bezierCurveTo(
					startX + controlOffset,
					startY,
					endX - controlOffset,
					endY,
					endX,
					endY
				);
				ctx.stroke();

				const arrowX = endX;
				const arrowY = endY;
				ctx.fillStyle = "#8c74c8";
				ctx.beginPath();
				ctx.moveTo(arrowX, arrowY);
				ctx.lineTo(arrowX - Math.round(8 * layoutScale), arrowY - Math.round(5 * layoutScale));
				ctx.lineTo(arrowX - Math.round(8 * layoutScale), arrowY + Math.round(5 * layoutScale));
				ctx.closePath();
				ctx.fill();
			});

			const heapAnchors = new Map<string, { leftX: number; rightX: number; midY: number }>();

			// heap strip starts below main grid
			const heapStripTop = mainContentHeight;
			const heapPad = PAD;

			if (heapObjects.length > 0) {
				ctx.font = `800 10px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#c07020";
				ctx.fillText("HEAP", heapPad, heapStripTop + 13);
			}

			heapObjects.forEach((obj, heapIndex) => {
				const hCol = heapIndex % heapCols;
				const hRow = Math.floor(heapIndex / heapCols);
				const defX = heapPad + hCol * (HEAP_CARD_W + HEAP_GUTTER);
				const defY = heapStripTop + HEAP_GUTTER + 18 + hRow * (HEAP_CARD_H + HEAP_GUTTER);
				const pos = getCardPos(`heap:${obj.heapId}`, defX, defY);
				const sz = getCardSize(`heap:${obj.heapId}`, HEAP_CARD_W, HEAP_CARD_H);
				const frameX = pos.x;
				const frameY = pos.y;
				const frameWidth = sz.w;
				const frameHeight = sz.h;
				newHitboxes.push({ id: `heap:${obj.heapId}`, x: frameX, y: frameY, w: frameWidth, h: frameHeight, minW: 110, minH: 48 });

				ctx.fillStyle = "rgba(255, 245, 225, 0.97)";
				drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, 8);
				ctx.fill();
				ctx.strokeStyle = "#d4821e";
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// type name
				ctx.font = `800 11px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#7a4010";
				ctx.textAlign = "start";
				ctx.fillText(obj.typeName, frameX + 7, frameY + 14);

				// short id
				ctx.font = `600 9px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
				ctx.fillStyle = "#b08050";
				ctx.textAlign = "right";
				ctx.fillText(`#${obj.heapId.slice(0, 6)}`, frameX + frameWidth - 5, frameY + 14);
				ctx.textAlign = "start";

				// fields — one per line, compact
				const maxFields = Math.min(obj.fields.length, 3);
				for (let fi = 0; fi < maxFields; fi += 1) {
					const field = obj.fields[fi]!;
					const fy = frameY + 24 + fi * 11;
					ctx.font = `700 9px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
					ctx.fillStyle = field.isRef ? "#b06a10" : "#4f6a8a";
					ctx.textAlign = "start";
					ctx.fillText(`${field.name}:`, frameX + 7, fy);
					ctx.textAlign = "right";
					ctx.fillText(
						field.isRef ? `→#${String(field.refHeapId ?? "").slice(0, 6)}` : String(field.displayValue),
						frameX + frameWidth - 5,
						fy
					);
					ctx.textAlign = "start";
				}

				heapAnchors.set(obj.heapId, {
					leftX: frameX,
					rightX: frameX + frameWidth,
					midY: frameY + frameHeight * 0.5
				});
				drawResizeHandle(frameX, frameY, frameWidth, frameHeight);
			});

			const drawArrow = (
				startX: number, startY: number, endX: number, endY: number, color: string
			) => {
				const controlOffset = Math.max(26, Math.abs(endX - startX) * 0.32);
				ctx.strokeStyle = color;
				ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
				ctx.beginPath();
				ctx.moveTo(startX, startY);
				ctx.bezierCurveTo(startX + controlOffset, startY, endX - controlOffset, endY, endX, endY);
				ctx.stroke();
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.moveTo(endX, endY);
				ctx.lineTo(endX - Math.round(8 * layoutScale), endY - Math.round(5 * layoutScale));
				ctx.lineTo(endX - Math.round(8 * layoutScale), endY + Math.round(5 * layoutScale));
				ctx.closePath();
				ctx.fill();
			};

			variables.forEach((variable) => {
				if (variable.valueKind !== "typed-object" || !variable.heapRefId) return;
				const source = variableAnchors.get(variable.id);
				const target = heapAnchors.get(variable.heapRefId);
				if (!source || !target) return;
				drawArrow(source.rightX, source.midY, target.leftX, target.midY, "#e08c3a");
			});

			heapObjects.forEach((obj) => {
				const source = heapAnchors.get(obj.heapId);
				if (!source) return;
				obj.fields.forEach((field) => {
					if (!field.isRef || !field.refHeapId) return;
					const target = heapAnchors.get(field.refHeapId);
					if (!target) return;
					drawArrow(source.rightX, source.midY + Math.round(10 * layoutScale), target.leftX, target.midY - Math.round(10 * layoutScale), "#c07830");
				});
			});

			structureConfigHitboxesRef.current = structureConfigHitboxes;
			cardHitboxesRef.current = newHitboxes;
		};

		redrawRef.current = draw;
		draw();

		const resizeObserver = new ResizeObserver(() => { draw(); });
		resizeObserver.observe(host);

		const handleViewportResize = () => { draw(); };

		// --- pointer events: card drag + pan + config click ---
		const toContent = (clientX: number, clientY: number) => {
			const rect = canvas.getBoundingClientRect();
			const cx = (clientX - rect.left - panRef.current.x) / scaleRef.current;
			const cy = (clientY - rect.top - panRef.current.y) / scaleRef.current;
			return { cx, cy };
		};

		const HANDLE_PX = 12;

		const hitTestCards = (cx: number, cy: number) =>
			cardHitboxesRef.current.find(
				(hb) => cx >= hb.x && cx <= hb.x + hb.w && cy >= hb.y && cy <= hb.y + hb.h
			) ?? null;

		const hitTestResizeHandle = (cx: number, cy: number) =>
			cardHitboxesRef.current.find(
				(hb) =>
					cx >= hb.x + hb.w - HANDLE_PX && cx <= hb.x + hb.w &&
					cy >= hb.y + hb.h - HANDLE_PX && cy <= hb.y + hb.h
			) ?? null;

		const saveLayout = () => {
			const key = layoutStorageKeyRef.current;
			if (!key) return;
			try {
				localStorage.setItem(key, JSON.stringify({
					positions: Object.fromEntries(cardPositionsRef.current),
					sizes: Object.fromEntries(cardSizesRef.current)
				}));
			} catch {
				// storage full or unavailable
			}
		};

		const handlePointerDown = (event: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			const px = event.clientX - rect.left;
			const py = event.clientY - rect.top;
			const { cx, cy } = toContent(event.clientX, event.clientY);

			// config gear click
			if (onStructureConfigClick && showStructureConfigActions) {
				const hitbox = structureConfigHitboxesRef.current.find(
					(item) => cx >= item.x && cx <= item.x + item.width && cy >= item.y && cy <= item.y + item.height
				);
				if (hitbox) {
					event.preventDefault();
					onStructureConfigClick({ structureId: hitbox.id, clientX: event.clientX, clientY: event.clientY });
					return;
				}
			}

			// resize handle check first
			const resizeCard = hitTestResizeHandle(cx, cy);
			if (resizeCard) {
				const sz = cardSizesRef.current.get(resizeCard.id) ?? { w: resizeCard.w, h: resizeCard.h };
				cardResizeRef.current = { id: resizeCard.id, startCx: cx, startCy: cy, startW: sz.w, startH: sz.h, minW: resizeCard.minW, minH: resizeCard.minH };
				canvas.setPointerCapture(event.pointerId);
				canvas.style.cursor = "se-resize";
				event.preventDefault();
				return;
			}

			// card drag
			const card = hitTestCards(cx, cy);
			if (card) {
				const cardPos = cardPositionsRef.current.get(card.id) ?? { x: card.x, y: card.y };
				cardDragRef.current = { id: card.id, startCx: cx, startCy: cy, startCardX: cardPos.x, startCardY: cardPos.y };
				canvas.setPointerCapture(event.pointerId);
				canvas.style.cursor = "grabbing";
				event.preventDefault();
				return;
			}

			// pan
			isPanningRef.current = true;
			panStartRef.current = { px, py, ox: panRef.current.x, oy: panRef.current.y };
			canvas.setPointerCapture(event.pointerId);
			canvas.style.cursor = "grabbing";
			event.preventDefault();
		};

		const handlePointerMove = (event: PointerEvent) => {
			// card resize
			if (cardResizeRef.current) {
				const { cx, cy } = toContent(event.clientX, event.clientY);
				const r = cardResizeRef.current;
				cardSizesRef.current.set(r.id, {
					w: Math.max(r.minW, r.startW + (cx - r.startCx)),
					h: Math.max(r.minH, r.startH + (cy - r.startCy))
				});
				draw();
				return;
			}

			// card drag
			if (cardDragRef.current) {
				const { cx, cy } = toContent(event.clientX, event.clientY);
				const drag = cardDragRef.current;
				cardPositionsRef.current.set(drag.id, {
					x: drag.startCardX + (cx - drag.startCx),
					y: drag.startCardY + (cy - drag.startCy)
				});
				draw();
				return;
			}

			// pan
			if (isPanningRef.current) {
				const rect = canvas.getBoundingClientRect();
				const px = event.clientX - rect.left;
				const py = event.clientY - rect.top;
				panRef.current = {
					x: panStartRef.current.ox + (px - panStartRef.current.px),
					y: panStartRef.current.oy + (py - panStartRef.current.py)
				};
				draw();
				return;
			}

			// cursor hint
			const { cx, cy } = toContent(event.clientX, event.clientY);
			const hoveredCard = hitTestCards(cx, cy);
			canvas.title = hoveredCard?.tooltip ?? "";
			const overHandle = hitTestResizeHandle(cx, cy);
			if (overHandle) {
				canvas.style.cursor = "se-resize";
			} else {
				if (hoveredCard) {
					canvas.style.cursor = "grab";
				} else if (showStructureConfigActions) {
					const hit = structureConfigHitboxesRef.current.some(
						(item) => cx >= item.x && cx <= item.x + item.width && cy >= item.y && cy <= item.y + item.height
					);
					canvas.style.cursor = hit ? "pointer" : "default";
				} else {
					canvas.style.cursor = "default";
				}
			}
		};

		const handlePointerUp = (event: PointerEvent) => {
			if (cardResizeRef.current) {
				cardResizeRef.current = null;
				saveLayout();
				canvas.releasePointerCapture(event.pointerId);
				canvas.style.cursor = "default";
				return;
			}
			if (cardDragRef.current) {
				cardDragRef.current = null;
				saveLayout();
				canvas.releasePointerCapture(event.pointerId);
				canvas.style.cursor = "default";
				return;
			}
			if (isPanningRef.current) {
				isPanningRef.current = false;
				canvas.releasePointerCapture(event.pointerId);
				canvas.style.cursor = "default";
			}
		};

		const handlePointerLeave = () => {
			canvas.title = "";
		};

		// --- wheel: zoom centered on cursor ---
		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const cx = event.clientX - rect.left;
			const cy = event.clientY - rect.top;
			const delta = event.deltaY > 0 ? 0.9 : 1 / 0.9;
			const nextScale = Math.max(0.2, Math.min(4, scaleRef.current * delta));
			const ratio = nextScale / scaleRef.current;
			panRef.current = {
				x: cx - ratio * (cx - panRef.current.x),
				y: cy - ratio * (cy - panRef.current.y)
			};
			scaleRef.current = nextScale;
			draw();
		};

		window.addEventListener("resize", handleViewportResize);
		window.visualViewport?.addEventListener("resize", handleViewportResize);
		canvas.addEventListener("pointerdown", handlePointerDown);
		canvas.addEventListener("pointermove", handlePointerMove);
		canvas.addEventListener("pointerup", handlePointerUp);
		canvas.addEventListener("pointerleave", handlePointerLeave);
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		canvas.style.cursor = "grab";

		if (!hasAutoFittedRef.current) {
			fitToView();
			hasAutoFittedRef.current = true;
		}

		let animationFrame = 0;
		if (shouldAnimateListPointers) {
			const tick = () => {
				draw();
				animationFrame = window.requestAnimationFrame(tick);
			};
			animationFrame = window.requestAnimationFrame(tick);
		} else {
			animationFrame = window.requestAnimationFrame(draw);
		}

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", handleViewportResize);
			window.visualViewport?.removeEventListener("resize", handleViewportResize);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointermove", handlePointerMove);
			canvas.removeEventListener("pointerup", handlePointerUp);
			canvas.removeEventListener("pointerleave", handlePointerLeave);
			canvas.removeEventListener("wheel", handleWheel);
			canvas.style.cursor = "default";
			window.cancelAnimationFrame(animationFrame);
		};
	}, [onStructureConfigClick, showStructureConfigActions, structures, variables, heapObjects, events, isPreview]);

	return (
		<section style={boardWrapperStyle}>
			<div ref={hostRef} style={{ ...boardCanvasFrameStyle, position: "relative" }}>
				<canvas ref={canvasRef} />
				<button
					type="button"
					onClick={fitToView}
					title="Fit to view"
					style={{
						position: "absolute",
						bottom: 10,
						left: 10,
						border: "2px solid #b8d4ee",
						borderRadius: 10,
						background: "rgba(255,255,255,0.88)",
						color: "#355070",
						fontWeight: 800,
						fontSize: 12,
						padding: "4px 10px",
						cursor: "pointer",
						backdropFilter: "blur(4px)"
					}}
				>
					⊡ fit
				</button>
			</div>
		</section>
	);
}

export interface EventLogProps {
	events: EngineEvent[];
}

const prettifyEventType = (type: EngineEvent["type"]): string =>
	type.split("_").join(" ");

export function EventLog({ events }: EventLogProps) {
	return (
		<section
			style={{
				...cardStyle,
				marginTop: "1.5rem",
				background: "#eaf3ff"
			}}
		>
			<div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#355070" }}>
				{t("board.executionFeed")}
			</div>
			<div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
				{events.length === 0 ? (
					<span style={{ color: "#6f86a6", fontWeight: 700 }}>
						{t("board.runHint")}
					</span>
				) : null}

				{events.map((event) => (
					<div
						key={`${event.stepId}-${event.type}-${event.structureId}`}
						style={{
							padding: "0.9rem 1rem",
							borderRadius: "18px",
							background: "#ffffff",
							border: "3px solid #d6e4fb",
							color: "#45607d",
							fontWeight: 700
						}}
					>
						{prettifyEventType(event.type)} in {event.structureId}
						{event.value !== undefined ? ` • item ${event.value}` : ""}
					</div>
				))}
			</div>
		</section>
	);
}

export type PanelId = PlayerPanelId | EditorPanelId;
export type LayoutMode = "player" | "editor";

const screenStyle: CSSProperties = {
	width: "100%",
	height: "100dvh",
	minHeight: 0,
	padding: "1rem",
	overflow: "hidden"
};

export interface ScreenProps {
	children: ReactNode;
	mode: LayoutMode;
}

export function Screen({ children, mode }: ScreenProps) {
	return (
		<main
			style={{
				...screenStyle,
				background: mode === "player" ? "#eef6ff" : "#f4f7fb"
			}}
		>
			{children}
		</main>
	);
}

export interface PanelProps {
	children: ReactNode;
	title?: string;
	accent?: string;
}

export function Panel({ children, title, accent = "#ffffff" }: PanelProps) {
	return (
		<section
			style={{
				border: "2px solid #cfe3f5",
				borderRadius: "24px",
				background: accent,
				padding: "1rem"
			}}
		>
			{title ? (
				<div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#55748b", marginBottom: "0.8rem" }}>
					{title}
				</div>
			) : null}
			{children}
		</section>
	);
}

export interface WorkspaceProps {
	children: ReactNode;
	columns?: string;
}

export function Workspace({ children, columns = "1fr" }: WorkspaceProps) {
	return (
		<section
			style={{
				display: "grid",
				gap: "1rem",
				gridTemplateColumns: columns
			}}
		>
			{children}
		</section>
	);
}

export interface SplitPaneProps {
	primary: ReactNode;
	secondary: ReactNode;
	asideWidth?: string;
}

export function SplitPane({
	primary,
	secondary,
	asideWidth = "320px"
}: SplitPaneProps) {
	return (
		<div
			style={{
				display: "grid",
				gap: "1rem",
				gridTemplateColumns: `minmax(0, 1fr) minmax(260px, ${asideWidth})`
			}}
		>
			{primary}
			{secondary}
		</div>
	);
}

export interface TabBarItem<T extends string> {
	id: T;
	label: string;
}

export interface TabBarProps<T extends string> {
	items: TabBarItem<T>[];
	activeId: T;
	onSelect: (id: T) => void;
}

export function TabBar<T extends string>({
	items,
	activeId,
	onSelect
}: TabBarProps<T>) {
	return (
		<nav
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
				gap: "0.75rem"
			}}
		>
			{items.map((item) => (
				<button
					key={item.id}
					type="button"
					onClick={() => onSelect(item.id)}
					style={{
						border: "2px solid #cfe3f5",
						borderRadius: "18px",
						padding: "0.95rem 1rem",
						background: item.id === activeId ? "#ffd36e" : "#ffffff",
						color: "#355070",
						fontWeight: 900,
						minHeight: "3.5rem"
					}}
				>
					{item.label}
				</button>
			))}
		</nav>
	);
}

export interface CollapsiblePanelProps {
	title: string;
	isOpen: boolean;
	onToggle: () => void;
	children: ReactNode;
}

export function CollapsiblePanel({
	title,
	isOpen,
	onToggle,
	children
}: CollapsiblePanelProps) {
	return (
		<section
			style={{
				border: "2px solid #cfe3f5",
				borderRadius: "22px",
				background: "#ffffff",
				overflow: "hidden"
			}}
		>
			<button
				type="button"
				onClick={onToggle}
				style={{
					width: "100%",
					border: 0,
					borderBottom: isOpen ? "2px solid #e5eff8" : "0",
					borderRadius: 0,
					background: "#f8fbff",
					padding: "1rem",
					textAlign: "left",
					fontWeight: 900,
					color: "#355070"
				}}
			>
				{title}
			</button>
			{isOpen ? <div style={{ padding: "1rem" }}>{children}</div> : null}
		</section>
	);
}

export interface LargeActionButtonProps {
	label: string;
	onClick?: () => void;
	tone?: "primary" | "secondary";
}

export function LargeActionButton({
	label,
	onClick,
	tone = "primary"
}: LargeActionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				border: "2px solid #cfe3f5",
				borderRadius: "20px",
				padding: "1rem 1.1rem",
				background: tone === "primary" ? "#ffd36e" : "#ffffff",
				color: "#355070",
				fontWeight: 900,
				minHeight: "4rem"
			}}
		>
			{label}
		</button>
	);
}

export interface BlockTileProps {
	label: string;
	tone?: string;
}

export function BlockTile({ label, tone = "#a8dcff" }: BlockTileProps) {
	return (
		<div
			style={{
				border: "2px solid #ffffff",
				borderRadius: "18px",
				background: tone,
				padding: "0.95rem 1rem",
				fontWeight: 800,
				color: "#355070"
			}}
		>
			{label}
		</div>
	);
}

export interface StepControlsProps {
	onStep: () => void;
	onRun: () => void;
	onReset: () => void;
}

export function StepControls({ onStep, onRun, onReset }: StepControlsProps) {
	return (
		<div style={{ display: "grid", gap: "0.75rem" }}>
			<LargeActionButton label="Step" onClick={onStep} />
			<LargeActionButton label="Run" onClick={onRun} tone="secondary" />
			<LargeActionButton label="Reset" onClick={onReset} tone="secondary" />
		</div>
	);
}

export interface PuzzleBoardProps {
	structures: StructureSnapshot[];
	handValue?: string | number | null;
	variables?: BoardVariableSnapshot[];
	heapObjects?: BoardHeapObjectSnapshot[];
	events?: EngineEvent[];
	showStructureConfigActions?: boolean;
	onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
	stepDurationMs?: number;
	isPreview?: boolean;
}

export function PuzzleBoard({
	structures,
	variables,
	heapObjects,
	events,
	showStructureConfigActions,
	onStructureConfigClick,
	stepDurationMs,
	isPreview
}: PuzzleBoardProps) {
	return (
		<StructuresBoard
			structures={structures}
			variables={variables}
			heapObjects={heapObjects}
			events={events}
			showStructureConfigActions={showStructureConfigActions}
			onStructureConfigClick={onStructureConfigClick}
			stepDurationMs={stepDurationMs}
			isPreview={isPreview}
		/>
	);
}

export interface ExecutionTimelineProps {
	events: EngineEvent[];
}

export function ExecutionTimeline({ events }: ExecutionTimelineProps) {
	return <EventLog events={events} />;
}

export function StructurePalette() {
	return (
		<div style={{ display: "grid", gap: "0.75rem" }}>
			<BlockTile label="Stack" tone="#ffd36e" />
			<BlockTile label="Queue" tone="#a8dcff" />
			<BlockTile label="List" tone="#d7c3ff" />
			<BlockTile label="Transfer Block" tone="#dff4e7" />
		</div>
	);
}

export function LevelEditorCanvas() {
	return (
		<Panel title="Canvas" accent="#fffdf8">
			<div
				style={{
					minHeight: "320px",
					border: "2px dashed #d9e6f2",
					borderRadius: "20px",
					display: "grid",
					placeItems: "center",
					color: "#6c8aa3",
					fontWeight: 700
				}}
			>
				Level editor canvas stub
			</div>
		</Panel>
	);
}

export function InspectorPanel() {
	return (
		<div style={{ display: "grid", gap: "0.75rem" }}>
			<BlockTile label="Selected Level: Intro Transfer" tone="#ffffff" />
			<BlockTile label="Goal: Move top item from A to B" tone="#ffffff" />
			<BlockTile label="Max Steps: 2" tone="#ffffff" />
		</div>
	);
}
