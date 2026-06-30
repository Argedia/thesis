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
  worldCompleteEyebrow: string;
  worldCompleteTitle: string;
  worldCompleteBody: string;
  worldCompleteConceptLabel: string;
  worldCompleteNextLabel: string;
  worldCompleteContinue: string;
  worldCompleteFinalBody: string;
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
    startNodeBody: "This node marks the entrance to the world. Move to the next level to continue.",
    worldCompleteEyebrow: "World complete",
    worldCompleteTitle: "Great! You cleared this world!",
    worldCompleteBody: "Now you know how to work with these ideas:",
    worldCompleteConceptLabel: "Now you know",
    worldCompleteNextLabel: "Next world",
    worldCompleteContinue: "Continue",
    worldCompleteFinalBody: "You closed the final world of the campaign. Take a look at everything you can solve now."
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
    startNodeBody: "Este nodo marca la entrada al mundo. Muévete al siguiente nivel para continuar.",
    worldCompleteEyebrow: "Mundo completado",
    worldCompleteTitle: "¡Genial! Superaste este mundo",
    worldCompleteBody: "Ahora sabes trabajar con estas ideas:",
    worldCompleteConceptLabel: "Ahora sabes",
    worldCompleteNextLabel: "Siguiente mundo",
    worldCompleteContinue: "Continuar",
    worldCompleteFinalBody: "Cerraste el último mundo de la campaña. Mira todo lo que ya sabes resolver."
  }
};

const CAMPAIGN_PLAN_TEMPLATES_BY_LANGUAGE: Record<SupportedLanguage, CampaignPlanTemplate[]> = {
  en: [
    { id: "w1-l1", name: "W1-L1 · First contact", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.5, maxSteps: 1, description: "Drag the structure block, pick the only action, and run it." },
    { id: "w1-l2", name: "W1-L2 · Step and reset", worldId: "w1", worldName: "Editor onboarding", difficulty: 1.8, maxSteps: 2, description: "Use step-by-step execution and reset to inspect a short two-action solution." },
    { id: "w1-l3", name: "W1-L3 · Description, blocks, and output", worldId: "w1", worldName: "Editor onboarding", difficulty: 2.1, maxSteps: 2, description: "Read the level description, open the left palette, and use output feedback to finish the level." },
    { id: "w2-l1", name: "W2-L1 · Stack top transfer", worldId: "w2", worldName: "Stack Towers", difficulty: 1.8, maxSteps: 2, description: "Introduce LIFO by moving the top value from one stack to another." },
    { id: "w2-l2", name: "W2-L2 · Build target stack", worldId: "w2", worldName: "Stack Towers", difficulty: 2.2, maxSteps: 4, description: "Build a target stack while respecting LIFO order." },
    { id: "w2-l3", name: "W2-L3 · Uncover and restore", worldId: "w2", worldName: "Stack Towers", difficulty: 2.6, maxSteps: 8, description: "Use an auxiliary stack to uncover a hidden value and then restore the main stack." },
    { id: "w2-l4", name: "W2-L4 · Verify before moving", worldId: "w2", worldName: "Stack Towers", difficulty: 3.2, maxSteps: 8, description: "Introduce a simple conditional to verify the stack top before transferring it." },
    { id: "w3-l1", name: "W3-L1 · Front and rear", worldId: "w3", worldName: "Queue Routes", difficulty: 1.6, maxSteps: 2, description: "Introduce FIFO by taking from the front and placing at the rear." },
    { id: "w3-l2", name: "W3-L2 · Rotate without reversing", worldId: "w3", worldName: "Queue Routes", difficulty: 2.2, maxSteps: 4, description: "Rotate a queue by moving the front to the rear without reversing it." },
    { id: "w3-l3", name: "W3-L3 · While elements remain", worldId: "w3", worldName: "Queue Routes", difficulty: 3.6, maxSteps: 14, description: "Introduce a while loop using queue size as the stopping condition." },
    { id: "w3-l4", name: "W3-L4 · Reverse queue with helper stack", worldId: "w3", worldName: "Queue Routes", difficulty: 3.8, maxSteps: 12, description: "Combine FIFO and LIFO to reverse a queue using an auxiliary stack." },
    { id: "w4-l1", name: "W4-L1 · Build from both ends", worldId: "w4", worldName: "List Workshop", difficulty: 2.4, maxSteps: 6, description: "Introduce append and prepend as the basic advantage of a list." },
    { id: "w4-l2", name: "W4-L2 · Trim the edges", worldId: "w4", worldName: "List Workshop", difficulty: 2.9, maxSteps: 4, description: "Remove the first and last items while preserving the middle." },
    { id: "w4-l3", name: "W4-L3 · First list helper", worldId: "w4", worldName: "List Workshop", difficulty: 3.4, maxSteps: 8, description: "Introduce a tiny helper function to move a value from one list to another." },
    { id: "w4-l4", name: "W4-L4 · Reuse the helper", worldId: "w4", worldName: "List Workshop", difficulty: 4.1, maxSteps: 12, description: "Reuse the same helper to avoid duplicating the main routine." },
    { id: "w5-l1", name: "W5-L1 · Linear final boss", worldId: "w5", worldName: "Structure Final Trial", difficulty: 4.7, maxSteps: 16, description: "Integrate stack, queue, and list in one short final challenge." }
  ],
  es: [
    { id: "w1-l1", name: "W1-L1 · Primer contacto", worldId: "w1", worldName: "Familiarización con el editor", difficulty: 1.5, maxSteps: 1, description: "Arrastra el bloque de estructura, elige la única acción disponible y ejecútala." },
    { id: "w1-l2", name: "W1-L2 · Step y reset", worldId: "w1", worldName: "Familiarización con el editor", difficulty: 1.8, maxSteps: 2, description: "Usa la ejecución paso a paso y reinicio para inspeccionar una solución corta de dos acciones." },
    { id: "w1-l3", name: "W1-L3 · Descripción, bloques y salida", worldId: "w1", worldName: "Familiarización con el editor", difficulty: 2.1, maxSteps: 2, description: "Lee la descripción, abre la paleta izquierda y usa la salida para completar el nivel." },
    { id: "w2-l1", name: "W2-L1 · Transferencia de tope", worldId: "w2", worldName: "Las torres de pila", difficulty: 1.8, maxSteps: 2, description: "Introduce LIFO moviendo el valor superior de una pila a otra." },
    { id: "w2-l2", name: "W2-L2 · Construir pila objetivo", worldId: "w2", worldName: "Las torres de pila", difficulty: 2.2, maxSteps: 4, description: "Construye una pila objetivo respetando el orden LIFO." },
    { id: "w2-l3", name: "W2-L3 · Destapar y restaurar", worldId: "w2", worldName: "Las torres de pila", difficulty: 2.6, maxSteps: 8, description: "Usa una pila auxiliar para destapar un valor interno y luego restaurar la pila principal." },
    { id: "w2-l4", name: "W2-L4 · Verificar antes de mover", worldId: "w2", worldName: "Las torres de pila", difficulty: 3.2, maxSteps: 8, description: "Introduce un condicional simple para verificar el tope antes de transferirlo." },
    { id: "w3-l1", name: "W3-L1 · Frente y final", worldId: "w3", worldName: "Las rutas de cola", difficulty: 1.6, maxSteps: 2, description: "Introduce FIFO sacando del frente y colocando al final." },
    { id: "w3-l2", name: "W3-L2 · Rotar sin invertir", worldId: "w3", worldName: "Las rutas de cola", difficulty: 2.2, maxSteps: 4, description: "Rota una cola moviendo el frente al final sin invertirla." },
    { id: "w3-l3", name: "W3-L3 · Mientras queden elementos", worldId: "w3", worldName: "Las rutas de cola", difficulty: 3.6, maxSteps: 14, description: "Introduce `while` usando el tamaño de una cola como condición de parada." },
    { id: "w3-l4", name: "W3-L4 · Invertir cola con pila auxiliar", worldId: "w3", worldName: "Las rutas de cola", difficulty: 3.8, maxSteps: 12, description: "Combina FIFO y LIFO para invertir una cola usando una pila auxiliar." },
    { id: "w4-l1", name: "W4-L1 · Construir desde extremos", worldId: "w4", worldName: "El taller de listas", difficulty: 2.4, maxSteps: 6, description: "Introduce append y prepend como ventaja básica de la lista." },
    { id: "w4-l2", name: "W4-L2 · Recorte de bordes", worldId: "w4", worldName: "El taller de listas", difficulty: 2.9, maxSteps: 4, description: "Quita el primer y último elemento conservando el interior." },
    { id: "w4-l3", name: "W4-L3 · Primer helper sobre lista", worldId: "w4", worldName: "El taller de listas", difficulty: 3.4, maxSteps: 8, description: "Introduce una función helper pequeña para mover un valor entre listas." },
    { id: "w4-l4", name: "W4-L4 · Reusar helper para cerrar", worldId: "w4", worldName: "El taller de listas", difficulty: 4.1, maxSteps: 12, description: "Reutiliza el mismo helper para evitar duplicar la rutina principal." },
    { id: "w5-l1", name: "W5-L1 · Final boss lineal", worldId: "w5", worldName: "La prueba final de estructuras", difficulty: 4.7, maxSteps: 16, description: "Integra stack, queue y list en un reto final corto." }
  ]
};

export const getCampaignScreenCopy = (language = getAppLanguage()): CampaignScreenCopy =>
  CAMPAIGN_SCREEN_COPY[language];

export const getCampaignPlanTemplates = (language = getAppLanguage()): CampaignPlanTemplate[] =>
  CAMPAIGN_PLAN_TEMPLATES_BY_LANGUAGE[language];
