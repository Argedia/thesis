export type StructureId = string;
export type StructureKind = "stack" | "queue";
export type DataValue = string | number;

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
  insert(value: DataNodeInput): DataStructure;
  extract(): { structure: DataStructure; value: DataNode };
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

  public abstract insert(value: DataNodeInput): DataStructure;
  public abstract extract(): { structure: DataStructure; value: DataNode };
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

  public insert(value: DataNodeInput): StackStructure {
    return new StackStructure(
      this.id,
      [...this.values, this.prepareInsertedValue(value)],
      this.properties
    );
  }

  public extract(): { structure: StackStructure; value: DataNode } {
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

  public insert(value: DataNodeInput): QueueStructure {
    return new QueueStructure(
      this.id,
      [...this.values, this.prepareInsertedValue(value)],
      this.properties
    );
  }

  public extract(): { structure: QueueStructure; value: DataNode } {
    if (this.values.length === 0) {
      throw new Error(`Queue "${this.id}" is empty.`);
    }

    return {
      structure: new QueueStructure(this.id, this.values.slice(1), this.properties),
      value: { ...this.values[0] }
    };
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
  | { type: "TRANSFER"; sourceId: StructureId; targetId: StructureId };

export interface ProgramDefinition {
  operations: OperationDefinition[];
}

export type EngineEventType =
  | "VALUE_EXTRACTED"
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
  action: "EXTRACT" | "INSERT";
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

  return new QueueStructure(normalized.id, normalized.values, normalized.properties);
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

    const events: EngineEvent[] = [];
    if (next.action === "EXTRACT") {
      const source = this.getStructure(next.sourceId);
      const result = source.extract();
      this.structures[next.sourceId] = result.structure;
      this.handValue = result.value;

      events.push(
        this.createEvent("VALUE_EXTRACTED", next.id, next.sourceId, result.value.value),
        this.createEvent("STRUCTURE_UPDATED", next.id, next.sourceId)
      );
    } else {
      const target = this.getStructure(next.targetId);
      const value = next.value ?? this.handValue;

      if (value === null || value === undefined) {
        throw new Error(`No value available to insert into "${next.targetId}".`);
      }

      const result = target.insert(value);
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

    this.stepIndex += 1;
    events.forEach((event) => this.listeners.forEach((listener) => listener(event)));

    return {
      id: next.id,
      action: next.action,
      operationType: next.operationType,
      value:
        next.action === "EXTRACT"
          ? (this.handValue as DataNode).value
          : (events[0].value as DataValue),
      affectedStructures:
        next.action === "EXTRACT" ? [next.sourceId] : [next.targetId],
      events,
      state: this.getState()
    };
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

  private compile(program: ProgramDefinition): CompiledStep[] {
    const compiled: CompiledStep[] = [];

    program.operations.forEach((operation, index) => {
      const stepBase = `${index + 1}-${operation.type.toLowerCase()}`;

      switch (operation.type) {
        case "PUSH":
        case "ENQUEUE":
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
          compiled.push({
            id: `${stepBase}-extract`,
            action: "EXTRACT",
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
