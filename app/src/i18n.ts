import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "visual-data-structures-language";

const resources = {
  en: {
    translation: {
      appTitle: "Data Structure Tool",
      language: "Language",
      languages: {
        en: "English",
        es: "Español"
      },
      menu: {
        campaign: "Campaign Mode",
        community: "Community Levels",
        editor: "Level Editor"
      },
      common: {
        back: "Back",
        levels: "Levels",
        loadingLevel: "Loading level",
        playMode: "Play Mode",
        goal: "Goal",
        maxSteps: "Max Steps",
        previewResult: "Preview Result",
        showLevelInfo: "Show level info",
        hideLevelInfo: "Hide level info",
        solvePuzzle: "Solve the puzzle.",
        variables: "Variables",
        empty: "Empty",
        noVariables: "No variables yet",
        items: "items",
        more: "more"
      },
      actions: {
        play: "Play",
        step: "Step",
        pause: "Pause",
        reset: "Reset",
        clear: "Clear"
      },
      state: {
        run: "RUN",
        edit: "EDIT",
        done: "DONE",
        live: "LIVE"
      },
      board: {
        programConsole: "Program Console",
        playBoard: "Play Board",
        executionFeed: "Execution Feed",
        output: "Output",
        blocksCount: "{{count}}/{{max}} blocks",
        runHint: "Run your program to watch operations appear here.",
        feedHint: "Run your program to watch the data move."
      },
      editor: {
        blocks: "Blocks",
        dragHint: "Drag a structure block into the editor.",
        program: "Program",
        buildHint: "Build your sequence here.",
        groupStructures: "Structures",
        groupValues: "Values",
        groupLogic: "Logic",
        groupFunctions: "Functions",
        groupVariables: "Variables",
        routineName: "Routine name",
        renameRoutine: "Rename routine",
        routineDefault: "routine",
        functionDefault: "function"
      },
      structures: {
        stack: "Stack",
        queue: "Queue",
        list: "Singly Linked List",
        dataStructure: "Data Structure",
        variablesShort: "Vars"
      },
      blocks: {
        conditional: "Conditional",
        if: "If",
        while: "While",
        return: "Return",
        declaration: "Declaration",
        variable: "Variable",
        value: "Value",
        text: "Text",
        function: "Function"
      },
      bindings: {
        declare: "declare",
        expect: "expect"
      },
      operations: {
        POP: "pop",
        PUSH: "push",
        DEQUEUE: "dequeue",
        ENQUEUE: "enqueue",
        APPEND: "append",
        PREPEND: "prepend",
        REMOVE_FIRST: "remove_first",
        REMOVE_LAST: "remove_last",
        GET_HEAD: "get_head",
        GET_TAIL: "get_tail",
        SIZE: "size"
      }
    }
  },
  es: {
    translation: {
      appTitle: "Herramienta de Estructuras de Datos",
      language: "Idioma",
      languages: {
        en: "English",
        es: "Español"
      },
      menu: {
        campaign: "Modo Campaña",
        community: "Niveles de la Comunidad",
        editor: "Editor de Niveles"
      },
      common: {
        back: "Volver",
        levels: "Niveles",
        loadingLevel: "Cargando nivel",
        playMode: "Modo de Juego",
        goal: "Meta",
        maxSteps: "Máx. pasos",
        previewResult: "Previsualizar resultado",
        showLevelInfo: "Mostrar información del nivel",
        hideLevelInfo: "Ocultar información del nivel",
        solvePuzzle: "Resuelve el desafío.",
        variables: "Variables",
        empty: "Vacío",
        noVariables: "Aún no hay variables",
        items: "elementos",
        more: "más"
      },
      actions: {
        play: "Ejecutar",
        step: "Paso",
        pause: "Pausa",
        reset: "Reiniciar",
        clear: "Limpiar"
      },
      state: {
        run: "RUN",
        edit: "EDITAR",
        done: "LISTO",
        live: "ACTIVO"
      },
      board: {
        programConsole: "Consola del Programa",
        playBoard: "Tablero de Ejecución",
        executionFeed: "Registro de Ejecución",
        output: "Salida",
        blocksCount: "{{count}}/{{max}} bloques",
        runHint: "Ejecuta tu programa para ver las operaciones aquí.",
        feedHint: "Ejecuta tu programa para ver cómo se mueven los datos."
      },
      editor: {
        blocks: "Bloques",
        dragHint: "Arrastra una estructura de datos al editor.",
        program: "Programa",
        buildHint: "Construye tu secuencia aquí.",
        groupStructures: "Estructuras",
        groupValues: "Valores",
        groupLogic: "Lógica",
        groupFunctions: "Funciones",
        groupVariables: "Variables",
        routineName: "Nombre de la viñeta",
        renameRoutine: "Renombrar viñeta",
        routineDefault: "viñeta",
        functionDefault: "función"
      },
      structures: {
        stack: "Pila",
        queue: "Cola",
        list: "Lista simplemente enlazada",
        dataStructure: "Estructura de datos",
        variablesShort: "Vars"
      },
      blocks: {
        conditional: "Condicional",
        if: "Si",
        while: "Mientras",
        return: "Retorno",
        declaration: "Declaración",
        variable: "Variable",
        value: "Valor",
        text: "Texto",
        function: "Función"
      },
      bindings: {
        declare: "declarar",
        expect: "esperar"
      },
      operations: {
        POP: "desapilar",
        PUSH: "apilar",
        DEQUEUE: "desencolar",
        ENQUEUE: "encolar",
        APPEND: "agregar_final",
        PREPEND: "agregar_inicio",
        REMOVE_FIRST: "eliminar_primero",
        REMOVE_LAST: "eliminar_último",
        GET_HEAD: "obtener_cabeza",
        GET_TAIL: "obtener_cola",
        SIZE: "tamaño"
      }
    }
  }
} as const;

const detectLanguage = () => {
  const storedLanguage =
    typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
  if (storedLanguage === "es" || storedLanguage === "en") {
    return storedLanguage;
  }

  if (typeof navigator !== "undefined") {
    return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  }

  return "en";
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });
}

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
});

export type SupportedLanguage = "en" | "es";

export const setAppLanguage = async (language: SupportedLanguage) => {
  await i18n.changeLanguage(language);
};

export const getAppLanguage = (): SupportedLanguage => (i18n.language.startsWith("es") ? "es" : "en");

export { i18n };
