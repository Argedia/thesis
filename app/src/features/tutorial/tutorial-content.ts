import { getAppLanguage, type SupportedLanguage } from "../../i18n";

type TutorialTextStep = {
  title: string;
  description: string;
};

type TutorialText = {
  label: string;
  steps: Record<string, TutorialTextStep>;
};

type TutorialTextMap = Record<string, TutorialText>;

const TUTORIAL_TEXT_BY_LANGUAGE: Record<SupportedLanguage, TutorialTextMap> = {
  en: {
    "app-home-basics": {
      label: "App home basics",
      steps: {
        "home-menu-card": {
          title: "Main entry point",
          description: "This is the main menu. From here you choose how you want to use the software."
        },
        "home-menu-campaign": {
          title: "Campaign Mode",
          description: "Campaign is the guided path. It is the best place to start, and you should try it first until you get familiar with the software."
        },
        "home-menu-community": {
          title: "Community Levels",
          description: "Community Levels let you explore and play existing levels more freely, without following the campaign order."
        },
        "home-menu-editor": {
          title: "Level Editor",
          description: "The Level Editor is where you build, test, and publish your own levels once you are comfortable with the tool."
        },
        "app-help-fab": {
          title: "Need help again?",
          description: "You can always click this ? button to replay the guide and get help later."
        }
      }
    },
    "community-basics": {
      label: "Community levels basics",
      steps: {
        "community-search": {
          title: "Find a level",
          description: "Use search, import, and sorting here to find the kind of level you want to play."
        },
        "community-filters": {
          title: "Filter the catalog",
          description: "These filters narrow the list by source, structure, difficulty, and completion state."
        },
        "community-level-list": {
          title: "Choose a level",
          description: "Select any card in the catalog to inspect it before playing."
        },
        "community-preview-play": {
          title: "Execute the selected level",
          description: "After selecting a level, review its preview here and press Play to open and execute that level."
        }
      }
    },
    "editor-drafts-basics": {
      label: "Editor drafts basics",
      steps: {
        "editor-drafts-topbar": {
          title: "Editor entry point",
          description: "This screen manages your saved level drafts and campaign scaffolds."
        },
        "editor-drafts-actions": {
          title: "Create or scaffold",
          description: "Use these actions to create a new level or generate the planned campaign draft structure."
        },
        "editor-drafts-list": {
          title: "Open existing drafts",
          description: "Each card is a saved level draft. Open one to continue editing or remove it if you no longer need it."
        }
      }
    },
    "settings-basics": {
      label: "Settings basics",
      steps: {
        "settings-preferences": {
          title: "Preferences",
          description: "Here you control language and other shared interface preferences."
        },
        "settings-execution": {
          title: "Execution speed",
          description: "Adjust the visible runtime speed to make step-by-step behavior easier or faster to inspect."
        },
        "settings-local-data": {
          title: "Local data management",
          description: "These actions export, import, or clear local progress, drafts, and preferences stored in the browser."
        }
      }
    },
    "campaign-w1-l1-guided": {
      label: "Campaign W1-L1 guided",
      steps: {
        "w1-l1-intro-stack": {
          title: "Meet your stack",
          description: "You have a stack here, and it contains 1 element. Click anywhere on this board to continue."
        },
        "w1-l1-show-goal": {
          title: "Show the goal board",
          description: "Click this button to switch the board and see the goal state you want to reach."
        },
        "w1-l1-goal-explained": {
          title: "This is the goal",
          description: "Look, the stack looks empty. So the goal of this level is to empty the stack. Click anywhere to continue."
        },
        "w1-l1-show-current": {
          title: "Show your current board again",
          description: "Click the same button again to return to the current board. You will compare both views often while solving levels."
        },
        "w1-l1-program-area": {
          title: "This is your program area",
          description: "This big area is where you build the solution for the level by placing blocks. Click anywhere to continue."
        },
        "w1-l1-palette-structure": {
          title: "This is your structures panel",
          description: "This side panel shows the structure blocks you can use in this level. Click anywhere to continue."
        },
        "w1-l1-place-structure": {
          title: "Place stack A in the program",
          description: "Now drag stack block A from this panel into the program area."
        },
        "w1-l1-choose-operation": {
          title: "Choose the stack action",
          description: "Click the small action button on block A and choose the only operation available. Tip: you can collapse the Context zone."
        },
        "w1-l1-run-controls": {
          title: "This is the control board",
          description: "This is the control board. It lets us run the little program we just made with the blocks. Click anywhere to continue."
        },
        "w1-l1-run-program": {
          title: "Play will do for now",
          description: "Play will do for now, so click it to solve the level."
        },
        "w1-l1-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-w1-l2-guided": {
      label: "Campaign W1-L2 guided",
      steps: {
        "w1-l2-intro": {
          title: "Now you will debug step by step",
          description: "Stack A starts with 2 elements. The goal is to empty it by repeating the same move twice. Click anywhere on this board to continue."
        },
        "w1-l2-place-two-stacks": {
          title: "Place stack A twice",
          description: "Drag stack block A into the program area two times. This level needs two short actions, so you will place the same structure block twice."
        },
        "w1-l2-choose-pop-twice": {
          title: "Choose the stack action on both blocks",
          description: "Open the small action button on each stack block and choose the only operation available. Both blocks should perform the same move."
        },
        "w1-l2-step-once": {
          title: "Use Step to inspect the first move",
          description: "Click Step. It runs only one action, so you can inspect the intermediate state before the solution is finished."
        },
        "w1-l2-step-result": {
          title: "This is an intermediate state",
          description: "After one Step, the stack is not solved yet. One element remains, and that is exactly why Step is useful for debugging. Click anywhere to continue."
        },
        "w1-l2-reset": {
          title: "Reset brings the board back",
          description: "Click Reset to restore the original board and try again from the beginning whenever you need to."
        },
        "w1-l2-finish": {
          title: "Now finish the level",
          description: "The board is back at the start. Click Play to run the short program again and finish the level."
        },
        "w1-l2-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-w1-l3-guided": {
      label: "Campaign W1-L3 guided",
      steps: {
        "w1-l3-read-description": {
          title: "Read the level description first",
          description: "This description explains what the level wants. Here it tells you that queue A must receive the literal item. Click anywhere to continue."
        },
        "w1-l3-place-queue": {
          title: "Place queue A in the program",
          description: "You already know this panel from level 1. Drag queue block A into the program area so we can give it an action."
        },
        "w1-l3-choose-enqueue": {
          title: "Choose the queue action",
          description: "Open the action button on queue A and choose the only operation available. This level wants you to insert one value into the queue."
        },
        "w1-l3-run-incomplete": {
          title: "Try running it once",
          description: "Click Play now. The action is still missing a value, and the output area will help you see that."
        },
        "w1-l3-output-feedback": {
          title: "Read the output when something is missing",
          description: "This output area gives feedback about the program. When a level does not run correctly, read this area before guessing. Click anywhere to continue."
        },
        "w1-l3-left-palette": {
          title: "This is the left block palette",
          description: "The left palette contains general blocks. In this level, the Literal block is inside Expressions. Click Expressions now to open it."
        },
        "w1-l3-place-literal": {
          title: "Insert the literal into the queue action",
          description: "Drag the literal block from the left palette into the empty value slot of the enqueue action."
        },
        "w1-l3-finish": {
          title: "Run the completed solution",
          description: "Now the queue action has its value. Click Play again to solve the level."
        },
        "w1-l3-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-world-basics": {
      label: "Campaign world basics",
      steps: {
        "campaign-world-strip": {
          title: "World progression",
          description: "These nodes switch between worlds. Each world unlocks after finishing the previous one."
        },
        "campaign-map-shell": {
          title: "Move through the map",
          description: "Click an unlocked level to move there. Then use the side panel or click the same level again to start playing."
        },
        "campaign-sidepanel": {
          title: "Level details",
          description: "This panel shows the current level information and lets you press Play when you are ready."
        }
      }
    }
  },
  es: {
    "app-home-basics": {
      label: "Conceptos básicos del inicio",
      steps: {
        "home-menu-card": {
          title: "Punto de entrada principal",
          description: "Este es el menú principal. Desde aquí eliges cómo quieres usar el software."
        },
        "home-menu-campaign": {
          title: "Modo Campaña",
          description: "Campaña es la ruta guiada. Es el mejor lugar para empezar y conviene probarla primero hasta familiarizarte con el software."
        },
        "home-menu-community": {
          title: "Niveles de la comunidad",
          description: "Los niveles de la comunidad te permiten explorar y jugar niveles existentes con más libertad, sin seguir el orden de la campaña."
        },
        "home-menu-editor": {
          title: "Editor de niveles",
          description: "El editor de niveles es donde construyes, pruebas y publicas tus propios niveles cuando ya te sientes cómodo con la herramienta."
        },
        "app-help-fab": {
          title: "¿Necesitas ayuda otra vez?",
          description: "Siempre puedes hacer clic en este botón ? para repetir la guía y volver a recibir ayuda más tarde."
        }
      }
    },
    "community-basics": {
      label: "Conceptos básicos de comunidad",
      steps: {
        "community-search": {
          title: "Encuentra un nivel",
          description: "Usa la búsqueda, importación y ordenamiento de aquí para encontrar el tipo de nivel que quieres jugar."
        },
        "community-filters": {
          title: "Filtra el catálogo",
          description: "Estos filtros reducen la lista por origen, estructura, dificultad y estado de completado."
        },
        "community-level-list": {
          title: "Elige un nivel",
          description: "Selecciona cualquier tarjeta del catálogo para inspeccionarla antes de jugar."
        },
        "community-preview-play": {
          title: "Ejecuta el nivel seleccionado",
          description: "Después de seleccionar un nivel, revisa su vista previa aquí y pulsa Jugar para abrirlo."
        }
      }
    },
    "editor-drafts-basics": {
      label: "Conceptos básicos de borradores",
      steps: {
        "editor-drafts-topbar": {
          title: "Punto de entrada del editor",
          description: "Esta pantalla gestiona tus borradores guardados y las plantillas base de campaña."
        },
        "editor-drafts-actions": {
          title: "Crear o generar base",
          description: "Usa estas acciones para crear un nivel nuevo o generar la estructura planificada de la campaña."
        },
        "editor-drafts-list": {
          title: "Abrir borradores existentes",
          description: "Cada tarjeta es un borrador guardado. Abre uno para seguir editando o elimínalo si ya no lo necesitas."
        }
      }
    },
    "settings-basics": {
      label: "Conceptos básicos de ajustes",
      steps: {
        "settings-preferences": {
          title: "Preferencias",
          description: "Aquí controlas el idioma y otras preferencias compartidas de la interfaz."
        },
        "settings-execution": {
          title: "Velocidad de ejecución",
          description: "Ajusta la velocidad visible de ejecución para inspeccionar el comportamiento paso a paso con más calma o más rapidez."
        },
        "settings-local-data": {
          title: "Gestión de datos locales",
          description: "Estas acciones exportan, importan o limpian el progreso, los borradores y las preferencias guardadas en el navegador."
        }
      }
    },
    "campaign-w1-l1-guided": {
      label: "Campaña W1-L1 guiada",
      steps: {
        "w1-l1-intro-stack": {
          title: "Conoce tu pila",
          description: "Aquí tienes una pila y contiene 1 elemento. Haz clic en cualquier parte de este tablero para continuar."
        },
        "w1-l1-show-goal": {
          title: "Muestra el tablero objetivo",
          description: "Haz clic en este botón para cambiar el tablero y ver el estado objetivo que quieres alcanzar."
        },
        "w1-l1-goal-explained": {
          title: "Esta es la meta",
          description: "Mira, la pila aparece vacía. Entonces la meta de este nivel es vaciar la pila. Haz clic en cualquier parte para continuar."
        },
        "w1-l1-show-current": {
          title: "Vuelve a tu tablero actual",
          description: "Haz clic otra vez en el mismo botón para volver al tablero actual. Compararás ambas vistas con frecuencia mientras resuelves niveles."
        },
        "w1-l1-program-area": {
          title: "Esta es tu área de programa",
          description: "Esta área grande es donde construyes la solución del nivel colocando bloques. Haz clic en cualquier parte para continuar."
        },
        "w1-l1-palette-structure": {
          title: "Este es tu panel de estructuras",
          description: "Este panel lateral muestra los bloques de estructura que puedes usar en este nivel. Haz clic en cualquier parte para continuar."
        },
        "w1-l1-place-structure": {
          title: "Coloca la pila A en el programa",
          description: "Ahora arrastra el bloque de pila A desde este panel hacia el área del programa."
        },
        "w1-l1-choose-operation": {
          title: "Elige la acción de la pila",
          description: "Haz clic en el pequeño botón de acción del bloque A y elige la única operación disponible. Consejo: puedes contraer la zona Contexto."
        },
        "w1-l1-run-controls": {
          title: "Este es el panel de control",
          description: "Este es el panel de control. Nos permite ejecutar el pequeño programa que acabamos de construir con bloques. Haz clic en cualquier parte para continuar."
        },
        "w1-l1-run-program": {
          title: "Por ahora basta con Jugar",
          description: "Por ahora basta con Jugar, así que haz clic ahí para resolver el nivel."
        },
        "w1-l1-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-w1-l2-guided": {
      label: "Campaña W1-L2 guiada",
      steps: {
        "w1-l2-intro": {
          title: "Ahora depurarás paso a paso",
          description: "La pila A empieza con 2 elementos. La meta es vaciarla repitiendo el mismo movimiento dos veces. Haz clic en cualquier parte de este tablero para continuar."
        },
        "w1-l2-place-two-stacks": {
          title: "Coloca la pila A dos veces",
          description: "Arrastra el bloque de pila A al área del programa dos veces. Este nivel necesita dos acciones cortas, así que colocarás el mismo bloque de estructura dos veces."
        },
        "w1-l2-choose-pop-twice": {
          title: "Elige la acción de pila en ambos bloques",
          description: "Abre el pequeño botón de acción de cada bloque de pila y elige la única operación disponible. Ambos bloques deben realizar el mismo movimiento."
        },
        "w1-l2-step-once": {
          title: "Usa Paso para inspeccionar el primer movimiento",
          description: "Haz clic en Paso. Ejecuta solo una acción, así que puedes inspeccionar el estado intermedio antes de que la solución termine."
        },
        "w1-l2-step-result": {
          title: "Este es un estado intermedio",
          description: "Después de un Paso, la pila todavía no está resuelta. Queda un elemento, y precisamente por eso Paso es útil para depurar. Haz clic en cualquier parte para continuar."
        },
        "w1-l2-reset": {
          title: "Reiniciar devuelve el tablero",
          description: "Haz clic en Reiniciar para restaurar el tablero original y volver a intentarlo desde el comienzo cada vez que lo necesites."
        },
        "w1-l2-finish": {
          title: "Ahora termina el nivel",
          description: "El tablero volvió al inicio. Haz clic en Jugar para correr otra vez el programa corto y terminar el nivel."
        },
        "w1-l2-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-w1-l3-guided": {
      label: "Campaña W1-L3 guiada",
      steps: {
        "w1-l3-read-description": {
          title: "Lee primero la descripción del nivel",
          description: "Esta descripción explica lo que quiere el nivel. Aquí te dice que la cola A debe recibir el elemento literal. Haz clic en cualquier parte para continuar."
        },
        "w1-l3-place-queue": {
          title: "Coloca la cola A en el programa",
          description: "Ya conoces este panel desde el nivel 1. Arrastra el bloque de cola A al área del programa para poder darle una acción."
        },
        "w1-l3-choose-enqueue": {
          title: "Elige la acción de la cola",
          description: "Abre el botón de acción de la cola A y elige la única operación disponible. Este nivel quiere que insertes un valor en la cola."
        },
        "w1-l3-run-incomplete": {
          title: "Intenta ejecutarlo una vez",
          description: "Haz clic en Jugar ahora. A la acción todavía le falta un valor, y el área de salida te ayudará a verlo."
        },
        "w1-l3-output-feedback": {
          title: "Lee la salida cuando falte algo",
          description: "Esta área de salida da retroalimentación sobre el programa. Cuando un nivel no corre correctamente, lee esta zona antes de adivinar. Haz clic en cualquier parte para continuar."
        },
        "w1-l3-left-palette": {
          title: "Esta es la paleta izquierda",
          description: "La paleta izquierda contiene bloques generales. En este nivel, el bloque Literal está dentro de Expresiones. Haz clic ahora en Expresiones para abrirlo."
        },
        "w1-l3-place-literal": {
          title: "Inserta el literal en la acción de la cola",
          description: "Arrastra el bloque literal desde la paleta izquierda hasta el slot de valor vacío de la acción enqueue."
        },
        "w1-l3-finish": {
          title: "Ejecuta la solución completa",
          description: "Ahora la acción de la cola ya tiene su valor. Haz clic otra vez en Jugar para resolver el nivel."
        },
        "w1-l3-executing": {
          title: "",
          description: ""
        }
      }
    },
    "campaign-world-basics": {
      label: "Conceptos básicos del mapa de campaña",
      steps: {
        "campaign-world-strip": {
          title: "Progresión por mundos",
          description: "Estos nodos cambian entre mundos. Cada mundo se desbloquea al terminar el anterior."
        },
        "campaign-map-shell": {
          title: "Muévete por el mapa",
          description: "Haz clic en un nivel desbloqueado para moverte allí. Luego usa el panel lateral o vuelve a hacer clic en el mismo nivel para empezar a jugar."
        },
        "campaign-sidepanel": {
          title: "Detalles del nivel",
          description: "Este panel muestra la información del nivel actual y te permite pulsar Jugar cuando estés listo."
        }
      }
    }
  }
};

export const getTutorialText = (tutorialId: string, language = getAppLanguage()): TutorialText =>
  TUTORIAL_TEXT_BY_LANGUAGE[language][tutorialId];
