export type StructureId = string;
export type StructureKind = "stack" | "queue" | "list";
export type DataValue = string | number | boolean;
export type InsertOperationType = "PUSH" | "ENQUEUE" | "APPEND" | "PREPEND";
export type ExtractOperationType = "POP" | "DEQUEUE" | "REMOVE_FIRST" | "REMOVE_LAST";

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
  insert(value: DataNodeInput, operationType: InsertOperationType): DataStructure;
  extract(operationType: ExtractOperationType): { structure: DataStructure; value: DataNode };
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

  public abstract insert(value: DataNodeInput, operationType: InsertOperationType): DataStructure;
  public abstract extract(operationType: ExtractOperationType): { structure: DataStructure; value: DataNode };
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

  public insert(value: DataNodeInput, operationType: InsertOperationType): StackStructure {
    if (operationType !== "PUSH") {
      throw new Error(`Stack "${this.id}" only supports PUSH for insertion.`);
    }
    return new StackStructure(
      this.id,
      [...this.values, this.prepareInsertedValue(value)],
      this.properties
    );
  }

  public extract(operationType: ExtractOperationType): { structure: StackStructure; value: DataNode } {
    if (operationType !== "POP") {
      throw new Error(`Stack "${this.id}" only supports POP for extraction.`);
    }
    if (this.values.length === 0) {
      throw new Error(`Stack "${this.id}" is empty.`);
    }

    const nextValues = this.values.slice(0, -1);
    return {
      structure: new StackStructure(this.id, nextValues, this.properties),
      value: { ...this.values[this.values.length - 1] }
    };
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

  public insert(value: DataNodeInput, operationType: InsertOperationType): QueueStructure {
    if (operationType !== "ENQUEUE") {
      throw new Error(`Queue "${this.id}" only supports ENQUEUE for insertion.`);
    }
    return new QueueStructure(
      this.id,
      [...this.values, this.prepareInsertedValue(value)],
      this.properties
    );
  }

  public extract(operationType: ExtractOperationType): { structure: QueueStructure; value: DataNode } {
    if (operationType !== "DEQUEUE") {
      throw new Error(`Queue "${this.id}" only supports DEQUEUE for extraction.`);
    }
    if (this.values.length === 0) {
      throw new Error(`Queue "${this.id}" is empty.`);
    }

    return {
      structure: new QueueStructure(this.id, this.values.slice(1), this.properties),
      value: { ...this.values[0] }
    };
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

  public insert(value: DataNodeInput, operationType: InsertOperationType): ListStructure {
    const inserted = this.prepareInsertedValue(value);
    const nextValues =
      operationType === "PREPEND"
        ? [inserted, ...this.values]
        : [...this.values, inserted];

    return new ListStructure(this.id, nextValues, this.properties);
  }

  public extract(operationType: ExtractOperationType): { structure: ListStructure; value: DataNode } {
    if (this.values.length === 0) {
      throw new Error(`List "${this.id}" is empty.`);
    }

    if (operationType === "REMOVE_LAST") {
      const nextValues = this.values.slice(0, -1);
      return {
        structure: new ListStructure(this.id, nextValues, this.properties),
        value: { ...this.values[this.values.length - 1] }
      };
    }

    return {
      structure: new ListStructure(this.id, this.values.slice(1), this.properties),
      value: { ...this.values[0] }
    };
  }

  public getHead(): DataNode {
    if (this.values.length === 0) {
      throw new Error(`List "${this.id}" is empty.`);
    }

    return { ...this.values[0] };
  }

  public getTail(): DataNode {
    if (this.values.length === 0) {
      throw new Error(`List "${this.id}" is empty.`);
    }

    return { ...this.values[this.values.length - 1] };
  }

  public size(): number {
    return this.values.length;
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
  | { type: "REMOVE_FIRST"; sourceId: StructureId }
  | { type: "REMOVE_LAST"; sourceId: StructureId }
  | { type: "GET_HEAD"; sourceId: StructureId }
  | { type: "GET_TAIL"; sourceId: StructureId }
  | { type: "SIZE"; sourceId: StructureId }
  | { type: "TRANSFER"; sourceId: StructureId; targetId: StructureId };

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
  action: "EXTRACT" | "INSERT" | "READ";
  operationType: OperationDefinition["type"];
  value: DataValue;
  affectedStructures: StructureId[];
  events: EngineEvent[];
  state: EngineState;
}

type CompiledStep =
  | {
      id: string;
      action: "EXTRACT";
      operationType: OperationDefinition["type"];
      sourceId: StructureId;
    }
  | {
      id: string;
      action: "INSERT";
      operationType: OperationDefinition["type"];
      targetId: StructureId;
      value?: DataNodeInput;
    }
  | {
      id: string;
      action: "READ";
      operationType: OperationDefinition["type"];
      sourceId: StructureId;
    };

type EngineListener = (event: EngineEvent) => void;

export interface EngineConfig {
  structures: StructureSnapshot[];
}

const createStructure = (snapshot: StructureSnapshot): DataStructure => {
  const normalized = normalizeStructureSnapshot(snapshot);
  if (normalized.kind === "stack") {
    return new StackStructure(normalized.id, normalized.values, normalized.properties);
  }

  if (normalized.kind === "queue") {
    return new QueueStructure(normalized.id, normalized.values, normalized.properties);
  }

  return new ListStructure(normalized.id, normalized.values, normalized.properties);
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
      const extractOperationType: ExtractOperationType =
        next.operationType === "TRANSFER"
          ? source.kind === "stack"
            ? "POP"
            : source.kind === "queue"
              ? "DEQUEUE"
              : "REMOVE_FIRST"
          : (next.operationType as ExtractOperationType);
      const result = source.extract(extractOperationType);
      this.structures[next.sourceId] = result.structure;
      this.handValue = result.value;

      events.push(
        this.createEvent("VALUE_EXTRACTED", next.id, next.sourceId, result.value.value),
        this.createEvent("STRUCTURE_UPDATED", next.id, next.sourceId)
      );
    } else if (next.action === "READ") {
      const source = this.getStructure(next.sourceId);
      if (source.kind !== "list") {
        throw new Error(`Operation "${next.operationType}" is only available for lists.`);
      }

      const listSource = source as ListStructure;
      let readValue: DataValue;
      switch (next.operationType) {
        case "GET_HEAD":
          readValue = listSource.getHead().value;
          break;
        case "GET_TAIL":
          readValue = listSource.getTail().value;
          break;
        case "SIZE":
          readValue = listSource.size();
          break;
        default:
          throw new Error(`Unsupported read operation "${next.operationType}".`);
      }

      this.handValue = normalizeDataNode(readValue, source.properties, "insert");
      events.push(
        this.createEvent("VALUE_READ", next.id, next.sourceId, readValue)
      );
    } else {
      const target = this.getStructure(next.targetId);
      const value = next.value ?? this.handValue;

      if (value === null || value === undefined) {
        throw new Error(`No value available to insert into "${next.targetId}".`);
      }

      const insertOperationType: InsertOperationType =
        next.operationType === "TRANSFER"
          ? target.kind === "stack"
            ? "PUSH"
            : target.kind === "queue"
              ? "ENQUEUE"
              : "APPEND"
          : (next.operationType as InsertOperationType);
      const result = target.insert(value, insertOperationType);
      const insertedNode = normalizeDataNode(
        value,
        target.properties,
        "insert"
      );
      this.structures[next.targetId] = result;
      this.handValue = null;

      events.push(
        this.createEvent("VALUE_INSERTED", next.id, next.targetId, insertedNode.value),
        this.createEvent("STRUCTURE_UPDATED", next.id, next.targetId)
      );
    }

    events.forEach((event) => this.listeners.forEach((listener) => listener(event)));

    return {
      id: next.id,
      action: next.action,
      operationType: next.operationType,
      value:
        next.action === "EXTRACT" || next.action === "READ"
          ? (this.handValue as DataNode).value
          : (events[0].value as DataValue),
      affectedStructures:
        next.action === "INSERT" ? [next.targetId] : [next.sourceId],
      events,
      state: this.getState()
    };
  }

  private compile(program: ProgramDefinition): CompiledStep[] {
    const compiled: CompiledStep[] = [];

    program.operations.forEach((operation, index) => {
      const stepBase = `${index + 1}-${operation.type.toLowerCase()}`;

      switch (operation.type) {
        case "PUSH":
        case "ENQUEUE":
        case "APPEND":
        case "PREPEND":
          compiled.push({
            id: `${stepBase}-insert`,
            action: "INSERT",
            operationType: operation.type,
            targetId: operation.targetId,
            value: operation.value
          });
          break;
        case "POP":
        case "DEQUEUE":
        case "REMOVE_FIRST":
        case "REMOVE_LAST":
          compiled.push({
            id: `${stepBase}-extract`,
            action: "EXTRACT",
            operationType: operation.type,
            sourceId: operation.sourceId
          });
          break;
        case "GET_HEAD":
        case "GET_TAIL":
        case "SIZE":
          compiled.push({
            id: `${stepBase}-read`,
            action: "READ",
            operationType: operation.type,
            sourceId: operation.sourceId
          });
          break;
        case "TRANSFER":
          compiled.push({
            id: `${stepBase}-extract`,
            action: "EXTRACT",
            operationType: operation.type,
            sourceId: operation.sourceId
          });
          compiled.push({
            id: `${stepBase}-insert`,
            action: "INSERT",
            operationType: operation.type,
            targetId: operation.targetId
          });
          break;
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
