import { getAppLanguage, type SupportedLanguage } from "../../i18n";

export interface CampaignPlanTemplate {
  id: string;
  name: string;
  worldId: string;
  worldName: string;
  difficulty: number;
  maxSteps: number;
  description: string;
}

type CampaignScreenCopy = {
  eyebrow: string;
  title: string;
  description: (options: { completed: number; total: number }) => string;
  worldStripAriaLabel: string;
  worldLabel: (index: number) => string;
  blockedWorldTitle: string;
  blockedWorldBody: string;
  emptyWorldTitle: string;
  emptyWorldBody: string;
  startBadge: string;
  playerPositionAriaLabel: string;
  playerTag: string;
  panelFallbackTitle: string;
  selectedLevelEyebrow: string;
  selectedNodeEyebrow: string;
  noDescription: string;
  introducesLabel: string;
  introducesFallback: string;
  metaDifficultyLabel: string;
  completedLabel: string;
  replayLabel: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeBody: string;
  welcomeMeta: string;
  startNodeTitle: string;
  startNodeBody: string;
};

const CAMPAIGN_SCREEN_COPY: Record<SupportedLanguage, CampaignScreenCopy> = {
  en: {
    eyebrow: "INF261 Campaign",
    title: "Linear data structures",
    description: ({ completed, total }) =>
      `Advance through sequential worlds to practice the editor, stack, queue, list, and integration. Total progress: ${completed}/${total} completed levels.`,
    worldStripAriaLabel: "World progression",
    worldLabel: (index) => `World ${index}`,
    blockedWorldTitle: "Locked world",
    blockedWorldBody: "Complete the previous world to unlock this one.",
    emptyWorldTitle: "World without levels",
    emptyWorldBody: "There are no configured nodes for this world.",
    startBadge: "START",
    playerPositionAriaLabel: "Player position",
    playerTag: "YOU",
    panelFallbackTitle: "Campaign",
    selectedLevelEyebrow: "Selected level",
    selectedNodeEyebrow: "Selected node",
    noDescription: "No description.",
    introducesLabel: "Introduces",
    introducesFallback: "Concept not declared.",
    metaDifficultyLabel: "Difficulty",
    completedLabel: "Completed",
    replayLabel: "Replay level",
    welcomeEyebrow: "Welcome",
    welcomeTitle: "Welcome to the campaign",
    welcomeBody: "You will learn the basics of this software here and how to use it.",
    welcomeMeta: "Click level 1 to get started. Then click Play, or click the same level again, to start playing.",
    startNodeTitle: "Starting point",
    startNodeBody: "This node marks the entrance to the world. Move to the next level to continue."
  },
  es: {
    eyebrow: "Campaña INF261",
    title: "Estructuras de datos lineales",
    description: ({ completed, total }) =>
      `Avanza por mundos secuenciales para practicar editor, pila, cola, lista e integración. Progreso total: ${completed}/${total} niveles completados.`,
    worldStripAriaLabel: "Progresión por mundos",
    worldLabel: (index) => `Mundo ${index}`,
    blockedWorldTitle: "Mundo bloqueado",
    blockedWorldBody: "Completa el mundo anterior para desbloquear este mundo.",
    emptyWorldTitle: "Mundo sin niveles",
    emptyWorldBody: "No hay nodos configurados para este mundo.",
    startBadge: "INICIO",
    playerPositionAriaLabel: "Posición del jugador",
    playerTag: "TÚ",
    panelFallbackTitle: "Campaña",
    selectedLevelEyebrow: "Nivel seleccionado",
    selectedNodeEyebrow: "Nodo seleccionado",
    noDescription: "Sin descripción.",
    introducesLabel: "Introduce",
    introducesFallback: "Concepto no declarado.",
    metaDifficultyLabel: "Dificultad",
    completedLabel: "Completado",
    replayLabel: "Repetir nivel",
    welcomeEyebrow: "Bienvenida",
    welcomeTitle: "Bienvenido a la campaña",
    welcomeBody: "Aquí aprenderás lo básico de este software y cómo usarlo.",
    welcomeMeta: "Haz clic en el nivel 1 para empezar. Luego pulsa Jugar, o vuelve a hacer clic en el mismo nivel, para comenzar.",
    startNodeTitle: "Punto de inicio",
    startNodeBody: "Este nodo marca la entrada al mundo. Muévete al siguiente nivel para continuar."
  }
};

const CAMPAIGN_PLAN_TEMPLATES_BY_LANGUAGE: Record<SupportedLanguage, CampaignPlanTemplate[]> = {
  en: [
    { id: "w1-l1", name: "W1-L1 · Drag, drop, run", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.5, maxSteps: 4, description: "Goal: drag a block, choose an operation, and run it." },
    { id: "w1-l2", name: "W1-L2 · Step, pause, reset", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.5, maxSteps: 5, description: "Goal: understand step-by-step execution and reset." },
    { id: "w1-l3", name: "W1-L3 · Read initial state/goal", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.5, maxSteps: 6, description: "Goal: interpret the board and validate changes." },
    { id: "w1-l4", name: "W1-L4 · Mini guided challenge", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.5, maxSteps: 7, description: "Goal: solve a simple case without contextual help." },
    { id: "w2-l1", name: "W2-L1 · Stack top transfer", worldId: "w2", worldName: "Default structures", difficulty: 1.5, maxSteps: 6, description: "Stack: move top from A to B (basic LIFO)." },
    { id: "w2-l2", name: "W2-L2 · Build stack from scratch", worldId: "w2", worldName: "Default structures", difficulty: 1.5, maxSteps: 12, description: "Stack: empty A and build B." },
    { id: "w2-l3", name: "W2-L3 · Queue front transfer", worldId: "w2", worldName: "Default structures", difficulty: 1.5, maxSteps: 8, description: "Queue: extract the front and rebuild." },
    { id: "w2-l4", name: "W2-L4 · Queue rotation", worldId: "w2", worldName: "Default structures", difficulty: 3, maxSteps: 12, description: "Queue: simple rotation with a specific target." },
    { id: "w2-l5", name: "W2-L5 · List append/prepend", worldId: "w2", worldName: "Default structures", difficulty: 1.5, maxSteps: 10, description: "List: build a sequence using both ends." },
    { id: "w2-l6", name: "W2-L6 · List trim edges", worldId: "w2", worldName: "Default structures", difficulty: 3, maxSteps: 8, description: "List: remove_first/remove_last." },
    { id: "w2-l7", name: "W2-L7 · Mixed basics", worldId: "w2", worldName: "Default structures", difficulty: 3, maxSteps: 14, description: "Basic challenge combining 2 structures." },
    { id: "w2-l8", name: "W2-L8 · Default DS checkpoint", worldId: "w2", worldName: "Default structures", difficulty: 3, maxSteps: 16, description: "Checkpoint for default structures." },
    { id: "w2-l1", name: "W2-L1 · Reverse sequence", worldId: "w2", worldName: "Transformation patterns", difficulty: 3, maxSteps: 16, description: "Pattern: reverse a sequence with an auxiliary structure." },
    { id: "w2-l2", name: "W2-L2 · Stable transfer", worldId: "w2", worldName: "Transformation patterns", difficulty: 3, maxSteps: 14, description: "Pattern: transfer while preserving order." },
    { id: "w2-l3", name: "W2-L3 · Filter by rule", worldId: "w2", worldName: "Transformation patterns", difficulty: 3, maxSteps: 18, description: "Pattern: filter elements by a rule." },
    { id: "w2-l4", name: "W2-L4 · Partition in two", worldId: "w2", worldName: "Transformation patterns", difficulty: 3, maxSteps: 18, description: "Pattern: split into two structures." },
    { id: "w2-l5", name: "W2-L5 · Rotational constraint", worldId: "w2", worldName: "Transformation patterns", difficulty: 4.5, maxSteps: 12, description: "Pattern: rotation under a strict budget." },
    { id: "w2-l6", name: "W2-L6 · Transformation checkpoint", worldId: "w2", worldName: "Transformation patterns", difficulty: 4.5, maxSteps: 20, description: "Pattern checkpoint." },
    { id: "w3-l1", name: "W3-L1 · Stack + queue", worldId: "w3", worldName: "Structure composition", difficulty: 3, maxSteps: 18, description: "Composition: stack + queue." },
    { id: "w3-l2", name: "W3-L2 · Queue + list", worldId: "w3", worldName: "Structure composition", difficulty: 3, maxSteps: 18, description: "Composition: queue + list." },
    { id: "w3-l3", name: "W3-L3 · Stack + list", worldId: "w3", worldName: "Structure composition", difficulty: 3, maxSteps: 18, description: "Composition: stack + list." },
    { id: "w3-l4", name: "W3-L4 · Triple mix I", worldId: "w3", worldName: "Structure composition", difficulty: 4.5, maxSteps: 22, description: "Composition of 3 structures with a partial goal." },
    { id: "w3-l5", name: "W3-L5 · Triple mix II", worldId: "w3", worldName: "Structure composition", difficulty: 4.5, maxSteps: 24, description: "Composition of 3 structures with an exact goal." },
    { id: "w3-l6", name: "W3-L6 · Composition checkpoint", worldId: "w3", worldName: "Structure composition", difficulty: 4.5, maxSteps: 24, description: "Composition checkpoint." },
    { id: "w4-l1", name: "W4-L1 · Create helper function", worldId: "w4", worldName: "Abstraction with functions", difficulty: 3, maxSteps: 12, description: "Create a helper and use it." },
    { id: "w4-l2", name: "W4-L2 · Reuse helper N times", worldId: "w4", worldName: "Abstraction with functions", difficulty: 3, maxSteps: 14, description: "Reuse a function across multiple steps." },
    { id: "w4-l3", name: "W4-L3 · Two coordinated helpers", worldId: "w4", worldName: "Abstraction with functions", difficulty: 4.5, maxSteps: 16, description: "Design two coordinated helpers." },
    { id: "w4-l4", name: "W4-L4 · Function with conditionals", worldId: "w4", worldName: "Abstraction with functions", difficulty: 4.5, maxSteps: 18, description: "Function with basic control flow." },
    { id: "w4-l5", name: "W4-L5 · Refactor for fewer blocks", worldId: "w4", worldName: "Abstraction with functions", difficulty: 4.5, maxSteps: 16, description: "Reduce blocks using abstraction." },
    { id: "w4-l6", name: "W4-L6 · Functions checkpoint", worldId: "w4", worldName: "Abstraction with functions", difficulty: 4.5, maxSteps: 18, description: "Functions checkpoint." },
    { id: "w5-l1", name: "W5-L1 · Define basic type", worldId: "w5", worldName: "Type modeling", difficulty: 3, maxSteps: 14, description: "Define a type with simple fields." },
    { id: "w5-l2", name: "W5-L2 · Create and assign fields", worldId: "w5", worldName: "Type modeling", difficulty: 3, maxSteps: 16, description: "Instantiate a type and assign fields." },
    { id: "w5-l3", name: "W5-L3 · Typed objects inside DS", worldId: "w5", worldName: "Type modeling", difficulty: 4.5, maxSteps: 20, description: "Use typed objects inside data structures." },
    { id: "w5-l4", name: "W5-L4 · Read/update fields in flow", worldId: "w5", worldName: "Type modeling", difficulty: 4.5, maxSteps: 22, description: "Read and update fields during execution." },
    { id: "w5-l5", name: "W5-L5 · Type + helper function", worldId: "w5", worldName: "Type modeling", difficulty: 4.5, maxSteps: 24, description: "Integrate types with functions." },
    { id: "w5-l6", name: "W5-L6 · Types checkpoint", worldId: "w5", worldName: "Type modeling", difficulty: 4.5, maxSteps: 24, description: "Type modeling checkpoint." },
    { id: "w6-l1", name: "W6-L1 · Capstone I", worldId: "w6", worldName: "Final integration", difficulty: 4.5, maxSteps: 24, description: "Capstone with multiple structures and a function." },
    { id: "w6-l2", name: "W6-L2 · Capstone II", worldId: "w6", worldName: "Final integration", difficulty: 4.5, maxSteps: 26, description: "Capstone with strong constraints." },
    { id: "w6-l3", name: "W6-L3 · Capstone III with custom type", worldId: "w6", worldName: "Final integration", difficulty: 4.5, maxSteps: 28, description: "Capstone with a required custom type." },
    { id: "w6-l4", name: "W6-L4 · Final castle", worldId: "w6", worldName: "Final integration", difficulty: 4.5, maxSteps: 30, description: "Final integrative campaign challenge." }
  ],
  es: [
    { id: "w1-l1", name: "W1-L1 · Arrastrar, soltar, ejecutar", worldId: "w1", worldName: "Onboarding del editor", difficulty: 1.5, maxSteps: 4, description: "Objetivo: arrastrar un bloque, elegir una operación y ejecutarla." },
    { id: "w1-l2", name: "W1-L2 · Paso, pausa, reinicio", worldId: "w1", worldName: "Onboarding del editor", difficulty: 1.5, maxSteps: 5, description: "Objetivo: comprender la ejecución paso a paso y el reinicio." },
    { id: "w1-l3", name: "W1-L3 · Leer estado inicial/meta", worldId: "w1", worldName: "Onboarding del editor", difficulty: 1.5, maxSteps: 6, description: "Objetivo: interpretar el tablero y validar cambios." },
    { id: "w1-l4", name: "W1-L4 · Mini reto guiado", worldId: "w1", worldName: "Onboarding del editor", difficulty: 1.5, maxSteps: 7, description: "Objetivo: resolver un caso simple sin ayuda contextual." },
    { id: "w2-l1", name: "W2-L1 · Transferencia del tope de pila", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 1.5, maxSteps: 6, description: "Pila: mover el tope de A a B (LIFO básico)." },
    { id: "w2-l2", name: "W2-L2 · Construir pila desde cero", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 1.5, maxSteps: 12, description: "Pila: vaciar A y construir B." },
    { id: "w2-l3", name: "W2-L3 · Transferencia del frente de cola", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 1.5, maxSteps: 8, description: "Cola: extraer el frente y reconstruir." },
    { id: "w2-l4", name: "W2-L4 · Rotación de cola", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 3, maxSteps: 12, description: "Cola: rotación simple con una meta específica." },
    { id: "w2-l5", name: "W2-L5 · Append/prepend en lista", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 1.5, maxSteps: 10, description: "Lista: construir una secuencia usando ambos extremos." },
    { id: "w2-l6", name: "W2-L6 · Recortar bordes de lista", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 3, maxSteps: 8, description: "Lista: remove_first/remove_last." },
    { id: "w2-l7", name: "W2-L7 · Fundamentos mixtos", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 3, maxSteps: 14, description: "Reto básico combinando 2 estructuras." },
    { id: "w2-l8", name: "W2-L8 · Checkpoint de estructuras base", worldId: "w2", worldName: "Estructuras por defecto", difficulty: 3, maxSteps: 16, description: "Checkpoint de estructuras por defecto." },
    { id: "w2-l1", name: "W2-L1 · Invertir secuencia", worldId: "w2", worldName: "Patrones de transformación", difficulty: 3, maxSteps: 16, description: "Patrón: invertir una secuencia con una estructura auxiliar." },
    { id: "w2-l2", name: "W2-L2 · Transferencia estable", worldId: "w2", worldName: "Patrones de transformación", difficulty: 3, maxSteps: 14, description: "Patrón: transferir preservando el orden." },
    { id: "w2-l3", name: "W2-L3 · Filtrar por regla", worldId: "w2", worldName: "Patrones de transformación", difficulty: 3, maxSteps: 18, description: "Patrón: filtrar elementos según una regla." },
    { id: "w2-l4", name: "W2-L4 · Particionar en dos", worldId: "w2", worldName: "Patrones de transformación", difficulty: 3, maxSteps: 18, description: "Patrón: dividir en dos estructuras." },
    { id: "w2-l5", name: "W2-L5 · Restricción rotacional", worldId: "w2", worldName: "Patrones de transformación", difficulty: 4.5, maxSteps: 12, description: "Patrón: rotación bajo un presupuesto estricto." },
    { id: "w2-l6", name: "W2-L6 · Checkpoint de transformación", worldId: "w2", worldName: "Patrones de transformación", difficulty: 4.5, maxSteps: 20, description: "Checkpoint de patrones." },
    { id: "w3-l1", name: "W3-L1 · Pila + cola", worldId: "w3", worldName: "Composición de estructuras", difficulty: 3, maxSteps: 18, description: "Composición: pila + cola." },
    { id: "w3-l2", name: "W3-L2 · Cola + lista", worldId: "w3", worldName: "Composición de estructuras", difficulty: 3, maxSteps: 18, description: "Composición: cola + lista." },
    { id: "w3-l3", name: "W3-L3 · Pila + lista", worldId: "w3", worldName: "Composición de estructuras", difficulty: 3, maxSteps: 18, description: "Composición: pila + lista." },
    { id: "w3-l4", name: "W3-L4 · Mezcla triple I", worldId: "w3", worldName: "Composición de estructuras", difficulty: 4.5, maxSteps: 22, description: "Composición de 3 estructuras con una meta parcial." },
    { id: "w3-l5", name: "W3-L5 · Mezcla triple II", worldId: "w3", worldName: "Composición de estructuras", difficulty: 4.5, maxSteps: 24, description: "Composición de 3 estructuras con una meta exacta." },
    { id: "w3-l6", name: "W3-L6 · Checkpoint de composición", worldId: "w3", worldName: "Composición de estructuras", difficulty: 4.5, maxSteps: 24, description: "Checkpoint de composición." },
    { id: "w4-l1", name: "W4-L1 · Crear función helper", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 3, maxSteps: 12, description: "Crear un helper y usarlo." },
    { id: "w4-l2", name: "W4-L2 · Reutilizar helper N veces", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 3, maxSteps: 14, description: "Reutilizar una función en varios pasos." },
    { id: "w4-l3", name: "W4-L3 · Dos helpers coordinados", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 4.5, maxSteps: 16, description: "Diseñar dos helpers coordinados." },
    { id: "w4-l4", name: "W4-L4 · Función con condicionales", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 4.5, maxSteps: 18, description: "Función con flujo de control básico." },
    { id: "w4-l5", name: "W4-L5 · Refactorizar para menos bloques", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 4.5, maxSteps: 16, description: "Reducir bloques usando abstracción." },
    { id: "w4-l6", name: "W4-L6 · Checkpoint de funciones", worldId: "w4", worldName: "Abstracción con funciones", difficulty: 4.5, maxSteps: 18, description: "Checkpoint de funciones." },
    { id: "w5-l1", name: "W5-L1 · Definir tipo básico", worldId: "w5", worldName: "Modelado con tipos", difficulty: 3, maxSteps: 14, description: "Definir un tipo con campos simples." },
    { id: "w5-l2", name: "W5-L2 · Crear y asignar campos", worldId: "w5", worldName: "Modelado con tipos", difficulty: 3, maxSteps: 16, description: "Instanciar un tipo y asignar campos." },
    { id: "w5-l3", name: "W5-L3 · Objetos tipados dentro de ED", worldId: "w5", worldName: "Modelado con tipos", difficulty: 4.5, maxSteps: 20, description: "Usar objetos tipados dentro de estructuras de datos." },
    { id: "w5-l4", name: "W5-L4 · Leer/actualizar campos en flujo", worldId: "w5", worldName: "Modelado con tipos", difficulty: 4.5, maxSteps: 22, description: "Leer y actualizar campos durante la ejecución." },
    { id: "w5-l5", name: "W5-L5 · Tipo + función helper", worldId: "w5", worldName: "Modelado con tipos", difficulty: 4.5, maxSteps: 24, description: "Integrar tipos con funciones." },
    { id: "w5-l6", name: "W5-L6 · Checkpoint de tipos", worldId: "w5", worldName: "Modelado con tipos", difficulty: 4.5, maxSteps: 24, description: "Checkpoint de modelado con tipos." },
    { id: "w6-l1", name: "W6-L1 · Capstone I", worldId: "w6", worldName: "Integración final", difficulty: 4.5, maxSteps: 24, description: "Capstone con múltiples estructuras y una función." },
    { id: "w6-l2", name: "W6-L2 · Capstone II", worldId: "w6", worldName: "Integración final", difficulty: 4.5, maxSteps: 26, description: "Capstone con restricciones fuertes." },
    { id: "w6-l3", name: "W6-L3 · Capstone III con tipo personalizado", worldId: "w6", worldName: "Integración final", difficulty: 4.5, maxSteps: 28, description: "Capstone con un tipo personalizado obligatorio." },
    { id: "w6-l4", name: "W6-L4 · Final del castillo", worldId: "w6", worldName: "Integración final", difficulty: 4.5, maxSteps: 30, description: "Reto final integrador de toda la campaña." }
  ]
};

export const getCampaignScreenCopy = (language = getAppLanguage()): CampaignScreenCopy =>
  CAMPAIGN_SCREEN_COPY[language];

export const getCampaignPlanTemplates = (language = getAppLanguage()): CampaignPlanTemplate[] =>
  CAMPAIGN_PLAN_TEMPLATES_BY_LANGUAGE[language];
