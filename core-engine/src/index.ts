export type StructureId = string;
export type StructureKind = "stack" | "queue" | "list" | "doubly-linked-list" | "circular-list";
export type DataValue = string | number | boolean;
export type InsertOperationType = "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND" | "INSERT_AT";
export type ExtractOperationType = "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST" | "REMOVE_AT";
export type ReadOperationType = "PEEK" | "SIZE" | "IS_EMPTY" | "GET_HEAD" | "GET_TAIL" | "GET_AT" | "CONTAINS" | "FIND";
export type MutateOperationType = "REVERSE" | "CLEAR";

export interface NodeVisualProperties {
  color?: string;
  autoTaint?: boolean;
}

export interface StructureVisualProperties {
  color?: string;
  nodeAutoTaint?: boolean;
}

export interface DataNode {
  value: DataValue;
  color?: string;
  autoTaint?: boolean;
}

export type DataNodeInput = DataValue | DataNode;

export interface StructureSnapshot {
  id: StructureId;
  kind: StructureKind;
  values: DataNodeInput[];
  properties?: StructureVisualProperties;
}

export interface DataStructure {
  readonly id: StructureId;
  readonly kind: StructureKind;
  readonly properties: StructureVisualProperties;
  readState(): StructureSnapshot;
  insert(value: DataNodeInput, operationType: InsertOperationType, arg?: number): DataStructure;
  extract(operationType: ExtractOperationType, arg?: number): { structure: DataStructure; value: DataNode };
  query(operationType: ReadOperationType, arg?: DataValue): DataValue;
  mutate(operationType: MutateOperationType): DataStructure;
  serialize(): StructureSnapshot;
}

export const isDataNode = (value: DataNodeInput): value is DataNode =>
  typeof value === "object" && value !== null && "value" in value;

export const normalizeDataNode = (
  value: DataNodeInput,
  properties?: StructureVisualProperties,
  mode: "create" | "insert" = "create"
): DataNode => {
  if (!isDataNode(value)) {
    return {
      value,
      color: properties?.color,
      autoTaint: properties?.nodeAutoTaint ?? false
    };
  }

  const nextAutoTaint = value.autoTaint ?? properties?.nodeAutoTaint ?? false;
  const nextColor =
    mode === "insert" && nextAutoTaint
      ? properties?.color
      : value.color ?? properties?.color;

  return {
    value: value.value,
    color: nextColor,
    autoTaint: nextAutoTaint
  };
};

export const normalizeStructureSnapshot = (
  snapshot: StructureSnapshot
): StructureSnapshot => ({
  ...snapshot,
  properties: {
    color: snapshot.properties?.color,
    nodeAutoTaint: snapshot.properties?.nodeAutoTaint ?? false
  },
  values: snapshot.values.map((value) =>
    normalizeDataNode(value, snapshot.properties, "create")
  )
});

abstract class BaseStructure implements DataStructure {
  public readonly id: StructureId;
  public abstract readonly kind: StructureKind;
  public readonly properties: StructureVisualProperties;
  protected readonly values: DataNode[];

  protected constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    this.id = id;
    this.properties = {
      color: properties.color,
      nodeAutoTaint: properties.nodeAutoTaint ?? false
    };
    this.values = values.map((value) =>
      normalizeDataNode(value, this.properties, "create")
    );
  }

  public readState(): StructureSnapshot {
    return this.serialize();
  }

  public serialize(): StructureSnapshot {
    return {
      id: this.id,
      kind: this.kind,
      values: this.values.map((value) => ({ ...value })),
      properties: { ...this.properties }
    };
  }

  protected prepareInsertedValue(value: DataNodeInput): DataNode {
    return normalizeDataNode(value, this.properties, "insert");
  }

  public query(operationType: ReadOperationType, _arg?: DataValue): DataValue {
    throw new Error(`Structure "${this.id}" (${this.kind}) does not support query "${operationType}".`);
  }

  public mutate(operationType: MutateOperationType): DataStructure {
    throw new Error(`Structure "${this.id}" (${this.kind}) does not support mutate "${operationType}".`);
  }

  public abstract insert(value: DataNodeInput, operationType: InsertOperationType, arg?: number): DataStructure;
  public abstract extract(operationType: ExtractOperationType, arg?: number): { structure: DataStructure; value: DataNode };
}

export class StackStructure extends BaseStructure {
  public readonly kind = "stack" as const;

  public constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    super(id, values, properties);
  }

  public insert(value: DataNodeInput, operationType: InsertOperationType, _arg?: number): StackStructure {
    if (operationType !== "PUSH") {
      throw new Error(`Stack "${this.id}" only supports PUSH for insertion.`);
    }
    return new StackStructure(this.id, [...this.values, this.prepareInsertedValue(value)], this.properties);
  }

  public extract(operationType: ExtractOperationType, _arg?: number): { structure: StackStructure; value: DataNode } {
    if (operationType !== "POP") {
      throw new Error(`Stack "${this.id}" only supports POP for extraction.`);
    }
    if (this.values.length === 0) throw new Error(`Stack "${this.id}" is empty.`);
    return {
      structure: new StackStructure(this.id, this.values.slice(0, -1), this.properties),
      value: { ...this.values[this.values.length - 1] }
    };
  }

  public override query(operationType: ReadOperationType, _arg?: DataValue): DataValue {
    switch (operationType) {
      case "PEEK":
        if (this.values.length === 0) throw new Error(`Stack "${this.id}" is empty.`);
        return this.values[this.values.length - 1].value;
      case "SIZE": return this.values.length;
      case "IS_EMPTY": return this.values.length === 0;
      default: throw new Error(`Stack "${this.id}" does not support query "${operationType}".`);
    }
  }

  public override mutate(operationType: MutateOperationType): StackStructure {
    if (operationType === "CLEAR") return new StackStructure(this.id, [], this.properties);
    throw new Error(`Stack "${this.id}" does not support mutate "${operationType}".`);
  }
}

export class QueueStructure extends BaseStructure {
  public readonly kind = "queue" as const;

  public constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    super(id, values, properties);
  }

  public insert(value: DataNodeInput, operationType: InsertOperationType, _arg?: number): QueueStructure {
    if (operationType !== "ENQUEUE") throw new Error(`Queue "${this.id}" only supports ENQUEUE for insertion.`);
    return new QueueStructure(this.id, [...this.values, this.prepareInsertedValue(value)], this.properties);
  }

  public extract(operationType: ExtractOperationType, _arg?: number): { structure: QueueStructure; value: DataNode } {
    if (operationType !== "DEQUEUE") throw new Error(`Queue "${this.id}" only supports DEQUEUE for extraction.`);
    if (this.values.length === 0) throw new Error(`Queue "${this.id}" is empty.`);
    return {
      structure: new QueueStructure(this.id, this.values.slice(1), this.properties),
      value: { ...this.values[0] }
    };
  }

  public override query(operationType: ReadOperationType, _arg?: DataValue): DataValue {
    switch (operationType) {
      case "PEEK":
        if (this.values.length === 0) throw new Error(`Queue "${this.id}" is empty.`);
        return this.values[0].value;
      case "SIZE": return this.values.length;
      case "IS_EMPTY": return this.values.length === 0;
      default: throw new Error(`Queue "${this.id}" does not support query "${operationType}".`);
    }
  }

  public override mutate(operationType: MutateOperationType): QueueStructure {
    if (operationType === "CLEAR") return new QueueStructure(this.id, [], this.properties);
    throw new Error(`Queue "${this.id}" does not support mutate "${operationType}".`);
  }
}

export class ListStructure extends BaseStructure {
  public readonly kind = "list" as const;

  public constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    super(id, values, properties);
  }

  public insert(value: DataNodeInput, operationType: InsertOperationType, arg?: number): ListStructure {
    const inserted = this.prepareInsertedValue(value);
    if (operationType === "INSERT_AT") {
      const i = arg ?? 0;
      if (i < 0 || i > this.values.length) throw new Error(`Index ${i} out of bounds for INSERT_AT in list "${this.id}".`);
      const next = [...this.values.slice(0, i), inserted, ...this.values.slice(i)];
      return new ListStructure(this.id, next, this.properties);
    }
    const nextValues = operationType === "PREPEND" ? [inserted, ...this.values] : [...this.values, inserted];
    return new ListStructure(this.id, nextValues, this.properties);
  }

  public extract(operationType: ExtractOperationType, arg?: number): { structure: ListStructure; value: DataNode } {
    if (this.values.length === 0) throw new Error(`List "${this.id}" is empty.`);
    if (operationType === "REMOVE_LAST") {
      return { structure: new ListStructure(this.id, this.values.slice(0, -1), this.properties), value: { ...this.values[this.values.length - 1] } };
    }
    if (operationType === "REMOVE_AT") {
      const i = arg ?? 0;
      if (i < 0 || i >= this.values.length) throw new Error(`Index ${i} out of bounds for REMOVE_AT in list "${this.id}".`);
      const next = [...this.values.slice(0, i), ...this.values.slice(i + 1)];
      return { structure: new ListStructure(this.id, next, this.properties), value: { ...this.values[i]! } };
    }
    return { structure: new ListStructure(this.id, this.values.slice(1), this.properties), value: { ...this.values[0]! } };
  }

  public override query(operationType: ReadOperationType, arg?: DataValue): DataValue {
    switch (operationType) {
      case "PEEK":
      case "GET_HEAD":
        if (this.values.length === 0) throw new Error(`List "${this.id}" is empty.`);
        return this.values[0]!.value;
      case "GET_TAIL":
        if (this.values.length === 0) throw new Error(`List "${this.id}" is empty.`);
        return this.values[this.values.length - 1]!.value;
      case "SIZE": return this.values.length;
      case "IS_EMPTY": return this.values.length === 0;
      case "GET_AT": {
        const i = Number(arg);
        if (i < 0 || i >= this.values.length) throw new Error(`Index ${i} out of bounds in list "${this.id}".`);
        return this.values[i]!.value;
      }
      case "CONTAINS": return this.values.some((n) => n.value === arg);
      case "FIND": {
        const idx = this.values.findIndex((n) => n.value === arg);
        return idx;
      }
      default: throw new Error(`List "${this.id}" does not support query "${operationType}".`);
    }
  }

  public override mutate(operationType: MutateOperationType): ListStructure {
    if (operationType === "REVERSE") return new ListStructure(this.id, [...this.values].reverse(), this.properties);
    if (operationType === "CLEAR") return new ListStructure(this.id, [], this.properties);
    throw new Error(`List "${this.id}" does not support mutate "${operationType}".`);
  }
}

export class DoublyLinkedListStructure extends BaseStructure {
  public readonly kind = "doubly-linked-list" as const;

  public constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    super(id, values, properties);
  }

  public insert(value: DataNodeInput, operationType: InsertOperationType, arg?: number): DoublyLinkedListStructure {
    const inserted = this.prepareInsertedValue(value);
    if (operationType === "INSERT_AT") {
      const i = arg ?? 0;
      if (i < 0 || i > this.values.length) throw new Error(`Index ${i} out of bounds for INSERT_AT in doubly-linked-list "${this.id}".`);
      return new DoublyLinkedListStructure(this.id, [...this.values.slice(0, i), inserted, ...this.values.slice(i)], this.properties);
    }
    const nextValues = operationType === "PREPEND" ? [inserted, ...this.values] : [...this.values, inserted];
    return new DoublyLinkedListStructure(this.id, nextValues, this.properties);
  }

  public extract(operationType: ExtractOperationType, arg?: number): { structure: DoublyLinkedListStructure; value: DataNode } {
    if (this.values.length === 0) throw new Error(`DoublyLinkedList "${this.id}" is empty.`);
    if (operationType === "REMOVE_LAST") {
      return { structure: new DoublyLinkedListStructure(this.id, this.values.slice(0, -1), this.properties), value: { ...this.values[this.values.length - 1]! } };
    }
    if (operationType === "REMOVE_AT") {
      const i = arg ?? 0;
      if (i < 0 || i >= this.values.length) throw new Error(`Index ${i} out of bounds for REMOVE_AT in doubly-linked-list "${this.id}".`);
      return { structure: new DoublyLinkedListStructure(this.id, [...this.values.slice(0, i), ...this.values.slice(i + 1)], this.properties), value: { ...this.values[i]! } };
    }
    return { structure: new DoublyLinkedListStructure(this.id, this.values.slice(1), this.properties), value: { ...this.values[0]! } };
  }

  public override query(operationType: ReadOperationType, arg?: DataValue): DataValue {
    switch (operationType) {
      case "PEEK":
      case "GET_HEAD":
        if (this.values.length === 0) throw new Error(`DoublyLinkedList "${this.id}" is empty.`);
        return this.values[0]!.value;
      case "GET_TAIL":
        if (this.values.length === 0) throw new Error(`DoublyLinkedList "${this.id}" is empty.`);
        return this.values[this.values.length - 1]!.value;
      case "SIZE": return this.values.length;
      case "IS_EMPTY": return this.values.length === 0;
      case "GET_AT": {
        const i = Number(arg);
        if (i < 0 || i >= this.values.length) throw new Error(`Index ${i} out of bounds in doubly-linked-list "${this.id}".`);
        return this.values[i]!.value;
      }
      case "CONTAINS": return this.values.some((n) => n.value === arg);
      case "FIND": return this.values.findIndex((n) => n.value === arg);
      default: throw new Error(`DoublyLinkedList "${this.id}" does not support query "${operationType}".`);
    }
  }

  public override mutate(operationType: MutateOperationType): DoublyLinkedListStructure {
    if (operationType === "REVERSE") return new DoublyLinkedListStructure(this.id, [...this.values].reverse(), this.properties);
    if (operationType === "CLEAR") return new DoublyLinkedListStructure(this.id, [], this.properties);
    throw new Error(`DoublyLinkedList "${this.id}" does not support mutate "${operationType}".`);
  }
}

export class CircularListStructure extends BaseStructure {
  public readonly kind = "circular-list" as const;

  public constructor(
    id: StructureId,
    values: DataNodeInput[],
    properties: StructureVisualProperties = {}
  ) {
    super(id, values, properties);
  }

  public insert(value: DataNodeInput, operationType: InsertOperationType, arg?: number): CircularListStructure {
    const inserted = this.prepareInsertedValue(value);
    if (operationType === "INSERT_AT") {
      const i = arg ?? 0;
      const safeI = this.values.length === 0 ? 0 : ((i % (this.values.length + 1)) + (this.values.length + 1)) % (this.values.length + 1);
      return new CircularListStructure(this.id, [...this.values.slice(0, safeI), inserted, ...this.values.slice(safeI)], this.properties);
    }
    const nextValues = operationType === "PREPEND" ? [inserted, ...this.values] : [...this.values, inserted];
    return new CircularListStructure(this.id, nextValues, this.properties);
  }

  public extract(operationType: ExtractOperationType, arg?: number): { structure: CircularListStructure; value: DataNode } {
    if (this.values.length === 0) throw new Error(`CircularList "${this.id}" is empty.`);
    if (operationType === "REMOVE_LAST") {
      return { structure: new CircularListStructure(this.id, this.values.slice(0, -1), this.properties), value: { ...this.values[this.values.length - 1]! } };
    }
    if (operationType === "REMOVE_AT") {
      const i = ((( arg ?? 0) % this.values.length) + this.values.length) % this.values.length;
      return { structure: new CircularListStructure(this.id, [...this.values.slice(0, i), ...this.values.slice(i + 1)], this.properties), value: { ...this.values[i]! } };
    }
    return { structure: new CircularListStructure(this.id, this.values.slice(1), this.properties), value: { ...this.values[0]! } };
  }

  public override query(operationType: ReadOperationType, arg?: DataValue): DataValue {
    switch (operationType) {
      case "PEEK":
      case "GET_HEAD":
        if (this.values.length === 0) throw new Error(`CircularList "${this.id}" is empty.`);
        return this.values[0]!.value;
      case "GET_TAIL":
        if (this.values.length === 0) throw new Error(`CircularList "${this.id}" is empty.`);
        return this.values[this.values.length - 1]!.value;
      case "SIZE": return this.values.length;
      case "IS_EMPTY": return this.values.length === 0;
      case "GET_AT": {
        if (this.values.length === 0) throw new Error(`CircularList "${this.id}" is empty.`);
        const raw = Number(arg);
        const i = ((raw % this.values.length) + this.values.length) % this.values.length;
        return this.values[i]!.value;
      }
      case "CONTAINS": return this.values.some((n) => n.value === arg);
      case "FIND": return this.values.findIndex((n) => n.value === arg);
      default: throw new Error(`CircularList "${this.id}" does not support query "${operationType}".`);
    }
  }

  public override mutate(operationType: MutateOperationType): CircularListStructure {
    if (operationType === "REVERSE") return new CircularListStructure(this.id, [...this.values].reverse(), this.properties);
    if (operationType === "CLEAR") return new CircularListStructure(this.id, [], this.properties);
    throw new Error(`CircularList "${this.id}" does not support mutate "${operationType}".`);
  }
}

export interface EngineState {
  structures: Record<StructureId, StructureSnapshot>;
  handValue: DataNode | null;
}

export type OperationDefinition =
  | { type: "PUSH"; targetId: StructureId; value?: DataNodeInput }
  | { type: "POP"; sourceId: StructureId }
  | { type: "ENQUEUE"; targetId: StructureId; value?: DataNodeInput }
  | { type: "DEQUEUE"; sourceId: StructureId }
  | { type: "APPEND"; targetId: StructureId; value?: DataNodeInput }
  | { type: "PREPEND"; targetId: StructureId; value?: DataNodeInput }
  | { type: "INSERT_AT"; targetId: StructureId; value?: DataNodeInput; arg: number }
  | { type: "REMOVE_FIRST"; sourceId: StructureId }
  | { type: "REMOVE_LAST"; sourceId: StructureId }
  | { type: "REMOVE_AT"; sourceId: StructureId; arg: number }
  | { type: "GET_HEAD"; sourceId: StructureId }
  | { type: "GET_TAIL"; sourceId: StructureId }
  | { type: "PEEK"; sourceId: StructureId }
  | { type: "SIZE"; sourceId: StructureId }
  | { type: "IS_EMPTY"; sourceId: StructureId }
  | { type: "GET_AT"; sourceId: StructureId; arg: number }
  | { type: "CONTAINS"; sourceId: StructureId; arg: DataValue }
  | { type: "FIND"; sourceId: StructureId; arg: DataValue }
  | { type: "REVERSE"; sourceId: StructureId }
  | { type: "CLEAR"; sourceId: StructureId }
  | { type: "TRANSFER"; sourceId: StructureId; targetId: StructureId };

const INSERT_OPS = new Set<OperationDefinition["type"]>(["PUSH", "ENQUEUE", "APPEND", "PREPEND", "INSERT_AT"]);
const EXTRACT_OPS = new Set<OperationDefinition["type"]>(["POP", "DEQUEUE", "REMOVE_FIRST", "REMOVE_LAST", "REMOVE_AT"]);
const READ_OPS = new Set<OperationDefinition["type"]>(["GET_HEAD", "GET_TAIL", "PEEK", "SIZE", "IS_EMPTY", "GET_AT", "CONTAINS", "FIND"]);
const MUTATE_OPS = new Set<OperationDefinition["type"]>(["REVERSE", "CLEAR"]);

export interface ProgramDefinition {
  operations: OperationDefinition[];
}

export type EngineEventType =
  | "VALUE_EXTRACTED"
  | "VALUE_READ"
  | "VALUE_INSERTED"
  | "STRUCTURE_UPDATED";

export interface EngineEvent {
  type: EngineEventType;
  stepId: string;
  structureId: StructureId;
  value?: DataValue;
  snapshot: StructureSnapshot;
}

export interface ExecutionStep {
  id: string;
  action: "EXTRACT" | "INSERT" | "READ" | "MUTATE";
  operationType: OperationDefinition["type"];
  value: DataValue;
  affectedStructures: StructureId[];
  events: EngineEvent[];
  state: EngineState;
}

type CompiledStep =
  | { id: string; action: "EXTRACT"; operationType: OperationDefinition["type"]; sourceId: StructureId; arg?: number }
  | { id: string; action: "INSERT"; operationType: OperationDefinition["type"]; targetId: StructureId; value?: DataNodeInput; arg?: number }
  | { id: string; action: "READ"; operationType: OperationDefinition["type"]; sourceId: StructureId; arg?: DataValue }
  | { id: string; action: "MUTATE"; operationType: OperationDefinition["type"]; sourceId: StructureId };

type EngineListener = (event: EngineEvent) => void;

export interface EngineConfig {
  structures: StructureSnapshot[];
}

type StructureFactory = (id: StructureId, values: DataNodeInput[], props: StructureVisualProperties) => DataStructure;

const structureFactories: Record<StructureKind, StructureFactory> = {
  stack: (id, values, props) => new StackStructure(id, values, props),
  queue: (id, values, props) => new QueueStructure(id, values, props),
  list: (id, values, props) => new ListStructure(id, values, props),
  "doubly-linked-list": (id, values, props) => new DoublyLinkedListStructure(id, values, props),
  "circular-list": (id, values, props) => new CircularListStructure(id, values, props),
};

const createStructure = (snapshot: StructureSnapshot): DataStructure => {
  const normalized = normalizeStructureSnapshot(snapshot);
  const factory = structureFactories[normalized.kind];
  if (!factory) throw new Error(`Unknown structure kind "${normalized.kind}".`);
  return factory(normalized.id, normalized.values, normalized.properties ?? {});
};

const createState = (
  structures: Record<StructureId, DataStructure>,
  handValue: DataNode | null
): EngineState => ({
  structures: Object.fromEntries(
    Object.entries(structures).map(([id, structure]) => [id, structure.serialize()])
  ),
  handValue: handValue ? { ...handValue } : null
});

export class VisualExecutionEngine {
  private readonly initialStructures: Record<StructureId, DataStructure>;
  private structures: Record<StructureId, DataStructure>;
  private listeners = new Set<EngineListener>();
  private program: ProgramDefinition = { operations: [] };
  private steps: CompiledStep[] = [];
  private stepIndex = 0;
  private handValue: DataNode | null = null;

  constructor(config: EngineConfig) {
    this.initialStructures = Object.fromEntries(
      config.structures.map((structure) => [structure.id, createStructure(structure)])
    );
    this.structures = { ...this.initialStructures };
  }

  public loadProgram(program: ProgramDefinition): void {
    this.program = program;
    this.steps = this.compile(program);
    this.stepIndex = 0;
    this.handValue = null;
    this.structures = { ...this.initialStructures };
  }

  public getState(): EngineState {
    return createState(this.structures, this.handValue);
  }

  public step(): ExecutionStep | null {
    const next = this.steps[this.stepIndex];
    if (!next) {
      return null;
    }

    const executedStep = this.executeCompiledStep(next);
    this.stepIndex += 1;
    return executedStep;
  }

  public executeOperation(operation: OperationDefinition): ExecutionStep[] {
    const executed: ExecutionStep[] = [];
    const compiledSteps = this.compile({ operations: [operation] });
    compiledSteps.forEach((step) => {
      const executedStep = this.executeCompiledStep(step);
      executed.push(executedStep);
    });
    return executed;
  }

  public run(): ExecutionStep[] {
    const executed: ExecutionStep[] = [];
    while (true) {
      const executedStep = this.step();
      if (!executedStep) {
        break;
      }
      executed.push(executedStep);
    }
    return executed;
  }

  public reset(): void {
    this.structures = { ...this.initialStructures };
    this.stepIndex = 0;
    this.handValue = null;
  }

  public subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private executeCompiledStep(next: CompiledStep): ExecutionStep {
    const events: EngineEvent[] = [];

    if (next.action === "EXTRACT") {
      const source = this.getStructure(next.sourceId);
      const extractOp: ExtractOperationType =
        next.operationType === "TRANSFER"
          ? source.kind === "stack" ? "POP" : source.kind === "queue" ? "DEQUEUE" : "REMOVE_FIRST"
          : (next.operationType as ExtractOperationType);
      const result = source.extract(extractOp, next.arg);
      this.structures[next.sourceId] = result.structure;
      this.handValue = result.value;
      events.push(
        this.createEvent("VALUE_EXTRACTED", next.id, next.sourceId, result.value.value),
        this.createEvent("STRUCTURE_UPDATED", next.id, next.sourceId)
      );
    } else if (next.action === "READ") {
      const source = this.getStructure(next.sourceId);
      const readValue = source.query(next.operationType as ReadOperationType, next.arg);
      this.handValue = normalizeDataNode(readValue, source.properties, "insert");
      events.push(this.createEvent("VALUE_READ", next.id, next.sourceId, readValue));
    } else if (next.action === "MUTATE") {
      const source = this.getStructure(next.sourceId);
      const mutated = source.mutate(next.operationType as MutateOperationType);
      this.structures[next.sourceId] = mutated;
      events.push(this.createEvent("STRUCTURE_UPDATED", next.id, next.sourceId));
    } else {
      const target = this.getStructure(next.targetId);
      const value = next.value ?? this.handValue;
      if (value === null || value === undefined) {
        throw new Error(`No value available to insert into "${next.targetId}".`);
      }
      const insertOp: InsertOperationType =
        next.operationType === "TRANSFER"
          ? target.kind === "stack" ? "PUSH" : target.kind === "queue" ? "ENQUEUE" : "APPEND"
          : (next.operationType as InsertOperationType);
      const result = target.insert(value, insertOp, next.arg);
      const insertedNode = normalizeDataNode(value, target.properties, "insert");
      this.structures[next.targetId] = result;
      this.handValue = null;
      events.push(
        this.createEvent("VALUE_INSERTED", next.id, next.targetId, insertedNode.value),
        this.createEvent("STRUCTURE_UPDATED", next.id, next.targetId)
      );
    }

    events.forEach((event) => this.listeners.forEach((listener) => listener(event)));

    const affectedId = next.action === "INSERT" ? next.targetId : next.sourceId;
    const returnValue: DataValue =
      next.action === "EXTRACT" || next.action === "READ"
        ? (this.handValue as DataNode).value
        : next.action === "MUTATE"
          ? 0
          : (events[0]?.value as DataValue);

    return {
      id: next.id,
      action: next.action,
      operationType: next.operationType,
      value: returnValue,
      affectedStructures: [affectedId],
      events,
      state: this.getState()
    };
  }

  private compile(program: ProgramDefinition): CompiledStep[] {
    const compiled: CompiledStep[] = [];

    program.operations.forEach((operation, index) => {
      const stepBase = `${index + 1}-${operation.type.toLowerCase()}`;

      if (INSERT_OPS.has(operation.type)) {
        const op = operation as Extract<OperationDefinition, { targetId: StructureId }>;
        const arg = "arg" in op ? (op as { targetId: StructureId; arg: number }).arg : undefined;
        compiled.push({ id: `${stepBase}-insert`, action: "INSERT", operationType: operation.type, targetId: op.targetId, value: (op as { value?: DataNodeInput }).value, arg });
      } else if (EXTRACT_OPS.has(operation.type)) {
        const op = operation as Extract<OperationDefinition, { sourceId: StructureId }>;
        const arg = "arg" in op ? (op as { sourceId: StructureId; arg: number }).arg : undefined;
        compiled.push({ id: `${stepBase}-extract`, action: "EXTRACT", operationType: operation.type, sourceId: op.sourceId, arg });
      } else if (READ_OPS.has(operation.type)) {
        const op = operation as Extract<OperationDefinition, { sourceId: StructureId }>;
        const arg = "arg" in op ? (op as { sourceId: StructureId; arg: DataValue }).arg : undefined;
        compiled.push({ id: `${stepBase}-read`, action: "READ", operationType: operation.type, sourceId: op.sourceId, arg });
      } else if (MUTATE_OPS.has(operation.type)) {
        const op = operation as Extract<OperationDefinition, { sourceId: StructureId }>;
        compiled.push({ id: `${stepBase}-mutate`, action: "MUTATE", operationType: operation.type, sourceId: op.sourceId });
      } else if (operation.type === "TRANSFER") {
        compiled.push({ id: `${stepBase}-extract`, action: "EXTRACT", operationType: operation.type, sourceId: operation.sourceId });
        compiled.push({ id: `${stepBase}-insert`, action: "INSERT", operationType: operation.type, targetId: operation.targetId });
      }
    });

    return compiled;
  }

  private createEvent(
    type: EngineEventType,
    stepId: string,
    structureId: StructureId,
    value?: DataValue
  ): EngineEvent {
    return {
      type,
      stepId,
      structureId,
      value,
      snapshot: this.getStructure(structureId).serialize()
    };
  }

  private getStructure(id: StructureId): DataStructure {
    const structure = this.structures[id];
    if (!structure) {
      throw new Error(`Structure "${id}" does not exist.`);
    }
    return structure;
  }
}
