export interface CampaignPlanTemplate {
  id: string;
  name: string;
  worldId: string;
  worldName: string;
  difficulty: number;
  maxSteps: number;
  description: string;
}

export const CAMPAIGN_PLAN_TEMPLATES: CampaignPlanTemplate[] = [
  {
    id: "w0-l1",
    name: "W0-L1 · Drag, drop, run",
    worldId: "w0",
    worldName: "Onboarding Editor",
    difficulty: 1.5,
    maxSteps: 4,
    description: "Objetivo: arrastrar bloque, seleccionar operación y ejecutar."
  },
  {
    id: "w0-l2",
    name: "W0-L2 · Step, pause, reset",
    worldId: "w0",
    worldName: "Onboarding Editor",
    difficulty: 1.5,
    maxSteps: 5,
    description: "Objetivo: comprender ejecución por pasos y reinicio."
  },
  {
    id: "w0-l3",
    name: "W0-L3 · Leer estado inicial/objetivo",
    worldId: "w0",
    worldName: "Onboarding Editor",
    difficulty: 1.5,
    maxSteps: 6,
    description: "Objetivo: interpretar tablero y validar cambios."
  },
  {
    id: "w0-l4",
    name: "W0-L4 · Mini reto guiado",
    worldId: "w0",
    worldName: "Onboarding Editor",
    difficulty: 1.5,
    maxSteps: 7,
    description: "Objetivo: resolver un caso simple sin ayuda contextual."
  },
  {
    id: "w1-l1",
    name: "W1-L1 · Stack top transfer",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 1.5,
    maxSteps: 6,
    description: "Stack: mover tope A→B (LIFO básico)."
  },
  {
    id: "w1-l2",
    name: "W1-L2 · Build stack from scratch",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 1.5,
    maxSteps: 12,
    description: "Stack: vaciar A y construir B."
  },
  {
    id: "w1-l3",
    name: "W1-L3 · Queue front transfer",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 1.5,
    maxSteps: 8,
    description: "Queue: extraer frente y reconstruir."
  },
  {
    id: "w1-l4",
    name: "W1-L4 · Queue rotation",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 3.0,
    maxSteps: 12,
    description: "Queue: rotación simple con objetivo específico."
  },
  {
    id: "w1-l5",
    name: "W1-L5 · List append/prepend",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 1.5,
    maxSteps: 10,
    description: "List: construir secuencia usando extremos."
  },
  {
    id: "w1-l6",
    name: "W1-L6 · List trim edges",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 3.0,
    maxSteps: 8,
    description: "List: remove_first/remove_last."
  },
  {
    id: "w1-l7",
    name: "W1-L7 · Mixed basics",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 3.0,
    maxSteps: 14,
    description: "Reto básico combinando 2 estructuras."
  },
  {
    id: "w1-l8",
    name: "W1-L8 · Checkpoint default DS",
    worldId: "w1",
    worldName: "Estructuras por defecto",
    difficulty: 3.0,
    maxSteps: 16,
    description: "Checkpoint de estructuras por defecto."
  },
  {
    id: "w2-l1",
    name: "W2-L1 · Reverse sequence",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 3.0,
    maxSteps: 16,
    description: "Patrón: invertir secuencia con auxiliar."
  },
  {
    id: "w2-l2",
    name: "W2-L2 · Stable transfer",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 3.0,
    maxSteps: 14,
    description: "Patrón: transferir preservando orden."
  },
  {
    id: "w2-l3",
    name: "W2-L3 · Filter by rule",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 3.0,
    maxSteps: 18,
    description: "Patrón: filtrar elementos por regla."
  },
  {
    id: "w2-l4",
    name: "W2-L4 · Partition in two",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 3.0,
    maxSteps: 18,
    description: "Patrón: particionar en dos estructuras."
  },
  {
    id: "w2-l5",
    name: "W2-L5 · Rotational constraint",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 4.5,
    maxSteps: 12,
    description: "Patrón: rotación con presupuesto estricto."
  },
  {
    id: "w2-l6",
    name: "W2-L6 · Transformation checkpoint",
    worldId: "w2",
    worldName: "Patrones de transformación",
    difficulty: 4.5,
    maxSteps: 20,
    description: "Checkpoint de patrones."
  },
  {
    id: "w3-l1",
    name: "W3-L1 · Stack + queue",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 3.0,
    maxSteps: 18,
    description: "Composición: stack + queue."
  },
  {
    id: "w3-l2",
    name: "W3-L2 · Queue + list",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 3.0,
    maxSteps: 18,
    description: "Composición: queue + list."
  },
  {
    id: "w3-l3",
    name: "W3-L3 · Stack + list",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 3.0,
    maxSteps: 18,
    description: "Composición: stack + list."
  },
  {
    id: "w3-l4",
    name: "W3-L4 · Triple mix I",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 4.5,
    maxSteps: 22,
    description: "Composición de 3 estructuras con objetivo parcial."
  },
  {
    id: "w3-l5",
    name: "W3-L5 · Triple mix II",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 4.5,
    maxSteps: 24,
    description: "Composición de 3 estructuras con objetivo exacto."
  },
  {
    id: "w3-l6",
    name: "W3-L6 · Composition checkpoint",
    worldId: "w3",
    worldName: "Composición de estructuras",
    difficulty: 4.5,
    maxSteps: 24,
    description: "Checkpoint de composición."
  },
  {
    id: "w4-l1",
    name: "W4-L1 · Create helper function",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 3.0,
    maxSteps: 12,
    description: "Crear helper y usarlo."
  },
  {
    id: "w4-l2",
    name: "W4-L2 · Reuse helper N times",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 3.0,
    maxSteps: 14,
    description: "Reutilización de función en varios pasos."
  },
  {
    id: "w4-l3",
    name: "W4-L3 · Two coordinated helpers",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 4.5,
    maxSteps: 16,
    description: "Diseño de dos helpers coordinados."
  },
  {
    id: "w4-l4",
    name: "W4-L4 · Function with conditionals",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 4.5,
    maxSteps: 18,
    description: "Función con control de flujo básico."
  },
  {
    id: "w4-l5",
    name: "W4-L5 · Refactor for fewer blocks",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 4.5,
    maxSteps: 16,
    description: "Reducir bloques usando abstracción."
  },
  {
    id: "w4-l6",
    name: "W4-L6 · Functions checkpoint",
    worldId: "w4",
    worldName: "Abstracción con funciones",
    difficulty: 4.5,
    maxSteps: 18,
    description: "Checkpoint de funciones."
  },
  {
    id: "w5-l1",
    name: "W5-L1 · Define basic type",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 3.0,
    maxSteps: 14,
    description: "Definir tipo con campos simples."
  },
  {
    id: "w5-l2",
    name: "W5-L2 · Create and assign fields",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 3.0,
    maxSteps: 16,
    description: "Instanciar tipo y asignar campos."
  },
  {
    id: "w5-l3",
    name: "W5-L3 · Typed objects inside DS",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 4.5,
    maxSteps: 20,
    description: "Usar objetos tipados dentro de estructuras."
  },
  {
    id: "w5-l4",
    name: "W5-L4 · Read/update fields in flow",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 4.5,
    maxSteps: 22,
    description: "Leer y actualizar campos durante la ejecución."
  },
  {
    id: "w5-l5",
    name: "W5-L5 · Type + helper function",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 4.5,
    maxSteps: 24,
    description: "Integrar tipos con funciones."
  },
  {
    id: "w5-l6",
    name: "W5-L6 · Types checkpoint",
    worldId: "w5",
    worldName: "Modelado con tipos",
    difficulty: 4.5,
    maxSteps: 24,
    description: "Checkpoint de modelado con tipos."
  },
  {
    id: "w6-l1",
    name: "W6-L1 · Capstone I",
    worldId: "w6",
    worldName: "Integración final",
    difficulty: 4.5,
    maxSteps: 24,
    description: "Capstone con múltiples estructuras y función."
  },
  {
    id: "w6-l2",
    name: "W6-L2 · Capstone II",
    worldId: "w6",
    worldName: "Integración final",
    difficulty: 4.5,
    maxSteps: 26,
    description: "Capstone con restricciones fuertes."
  },
  {
    id: "w6-l3",
    name: "W6-L3 · Capstone III with custom type",
    worldId: "w6",
    worldName: "Integración final",
    difficulty: 4.5,
    maxSteps: 28,
    description: "Capstone con tipo personalizado obligatorio."
  },
  {
    id: "w6-l4",
    name: "W6-L4 · Final del castillo",
    worldId: "w6",
    worldName: "Integración final",
    difficulty: 4.5,
    maxSteps: 30,
    description: "Reto final integrador de toda la campaña."
  }
];
