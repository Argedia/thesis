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
				menuLabel: "Menu",
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
				object: "Object",
				empty: "Empty",
				noVariables: "No variables yet",
				items: "items",
				more: "more",
				ok: "OK",
				cancel: "Cancel",
				save: "Save",
				notice: "Notice"
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
			preview: {
				findFunToPlay: "Find something fun to play.",
				searchLevels: "Search levels...",
				importLevel: "Import Level",
				sortNewest: "Newest",
				sortDifficulty: "Difficulty",
				sortTitle: "Title",
				levelSource: "Level Source",
				structuresUsed: "Structures Used",
				difficulty: "Difficulty",
				completion: "Completion",
				levelPreview: "Level Preview",
				noLevelsFound: "No levels found",
				communityBuilder: "Community Builder",
				noLevelsHint: "Try a different search or clear some filters.",
				readyToPlay: "Ready to play",
				communityChallenge: "A community-made challenge.",
				source: {
					all: "All",
					community: "Community",
					"my-levels": "My Levels"
				},
				difficultyOption: {
					easy: "Easy",
					medium: "Medium",
					hard: "Hard"
				},
				completionOption: {
					all: "All",
					completed: "Completed",
					notCompleted: "Not completed",
					pending: "Pending"
				},
				showInitialState: "Show Initial State",
				hideInitialState: "Hide Initial State",
				showGoalState: "Show Goal State",
				hideGoalState: "Hide Goal State",
				showConstraints: "Show Constraints",
				hideConstraints: "Hide Constraints",
				constraintsSummary: "Steps: {{steps}} · Ops: {{operations}}",
				selectLevelToSeeDetails: "Select a level to see details."
			},
			editor: {
				blocks: "",
				dragHint: "",
				program: "Program",
				buildHint: "Build your sequence here.",
				emptyBuildHint: "Drag blocks here to start",
				groupStructures: "Structures",
				groupValues: "Values",
				groupExpressions: "Expressions",
				groupLogic: "Control Flow",
				groupFunctions: "Functions",
				groupTypes: "Types & Structures",
				groupVariables: "Variables",
				groupVariableBlocks: "Blocks",
				groupDeclaredVariables: "Declared",
				groupScopeGlobal: "Global scope",
				groupScopeRoutine: "Routine scope",
				paletteLaneBase: "Base",
				paletteLaneScope: "Vars",
				paletteLaneCreated: "Definitions",
				paletteLaneEmpty: "Nothing here yet.",
				functionTypeExclusiveHint: "Only one type or function is allowed per routine.",
				variableNamePrompt: "Variable name",
				scopeVariablePrompt: "Choose variable",
				variableTypePrompt: "Choose variable type",
				referenceTargetPrompt: "Reference target",
				valuePrompt: "Value",
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
				definition: "Definition",
				type: "Type",
				typeDefinition: "Type Definition",
				typeInstance: "New Type Instance",
				fieldRead: "Field Access",
				fieldAssign: "Field Assignment",
				field: "field",
				conditional: "Conditional",
				if: "If",
				while: "While",
				forEach: "For each",
				break: "Break",
				literal: "Literal",
				arithmeticOperator: "Arithmetic Operator",
				logicalOperator: "Logical Operator",
				comparisonOperator: "Comparison Operator",
				return: "Return",
				declaration: "Declaration",
				assign: "Assignment",
				read: "Read",
				reference: "Reference",
				referenceTo: "reference to",
				variable: "Variable",
				operation: "Operation",
				value: "Number",
				text: "Text",
				boolean: "Boolean",
				function: "Function"
			},
			bindings: {
				declare: "declare",
				expect: "expect"
			},
			messages: {
				variableNameEmpty: "Variable name cannot be empty.",
				variableNameExists: "Variable \"{{name}}\" already exists.",
				valueEmpty: "Value cannot be empty.",
				routineNameEmpty: "Routine name cannot be empty.",
				functionTypeConflict: "A routine cannot be both a function and a type.",
				returnInTypeRoutine: "Type routines cannot return values.",
				unknownType: "Unknown type.",
				unknownTypeField: "Unknown type field.",
				typeMismatch: "Type mismatch.",
				typeMismatchAssign: "Invalid assignment type.",
				typeMismatchFieldAssign: "Invalid field assignment type.",
				typeMismatchExpectArg: "Argument type does not match expected parameter type."
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
				menuLabel: "Menú",
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
				object: "Objeto",
				empty: "Vacío",
				noVariables: "Aún no hay variables",
				items: "elementos",
				more: "más",
				ok: "Aceptar",
				cancel: "Cancelar",
				save: "Guardar",
				notice: "Aviso"
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
			preview: {
				findFunToPlay: "Encuentra algo divertido para jugar.",
				searchLevels: "Buscar niveles...",
				importLevel: "Importar nivel",
				sortNewest: "Más recientes",
				sortDifficulty: "Dificultad",
				sortTitle: "Título",
				levelSource: "Fuente del nivel",
				structuresUsed: "Estructuras usadas",
				difficulty: "Dificultad",
				completion: "Completado",
				levelPreview: "Vista previa del nivel",
				noLevelsFound: "No se encontraron niveles",
				communityBuilder: "Creador de la comunidad",
				noLevelsHint: "Prueba otra búsqueda o limpia algunos filtros.",
				readyToPlay: "Listo para jugar",
				communityChallenge: "Un desafío creado por la comunidad.",
				source: {
					all: "Todos",
					community: "Comunidad",
					"my-levels": "Mis niveles"
				},
				difficultyOption: {
					easy: "Fácil",
					medium: "Intermedio",
					hard: "Difícil"
				},
				completionOption: {
					all: "Todos",
					completed: "Completados",
					notCompleted: "No completados",
					pending: "Pendiente"
				},
				showInitialState: "Mostrar estado inicial",
				hideInitialState: "Ocultar estado inicial",
				showGoalState: "Mostrar estado objetivo",
				hideGoalState: "Ocultar estado objetivo",
				showConstraints: "Mostrar restricciones",
				hideConstraints: "Ocultar restricciones",
				constraintsSummary: "Pasos: {{steps}} · Ops: {{operations}}",
				selectLevelToSeeDetails: "Selecciona un nivel para ver detalles."
			},
			editor: {
				blocks: "",
				dragHint: "",
				program: "Programa",
				buildHint: "Construye tu secuencia aquí.",
				emptyBuildHint: "Arrastra bloques aqui para comenzar",
				groupStructures: "Estructuras",
				groupValues: "Valores",
				groupExpressions: "Expresiones",
				groupLogic: "Control de Flujo",
				groupFunctions: "Funciones",
				groupTypes: "Tipos y estructuras",
				groupVariables: "Variables",
				groupVariableBlocks: "Bloques",
				groupDeclaredVariables: "Declaradas",
				groupScopeGlobal: "Scope global",
				groupScopeRoutine: "Scope de rutina",
				paletteLaneBase: "Base",
				paletteLaneScope: "Vars",
				paletteLaneCreated: "Definiciones",
				paletteLaneEmpty: "Todavía no hay nada aquí.",
				functionTypeExclusiveHint: "Por viñeta solo puede haber 1 tipo o función",
				variableNamePrompt: "Nombre de variable",
				scopeVariablePrompt: "Elegir variable",
				variableTypePrompt: "Elegir tipo de variable",
				referenceTargetPrompt: "Objetivo de referencia",
				valuePrompt: "Valor",
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
				definition: "Definición",
				type: "Tipo",
				typeDefinition: "Definición de tipo",
				typeInstance: "Nueva instancia de tipo",
				fieldRead: "Acceso a campo",
				fieldAssign: "Asignación de campo",
				field: "campo",
				conditional: "Condicional",
				if: "Si",
				while: "Mientras",
				forEach: "Para cada",
				break: "Romper",
				literal: "Literal",
				arithmeticOperator: "Operador aritmético",
				logicalOperator: "Operador lógico",
				comparisonOperator: "Operador de comparación",
				return: "Retorno",
				declaration: "Declaración",
				assign: "Asignación",
				read: "Lectura",
				reference: "Referencia",
				referenceTo: "referencia a",
				variable: "Variable",
				operation: "Operación",
				value: "Número",
				text: "Texto",
				boolean: "Booleano",
				function: "Función"
			},
			bindings: {
				declare: "declarar",
				expect: "esperar"
			},
			messages: {
				variableNameEmpty: "El nombre de la variable no puede estar vacío.",
				variableNameExists: "La variable \"{{name}}\" ya existe.",
				valueEmpty: "El valor no puede estar vacío.",
				routineNameEmpty: "El nombre de la viñeta no puede estar vacío.",
				functionTypeConflict: "Una viñeta no puede ser función y tipo a la vez.",
				returnInTypeRoutine: "Una viñeta de tipo no permite retornos.",
				unknownType: "Tipo desconocido.",
				unknownTypeField: "Campo de tipo desconocido.",
				typeMismatch: "Incompatibilidad de tipos.",
				typeMismatchAssign: "Tipo inválido en asignación.",
				typeMismatchFieldAssign: "Tipo inválido en asignación de campo.",
				typeMismatchExpectArg: "El tipo del argumento no coincide con el parámetro esperado."
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
