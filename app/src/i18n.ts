import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGE_STORAGE_KEY } from "./features/settings/local-storage-keys";

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
				editor: "Level Editor",
				settings: "Settings"
			},
			settings: {
				title: "Settings",
				sharedSettings: "Shared Settings",
				preferences: "Preferences",
				interface: "Interface",
				execution: "Execution",
				localData: "Local Data",
				resetLayout: "Reset panel layout",
				lineDelayMs: "Run delay (ms per block)",
				localDataStatus: "Saved local data",
				localDataStatusDetail: "drafts {{drafts}}, progress {{progress}}, levels {{levels}}",
				exportBackup: "Export local backup",
				importBackup: "Import local backup",
				clearProgress: "Clear progress",
				clearDrafts: "Clear editor drafts",
				resetAllLocalData: "Reset all local data",
				yes: "Yes",
				no: "No",
				confirmResetLayout: "Reset saved panel layout?",
				statusLayoutReset: "Interface layout reset. Reload to apply across all views.",
				statusSpeedUpdated: "Speed updated: {{ms}} ms per visible block.",
				statusBackupExported: "Local backup exported.",
				errorInvalidBackup: "Invalid backup format.",
				confirmImportBackup: "Importing a backup will overwrite local settings. Continue?",
				statusBackupImported: "Backup imported. Reload to apply fully.",
				errorImportFailed: "Could not import the backup.",
				confirmClearProgress: "Delete completed level progress?",
				statusProgressCleared: "Progress cleared.",
				confirmClearDrafts: "Delete all editor drafts?",
				statusDraftsCleared: "Drafts cleared.",
				confirmResetAll: "This will delete progress, drafts, imported levels, and preferences. Continue?",
				statusAllReset: "Local data reset."
			},
			common: {
				back: "Back",
				menu: "Menu",
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
				delete: "Delete",
				notice: "Notice",
				nextLevel: "Next Level",
				hideResult: "Hide Result",
				levelInfo: "Level Info",
				author: "Author",
				description: "Description",
				id: "ID",
				type: "Type",
				initial: "Initial",
				target: "Target",
				published: "Published",
				draft: "Draft"
			},
			actions: {
				play: "Play",
				step: "Step",
				pause: "Pause",
				stop: "Stop",
				reset: "Reset",
				clear: "Clear",
				addScript: "Add script"
			},
			tutorials: {
				common: {
					next: "Next",
					back: "Back",
					close: "Close"
				},
				editorBasics: {
					label: "Editor basics",
					steps: {
						actions: {
							title: "Top actions",
							description: "Core draft actions stay here: export, test, save, publish, and this tutorial entrypoint."
						},
						paletteBase: {
							title: "Main palette",
							description: "Drag building blocks from this palette into the program surface."
						},
						programBody: {
							title: "Program surface",
							description: "This surface is the editable program. Blocks, inline inputs, and control flow all render here."
						},
						boardConfigButton: {
							title: "Board rules",
							description: "Click this control to open the board and restriction settings. This step advances after the click."
						},
						boardConfigPanel: {
							title: "Restrictions panel",
							description: "This panel configures allowed operations, block limits, and validation rules for the level."
						},
						paletteSide: {
							title: "Context palette",
							description: "Scope variables, created values, and routine-specific helpers appear here."
						}
					}
				},
				campaignLevelBasics: {
					label: "Campaign level basics",
					steps: {
						boardPanel: {
							title: "Right panel: current state",
							description: "The right panel shows the structures as they are right now. This is the current state that your program will change when it runs."
						},
						previewGoal: {
							title: "Goal preview",
							description: "Hold Preview Result to temporarily see the target arrangement. That is the goal state the current state must match."
						},
						programSurface: {
							title: "Left panel: program area",
							description: "The left panel is where you build the solution. Arrange blocks here to create the program that transforms the structures."
						},
						runActions: {
							title: "Run controls",
							description: "Run executes the whole program. Step executes one action at a time, which is useful while learning what each block does."
						},
						levelTask: {
							title: "Compare, then solve",
							description: "First compare the current state on the right with the goal preview. Then build a program on the left that makes both match."
						}
					}
				}
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
				runHint: "Feedback here.",
				feedHint: "Run your program to watch the data move.",
				expandOutput: "Expand output",
				collapseOutput: "Collapse output",
				addStructure: "Add structure",
				configureBoard: "Configure board"
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
			campaign: {
				empty: "No campaign levels found yet.",
				noDescription: "No description.",
				maxSteps: "max {{count}} steps",
				replay: "Replay",
				locked: "Locked"
			},
			player: {
				tabs: {
					puzzle: "Puzzle",
					steps: "Steps",
					timeline: "Timeline"
				},
				status: {
					loading: "Loading puzzle...",
					ready: "Ready to play step by step.",
					reset: "Puzzle reset.",
					noMoreSteps: "No more steps available.",
					executedStep: "Executed {{action}} step.",
					finished: "Finished puzzle run."
				},
				panels: {
					stepControls: "Step Controls",
					timeline: "Timeline",
					quickControls: "Quick Controls"
				},
				mode: "Player Mode",
				noActionsYet: "No actions yet.",
				showExtraPanel: "Show Extra Panel",
				hideExtraPanel: "Hide Extra Panel"
			},
			playSession: {
				loadingLevel: "Loading level...",
				dragBlocksHint: "Drag blocks into the editor and choose an action with the arrow tab.",
				routineCreated: "Routine \"{{name}}\" created.",
				pausedAtBreakpoint: "Paused at breakpoint.",
				paused: "Paused.",
				programRunError: "The program could not run.",
				conditionEvaluated: "Condition evaluated to {{result}}.",
				conditionTrue: "true",
				conditionFalse: "false",
				oneBlockExecuted: "One block executed.",
				resetTryDifferent: "Reset. Try a different sequence.",
				editorCleared: "Editor cleared.",
				dragOneBlock: "Drag at least one block into the editor.",
				orphanElse: "Each Else block must appear immediately after an If block.",
				finishBlocksHint: "Finish each block and fill any missing value slots.",
				missingRequiredOperations: "Missing required operations: {{operations}}.",
				successSolved: "Success! You solved the level.",
				goalMismatch: "Your program finished, but it does not match the goal yet.",
				couldNotLoadCampaign: "Could not load campaign.",
				stepLimitReached: "Step limit reached ({{max}}).",
				requiresMoreRoutines: "This level requires at least {{count}} scripts (create a helper function).",
				requiresRoutineCall: "This level requires calling a custom function from another script."
			},
			diagnostics: {
				loopConditionIncomplete: "Loop blocks need a complete condition input.",
				forEachLinearOnly: "For-each only supports linear structures in this version.",
				forEachNeedsSource: "For-each needs a source structure.",
				missingRoutineCallTarget: "A routine call points to a missing routine.",
				routineNotExecutable: "{{name}} is not executable yet.",
				routineMemberNotExecutable: "{{name}}.{{member}} is not executable yet."
			},
			drafts: {
				title: "My levels",
				newLevel: "New level",
				newLevelPrompt: "Level name",
				newLevelDefault: "New level",
				nameRequired: "Name cannot be empty.",
				emptyTitle: "No saved levels",
				emptyBody: "Create a level to get started.",
				lastEdited: "Last edited: {{date}}",
				publishedAt: "Published: {{date}}",
				openEditor: "Open editor"
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
				paletteLaneBase: "Blocks",
				paletteLaneScope: "Vars",
				paletteLaneCreated: "Definitions",
				paletteLaneSidePanel: "Context",
				paletteLaneEmpty: "Nothing here.",
				functionTypeExclusiveHint: "Only one type or function is allowed per routine.",
				variableNamePrompt: "Variable name",
				scopeVariablePrompt: "Choose variable",
				variableTypePrompt: "Choose variable type",
				referenceTargetPrompt: "Reference target",
				valuePrompt: "Value",
				routineName: "Routine name",
				renameRoutine: "Rename routine",
				routineDefault: "routine",
				functionDefault: "function",
				base: "Base",
				conditionalIfOnly: "If Only",
				conditionalIfElse: "If / Else",
				placeholderCondition: "condition",
				placeholderValue: "value",
				placeholderIndex: "index",
				operatorGroupArithmetic: "Arithmetic",
				operatorGroupComparison: "Comparison",
				operatorGroupLogical: "Logic",
				opGroupInsert: "Insert",
				opGroupExtract: "Extract",
				opGroupQuery: "Query",
				opGroupMutate: "Mutate",
				blockDisabledForLevel: "This block is disabled for this level.",
				blockLimitDisplay: "Limit reached ({{used}}/{{limit}}).",
				collapseInstructions: "Collapse instructions",
				expandInstructions: "Expand instructions",
				levelCouldNotBeLoaded: "Level \"{{id}}\" could not be loaded.",
				draftDefaultName: "Untitled level"
			},
			editorShell: {
				save: "Save",
				untitledLevel: "Untitled level",
				testDraftName: "Test draft",
				loadingDraft: "Loading draft...",
				readyStatus: "Editor ready. Everything disabled by default.",
				savedLocally: "Draft saved locally.",
				preparedToPublish: "Draft prepared. Solve it to enable Publish.",
				publishedStatus: "Published: {{id}}",
				mustSolveToPublish: "You need to solve the level before publishing it. Redirecting to Test level.",
				prepareDraftError: "Could not prepare the draft for testing.",
				publishError: "Could not publish the level.",
				scriptLimitReached: "Script limit reached ({{count}}).",
				runHint: "Editor mode: use Test to run the play session.",
				stepHint: "Editor mode: use Test for step-by-step validation.",
				pauseHint: "Editor mode.",
				programCleared: "Program cleared.",
				exportSuccess: "Level exported as JSON.",
				tutorial: "Tutorial",
				exportJson: "Export JSON",
				testLevel: "Test level",
				publish: "Publish",
				publishing: "Publishing...",
				freeScripts: "Free scripts",
				maxScripts: "Max scripts",
				lockStarterBlocks: "Lock starter blocks",
				globalBlocks: "Global blocks",
				scriptBlocks: "Script blocks",
				deleteStructure: "Delete structure",
				structureDefaultName: "Structure {{index}}",
				maxCapacity: "Max capacity",
				unlimited: "Unlimited",
				overrideNoLarger: "Override: no larger on smaller",
				overrideValueDomain: "Override: value domain",
				structureRuleActive: "Rule active on this structure",
				numericOnly: "Numeric values only",
				localMin: "Local min",
				localMax: "Local max",
				noMin: "No minimum",
				noMax: "No maximum",
				operationsPolicy: "Operation policy",
				executionConstraints: "Execution constraints",
				noLargerOnSmaller: "No larger on smaller (Hanoi)",
				minValueAllowed: "Minimum allowed value",
				maxValueAllowed: "Maximum allowed value",
				metadata: "Metadata",
				maxSteps: "Max steps",
				policyForbidden: "Forbidden",
				policyPermitted: "Permitted",
				policyRequired: "Required",
				levelInEditing: "Level in editing",
				allowAdditionalRoutinesAriaLabel: "Allow additional scripts",
				lockStarterBlocksAriaLabel: "Lock starter blocks",
				overrideNoLargerAriaLabel: "Override no larger on smaller",
				overrideValueDomainAriaLabel: "Override value domain",
				numericOnlyLocal: "Numeric values only (local)",
				noLargerGlobal: "No larger on smaller (global)",
				numericOnlyGlobal: "Numeric values only (global)"
			},
			structures: {
				stack: "Stack",
				queue: "Queue",
				list: "Singly Linked List",
				"doubly-linked-list": "Doubly Linked List",
				"circular-list": "Circular List",
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
				else: "Else",
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
				levelSolvedTitle: "Level Complete",
				levelSolvedBody: "You solved \"{{level}}\".",
				functionTypeConflict: "A routine cannot be both a function and a type.",
				returnInTypeRoutine: "Type routines cannot return values.",
				unknownType: "Unknown type.",
				unknownTypeField: "Unknown type field.",
				typeMismatch: "Type mismatch.",
				typeMismatchAssign: "Invalid assignment type.",
				typeMismatchFieldAssign: "Invalid field assignment type.",
				typeMismatchExpectArg: "Argument type does not match expected parameter type.",
				lockedBlockByLevel: "This block is locked by level configuration.",
				blockLimitReached: "Block limit reached.",
				activeRoutineBlockLimit: "Block limit for this routine: {{count}}.",
				maxBlocksAllowed: "This level allows up to {{count}} blocks.",
				blockAddedToEditor: "Block added to the editor.",
				slotCleared: "Slot cleared.",
				blockRemoved: "Block removed.",
				blocksRemoved: "{{count}} blocks removed.",
				blockDuplicated: "Block duplicated.",
				blocksDuplicated: "{{count}} blocks duplicated.",
				operationUpdated: "Operation updated.",
				elseBlockAdded: "Else block added.",
				elseBlockRemoved: "Else block removed.",
				definitionBlockExists: "Only one definition block is allowed per routine.",
				typeDefinitionBlockExists: "Only one type definition block is allowed per routine.",
				forEachSourceMissing: "For-each source structure is missing.",
				valueBlockCancelled: "Value block cancelled.",
				returnRequiresDefinition: "Return requires a definition block in this routine.",
				unsupportedPaletteBlockKind: "Unsupported palette block kind: {{kind}}",
				variableDeclarationCancelled: "Variable declaration cancelled.",
				variableCreated: "Variable created.",
				forEachCreationCancelled: "For-each creation cancelled.",
				forEachCreated: "For-each created.",
				assignmentCreationCancelled: "Assignment creation cancelled.",
				assignmentCreated: "Assignment created.",
				referenceCreationCancelled: "Reference creation cancelled.",
				referenceCreated: "Reference created.",
				typeFieldCreationCancelled: "Type field block creation cancelled.",
				typeFieldCreated: "Type field block created.",
				definitionRenamed: "Definition renamed.",
				typeDefinitionRenamed: "Type definition renamed.",
				levelStructuresPreinstantiated: "Level structures are pre-instantiated and cannot be retargeted.",
				referenceTargetSelected: "Reference target selected.",
				assignmentTargetSelected: "Assignment target selected.",
				variableTargetSelected: "Variable target selected.",
				typeFieldTargetSelected: "Type field target selected.",
				variableRenamed: "Variable renamed.",
				valueInserted: "Value inserted.",
				valueUpdated: "Value updated.",
				variableBlockUpdated: "Variable block updated.",
				operationBlockUpdated: "Operation block updated.",
				declarationToInput: "Declaration converted to function input.",
				inputToDeclaration: "Function input converted to declaration.",
				readingField: "Reading field {{field}}.",
				assigningField: "Assigning field {{field}}.",
				functionCallMode: "Function block switched to call mode.",
				functionReferenceMode: "Function block switched to reference mode.",
				memberCallMode: "Member block switched to call mode.",
				memberReferenceMode: "Member block switched to reference mode.",
				blockUpdated: "Block updated.",
				blockReset: "Block reset.",
				noResults: "No results",
				operationForbidden: "Operation \"{{operation}}\" is forbidden in this level.",
				structureNotFound: "Structure \"{{id}}\" does not exist.",
				structureCapacityReached: "Structure \"{{id}}\" reached its capacity ({{capacity}}).",
				numericOnlyConstraint: "This level only allows numeric values in structure operations.",
				minMaxRequiresNumeric: "Min/Max value constraints require numeric values.",
				valueBelowMin: "Value {{value}} is below the minimum ({{min}}).",
				valueAboveMax: "Value {{value}} is above the maximum ({{max}}).",
				noLargerRequiresNumeric: "The no-larger-on-smaller rule requires numeric values.",
				noLargerNonNumericStructure: "Structure \"{{id}}\" contains non-numeric values and cannot use no-larger-on-smaller.",
				noLargerViolation: "Constraint violated on \"{{id}}\": cannot place {{value}} on top of {{top}}."
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
				PEEK: "peek",
				SIZE: "size",
				IS_EMPTY: "is_empty",
				GET_AT: "get_at",
				INSERT_AT: "insert_at",
				REMOVE_AT: "remove_at",
				CONTAINS: "contains",
				FIND: "find",
				REVERSE: "reverse",
				CLEAR: "clear"
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
				editor: "Editor de Niveles",
				settings: "Ajustes"
			},
			settings: {
				title: "Ajustes",
				sharedSettings: "Ajustes generales",
				preferences: "Preferencias",
				interface: "Interfaz",
				execution: "Ejecución",
				localData: "Datos locales",
				resetLayout: "Restablecer layout de paneles",
				lineDelayMs: "Retardo (ms por bloque)",
				localDataStatus: "Datos locales guardados",
				localDataStatusDetail: "borradores {{drafts}}, progreso {{progress}}, niveles {{levels}}",
				exportBackup: "Exportar backup local",
				importBackup: "Importar backup local",
				clearProgress: "Limpiar progreso",
				clearDrafts: "Limpiar borradores del editor",
				resetAllLocalData: "Restablecer todos los datos locales",
				yes: "Sí",
				no: "No",
				confirmResetLayout: "¿Restablecer layout de paneles guardado?",
				statusLayoutReset: "Layout de interfaz restablecido. Recarga para aplicar en todas las vistas.",
				statusSpeedUpdated: "Velocidad actualizada: {{ms}} ms por bloque visible.",
				statusBackupExported: "Backup local exportado.",
				errorInvalidBackup: "Formato de backup no válido.",
				confirmImportBackup: "Importar backup sobreescribirá ajustes locales. ¿Continuar?",
				statusBackupImported: "Backup importado. Recarga para aplicar completamente.",
				errorImportFailed: "No se pudo importar el backup.",
				confirmClearProgress: "¿Eliminar progreso de niveles completados?",
				statusProgressCleared: "Progreso eliminado.",
				confirmClearDrafts: "¿Eliminar todos los borradores de editor?",
				statusDraftsCleared: "Borradores eliminados.",
				confirmResetAll: "Esto borrará progreso, borradores, niveles importados y preferencias. ¿Continuar?",
				statusAllReset: "Datos locales restablecidos."
			},
			common: {
				back: "Volver",
				menu: "Menú",
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
				delete: "Eliminar",
				notice: "Aviso",
				nextLevel: "Siguiente nivel",
				hideResult: "Ocultar resultado",
				levelInfo: "Info del nivel",
				author: "Autor",
				description: "Descripción",
				id: "ID",
				type: "Tipo",
				initial: "Inicial",
				target: "Objetivo",
				published: "Publicado",
				draft: "Borrador"
			},
			actions: {
				play: "Ejecutar",
				step: "Paso",
				pause: "Pausa",
				stop: "Detener",
				reset: "Reiniciar",
				clear: "Limpiar",
				addScript: "Añadir script"
			},
			tutorials: {
				common: {
					next: "Siguiente",
					back: "Atrás",
					close: "Cerrar"
				},
				editorBasics: {
					label: "Conceptos básicos del editor",
					steps: {
						actions: {
							title: "Acciones superiores",
							description: "Aquí están las acciones principales del borrador: exportar, probar, guardar, publicar y abrir este tutorial."
						},
						paletteBase: {
							title: "Paleta principal",
							description: "Arrastra bloques desde esta paleta hacia la superficie del programa."
						},
						programBody: {
							title: "Superficie del programa",
							description: "Esta superficie es el programa editable. Aquí se renderizan los bloques, entradas en línea y control de flujo."
						},
						boardConfigButton: {
							title: "Reglas del tablero",
							description: "Haz clic en este control para abrir la configuración del tablero y las restricciones. Este paso avanza después del clic."
						},
						boardConfigPanel: {
							title: "Panel de restricciones",
							description: "Este panel configura operaciones permitidas, límites de bloques y reglas de validación del nivel."
						},
						paletteSide: {
							title: "Paleta contextual",
							description: "Aquí aparecen variables en alcance, valores creados y ayudas específicas de cada rutina."
						}
					}
				},
				campaignLevelBasics: {
					label: "Conceptos básicos del nivel de campaña",
					steps: {
						boardPanel: {
							title: "Panel derecho: estado actual",
							description: "El panel derecho muestra las estructuras tal como están ahora. Ese es el estado actual que tu programa cambiará al ejecutarse."
						},
						previewGoal: {
							title: "Vista previa de la meta",
							description: "Mantén presionado Previsualizar resultado para ver temporalmente la disposición objetivo. Ese es el estado meta que debe igualar el estado actual."
						},
						programSurface: {
							title: "Panel izquierdo: área del programa",
							description: "El panel izquierdo es donde construyes la solución. Organiza aquí los bloques para crear el programa que transforma las estructuras."
						},
						runActions: {
							title: "Controles de ejecución",
							description: "Ejecutar corre todo el programa. Paso ejecuta una acción a la vez, lo cual ayuda a aprender qué hace cada bloque."
						},
						levelTask: {
							title: "Compara y luego resuelve",
							description: "Primero compara el estado actual de la derecha con la vista previa de la meta. Luego construye en la izquierda un programa que haga que ambos coincidan."
						}
					}
				}
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
				runHint: "Feedback aquí.",
				feedHint: "Ejecuta tu programa para ver cómo se mueven los datos.",
				expandOutput: "Expandir salida",
				collapseOutput: "Contraer salida",
				addStructure: "Añadir estructura",
				configureBoard: "Configurar tablero"
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
			campaign: {
				empty: "Aún no hay niveles de campaña.",
				noDescription: "Sin descripción.",
				maxSteps: "máx. {{count}} pasos",
				replay: "Rejugar",
				locked: "Bloqueado"
			},
			player: {
				tabs: {
					puzzle: "Rompecabezas",
					steps: "Pasos",
					timeline: "Timeline"
				},
				status: {
					loading: "Cargando rompecabezas...",
					ready: "Listo para jugar paso a paso.",
					reset: "Rompecabezas reiniciado.",
					noMoreSteps: "No hay más pasos disponibles.",
					executedStep: "Se ejecutó paso {{action}}.",
					finished: "Ejecución del rompecabezas terminada."
				},
				panels: {
					stepControls: "Controles de pasos",
					timeline: "Timeline",
					quickControls: "Controles rápidos"
				},
				mode: "Modo jugador",
				noActionsYet: "Aún no hay acciones.",
				showExtraPanel: "Mostrar panel extra",
				hideExtraPanel: "Ocultar panel extra"
			},
			playSession: {
				loadingLevel: "Cargando nivel...",
				dragBlocksHint: "Arrastra bloques al editor y elige una acción con la pestaña de flecha.",
				routineCreated: "Rutina \"{{name}}\" creada.",
				pausedAtBreakpoint: "Pausado en breakpoint.",
				paused: "Pausado.",
				programRunError: "No se pudo ejecutar el programa.",
				conditionEvaluated: "La condición se evaluó a {{result}}.",
				conditionTrue: "verdadero",
				conditionFalse: "falso",
				oneBlockExecuted: "Se ejecutó un bloque.",
				resetTryDifferent: "Reiniciado. Prueba una secuencia distinta.",
				editorCleared: "Editor limpiado.",
				dragOneBlock: "Arrastra al menos un bloque al editor.",
				orphanElse: "Cada bloque Sino debe ir inmediatamente después de un bloque Si.",
				finishBlocksHint: "Completa cada bloque y llena los slots de valores faltantes.",
				missingRequiredOperations: "Faltan operaciones requeridas: {{operations}}.",
				successSolved: "¡Éxito! Resolviste el nivel.",
				goalMismatch: "Tu programa terminó, pero todavía no coincide con la meta.",
				couldNotLoadCampaign: "No se pudo cargar la campaña.",
				stepLimitReached: "Límite de pasos alcanzado ({{max}}).",
				requiresMoreRoutines: "Este nivel requiere al menos {{count}} scripts (crea una función auxiliar).",
				requiresRoutineCall: "Este nivel requiere llamar a una función personalizada desde otro script."
			},
			diagnostics: {
				loopConditionIncomplete: "Los bloques de bucle necesitan una condición completa.",
				forEachLinearOnly: "Para-cada solo soporta estructuras lineales en esta versión.",
				forEachNeedsSource: "Para-cada necesita una estructura origen.",
				missingRoutineCallTarget: "Una llamada de rutina apunta a una rutina inexistente.",
				routineNotExecutable: "{{name}} todavía no es ejecutable.",
				routineMemberNotExecutable: "{{name}}.{{member}} todavía no es ejecutable."
			},
			drafts: {
				title: "Mis niveles",
				newLevel: "Nuevo nivel",
				newLevelPrompt: "Nombre del nivel",
				newLevelDefault: "Nuevo nivel",
				nameRequired: "El nombre no puede estar vacío.",
				emptyTitle: "No hay niveles guardados",
				emptyBody: "Crea un nivel para comenzar.",
				lastEdited: "Última edición: {{date}}",
				publishedAt: "Publicado: {{date}}",
				openEditor: "Abrir editor"
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
				paletteLaneBase: "Bloques",
				paletteLaneScope: "Vars",
				paletteLaneCreated: "Definiciones",
				paletteLaneSidePanel: "Contexto",
				paletteLaneEmpty: "Nada aqui.",
				functionTypeExclusiveHint: "Por rutina solo puede haber 1 tipo o función",
				variableNamePrompt: "Nombre de variable",
				scopeVariablePrompt: "Elegir variable",
				variableTypePrompt: "Elegir tipo de variable",
				referenceTargetPrompt: "Objetivo de referencia",
				valuePrompt: "Valor",
				routineName: "Nombre de la rutina",
				renameRoutine: "Renombrar rutina",
				routineDefault: "rutina",
				functionDefault: "función",
				base: "Base",
				conditionalIfOnly: "Solo si",
				conditionalIfElse: "Si / sino",
				placeholderCondition: "condición",
				placeholderValue: "valor",
				placeholderIndex: "índice",
				operatorGroupArithmetic: "Aritmética",
				operatorGroupComparison: "Comparación",
				operatorGroupLogical: "Lógica",
				opGroupInsert: "Insertar",
				opGroupExtract: "Extraer",
				opGroupQuery: "Consultar",
				opGroupMutate: "Mutar",
				blockDisabledForLevel: "Este bloque está deshabilitado para este nivel.",
				blockLimitDisplay: "Límite alcanzado ({{used}}/{{limit}}).",
				collapseInstructions: "Contraer instrucciones",
				expandInstructions: "Expandir instrucciones",
				levelCouldNotBeLoaded: "No se pudo cargar el nivel \"{{id}}\".",
				draftDefaultName: "Nivel sin nombre"
			},
			editorShell: {
				save: "Guardar",
				untitledLevel: "Nivel sin nombre",
				testDraftName: "Borrador de prueba",
				loadingDraft: "Cargando borrador...",
				readyStatus: "Editor listo. Todo desactivado por defecto.",
				savedLocally: "Borrador guardado localmente.",
				preparedToPublish: "Borrador preparado. Resuélvelo para habilitar Publicar.",
				publishedStatus: "Publicado: {{id}}",
				mustSolveToPublish: "Debes resolver el nivel para publicarlo. Te llevo a Probar nivel.",
				prepareDraftError: "No se pudo preparar el borrador para prueba.",
				publishError: "No se pudo publicar el nivel.",
				scriptLimitReached: "Límite de scripts alcanzado ({{count}}).",
				runHint: "Modo editor: usa Probar para ejecutar la sesión de juego.",
				stepHint: "Modo editor: usa Probar para validación paso a paso.",
				pauseHint: "Modo editor.",
				programCleared: "Programa limpiado.",
				exportSuccess: "Nivel exportado como JSON.",
				tutorial: "Tutorial",
				exportJson: "Exportar JSON",
				testLevel: "Probar nivel",
				publish: "Publicar",
				publishing: "Publicando...",
				freeScripts: "Scripts libres",
				maxScripts: "Máx. scripts",
				lockStarterBlocks: "Bloques iniciales bloqueados",
				globalBlocks: "Bloques globales",
				scriptBlocks: "Bloques del script",
				deleteStructure: "Eliminar estructura",
				structureDefaultName: "Estructura {{index}}",
				maxCapacity: "Capacidad máx.",
				unlimited: "Sin límite",
				overrideNoLarger: "Override: no larger on smaller",
				overrideValueDomain: "Override: dominio de valores",
				structureRuleActive: "Regla activa en esta estructura",
				numericOnly: "Solo valores numéricos",
				localMin: "Mín. local",
				localMax: "Máx. local",
				noMin: "Sin mínimo",
				noMax: "Sin máximo",
				operationsPolicy: "Política de operaciones",
				executionConstraints: "Restricciones de ejecución",
				noLargerOnSmaller: "No larger on smaller (Hanoi)",
				minValueAllowed: "Valor mínimo permitido",
				maxValueAllowed: "Valor máximo permitido",
				metadata: "Metadatos",
				maxSteps: "Máx. pasos",
				policyForbidden: "Prohibida",
				policyPermitted: "Permitida",
				policyRequired: "Requerida",
				levelInEditing: "Nivel en edición",
				allowAdditionalRoutinesAriaLabel: "Permitir scripts adicionales",
				lockStarterBlocksAriaLabel: "Bloquear bloques iniciales",
				overrideNoLargerAriaLabel: "Override no larger on smaller",
				overrideValueDomainAriaLabel: "Override dominio de valores",
				numericOnlyLocal: "Solo valores numéricos (local)",
				noLargerGlobal: "No larger on smaller (global)",
				numericOnlyGlobal: "Solo valores numéricos (global)"
			},
			structures: {
				stack: "Pila",
				queue: "Cola",
				list: "Lista simplemente enlazada",
				"doubly-linked-list": "Lista doblemente enlazada",
				"circular-list": "Lista circular",
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
				else: "Sino",
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
				routineNameEmpty: "El nombre de la rutina no puede estar vacío.",
				levelSolvedTitle: "Nivel completado",
				levelSolvedBody: "Has resuelto \"{{level}}\".",
				functionTypeConflict: "Una rutina no puede ser función y tipo a la vez.",
				returnInTypeRoutine: "Una rutina de tipo no permite retornos.",
				unknownType: "Tipo desconocido.",
				unknownTypeField: "Campo de tipo desconocido.",
				typeMismatch: "Incompatibilidad de tipos.",
				typeMismatchAssign: "Tipo inválido en asignación.",
				typeMismatchFieldAssign: "Tipo inválido en asignación de campo.",
				typeMismatchExpectArg: "El tipo del argumento no coincide con el parámetro esperado.",
				lockedBlockByLevel: "Este bloque está bloqueado por la configuración del nivel.",
				blockLimitReached: "Se alcanzó el límite de bloques.",
				activeRoutineBlockLimit: "Límite de bloques para esta rutina: {{count}}.",
				maxBlocksAllowed: "Este nivel permite hasta {{count}} bloques.",
				blockAddedToEditor: "Bloque añadido al editor.",
				slotCleared: "Slot limpiado.",
				blockRemoved: "Bloque eliminado.",
				blocksRemoved: "Se eliminaron {{count}} bloques.",
				blockDuplicated: "Bloque duplicado.",
				blocksDuplicated: "Se duplicaron {{count}} bloques.",
				operationUpdated: "Operación actualizada.",
				elseBlockAdded: "Bloque else añadido.",
				elseBlockRemoved: "Bloque else eliminado.",
				definitionBlockExists: "Solo se permite un bloque de definición por rutina.",
				typeDefinitionBlockExists: "Solo se permite un bloque de definición de tipo por rutina.",
				forEachSourceMissing: "Falta la estructura origen del para-cada.",
				valueBlockCancelled: "Se canceló el bloque de valor.",
				returnRequiresDefinition: "Return requiere un bloque de definición en esta rutina.",
				unsupportedPaletteBlockKind: "Tipo de bloque de paleta no soportado: {{kind}}",
				variableDeclarationCancelled: "Se canceló la creación de la variable.",
				variableCreated: "Variable creada.",
				forEachCreationCancelled: "Se canceló la creación del para-cada.",
				forEachCreated: "Para-cada creado.",
				assignmentCreationCancelled: "Se canceló la creación de la asignación.",
				assignmentCreated: "Asignación creada.",
				referenceCreationCancelled: "Se canceló la creación de la referencia.",
				referenceCreated: "Referencia creada.",
				typeFieldCreationCancelled: "Se canceló la creación del bloque de campo.",
				typeFieldCreated: "Bloque de campo creado.",
				definitionRenamed: "Definición renombrada.",
				typeDefinitionRenamed: "Definición de tipo renombrada.",
				levelStructuresPreinstantiated: "Las estructuras del nivel ya vienen instanciadas y no pueden redirigirse.",
				referenceTargetSelected: "Objetivo de referencia seleccionado.",
				assignmentTargetSelected: "Objetivo de asignación seleccionado.",
				variableTargetSelected: "Objetivo de variable seleccionado.",
				typeFieldTargetSelected: "Objetivo de campo seleccionado.",
				variableRenamed: "Variable renombrada.",
				valueInserted: "Valor insertado.",
				valueUpdated: "Valor actualizado.",
				variableBlockUpdated: "Bloque de variable actualizado.",
				operationBlockUpdated: "Bloque de operación actualizado.",
				declarationToInput: "La declaración se convirtió en entrada de función.",
				inputToDeclaration: "La entrada de función se convirtió en declaración.",
				readingField: "Leyendo campo {{field}}.",
				assigningField: "Asignando campo {{field}}.",
				functionCallMode: "El bloque de función cambió a modo llamada.",
				functionReferenceMode: "El bloque de función cambió a modo referencia.",
				memberCallMode: "El bloque miembro cambió a modo llamada.",
				memberReferenceMode: "El bloque miembro cambió a modo referencia.",
				blockUpdated: "Bloque actualizado.",
				blockReset: "Bloque reiniciado.",
				noResults: "Sin resultados",
				operationForbidden: "La operación \"{{operation}}\" está prohibida en este nivel.",
				structureNotFound: "La estructura \"{{id}}\" no existe.",
				structureCapacityReached: "La estructura \"{{id}}\" alcanzó su capacidad ({{capacity}}).",
				numericOnlyConstraint: "Este nivel solo permite valores numéricos en operaciones de estructura.",
				minMaxRequiresNumeric: "Las restricciones de valor mín/máx requieren valores numéricos.",
				valueBelowMin: "El valor {{value}} está por debajo del mínimo ({{min}}).",
				valueAboveMax: "El valor {{value}} está por encima del máximo ({{max}}).",
				noLargerRequiresNumeric: "La regla no-mayor-sobre-menor requiere valores numéricos.",
				noLargerNonNumericStructure: "La estructura \"{{id}}\" contiene valores no numéricos y no puede usar no-mayor-sobre-menor.",
				noLargerViolation: "Restricción violada en \"{{id}}\": no se puede colocar {{value}} sobre {{top}}."
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
				PEEK: "espiar",
				SIZE: "tamaño",
				IS_EMPTY: "es_vacía",
				GET_AT: "obtener_en",
				INSERT_AT: "insertar_en",
				REMOVE_AT: "eliminar_en",
				CONTAINS: "contiene",
				FIND: "encontrar",
				REVERSE: "invertir",
				CLEAR: "vaciar"
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
