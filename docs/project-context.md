# Contexto del Proyecto

## 1. Propósito del documento

Este documento concentra el contexto técnico operativo del proyecto para dos usos:

1. servir como referencia rápida durante desarrollo, depuración y refactorización;
2. servir como base documental de apoyo para tesis, defensa técnica y mantenimiento posterior.

No reemplaza documentos más formales como el documento de diseño del proyecto o la cobertura curricular. Su función es distinta: dejar claro qué existe, dónde está, cuál módulo manda en cada responsabilidad y cómo se conectan los subsistemas.

## 2. Resumen ejecutivo

El proyecto implementa una plataforma de aprendizaje y visualización de estructuras de datos con tres capas principales:

1. **motor semántico y de ejecución**  
   modela TADs, niveles y persistencia;
2. **editor visual de programas**  
   permite construir algoritmos con bloques, compilar, depurar y ejecutar;
3. **interfaz visual de juego/aprendizaje**  
   presenta niveles, tablero, progreso y experiencia de usuario final.

Arquitectónicamente, el proyecto está organizado como **monorepo npm workspaces**, con separación explícita entre dominio, almacenamiento, renderizado visual y aplicación React principal.

## 3. Estructura global del repositorio

Raíz del repositorio:

- `package.json`
- `tsconfig.base.json`
- `app/`
- `core-engine/`
- `game-system/`
- `storage/`
- `ui-editor/`
- `docs/`
- `Estructuras2025-2/`
- `plugins/`
- `scripts/`

### 3.1 Workspaces principales

Definidos en [package.json](C:\Users\aguerra\Documents\thesis\package.json):

- `core-engine`
- `game-system`
- `storage`
- `ui-editor`
- `app`

Esto implica:

- compilación modular;
- tipado compartido por paquetes internos;
- posibilidad de aislar responsabilidades;
- menor acoplamiento que una aplicación monolítica única.

## 4. Visión conceptual del sistema

El sistema puede entenderse como esta cadena:

1. **`game-system`** define qué es un nivel;
2. **`storage`** carga y valida niveles y progreso;
3. **`core-engine`** ejecuta operaciones sobre estructuras;
4. **`app`** provee la experiencia principal de edición y juego;
5. **`ui-editor`** renderiza paneles, tableros y shell visual reutilizable;
6. **`program-editor-core`** dentro de `app` representa, compila y proyecta el programa visual.

## 5. Subsistemas y responsabilidades

### 5.1 `core-engine`

Archivo principal:

- [core-engine/src/index.ts](C:\Users\aguerra\Documents\thesis\core-engine\src\index.ts)

Responsabilidad:

- representar estructuras `stack`, `queue`, `list`;
- normalizar snapshots;
- encapsular operaciones válidas por estructura;
- ejecutar operaciones visuales mediante `VisualExecutionEngine`.

Conceptos clave:

- `StructureSnapshot`
- `DataNode`
- `DataValue`
- `StackStructure`
- `QueueStructure`
- `ListStructure`

Valor arquitectónico:

- separa reglas de TAD del editor y de la UI;
- permite validar semántica independientemente del render;
- convierte el proyecto en algo más fuerte que una maqueta visual.

### 5.2 `game-system`

Archivo principal:

- [game-system/src/index.ts](C:\Users\aguerra\Documents\thesis\game-system\src\index.ts)

Responsabilidad:

- definir modelo de nivel;
- definir restricciones (`allowedOperations`, `forbiddenBlocks`, `maxSteps`);
- definir layout de juego y editor;
- validar un programa contra estado objetivo.

Tipos clave:

- `LevelDefinition`
- `LevelConstraints`
- `PlayLayout`
- `EditorLayout`
- `EditorTooling`
- `ValidationResult`

Importancia:

- aquí vive la definición de qué es una instancia jugable;
- es frontera entre contenido pedagógico y motor.

### 5.3 `storage`

Archivo principal:

- [storage/src/index.ts](C:\Users\aguerra\Documents\thesis\storage\src\index.ts)

Responsabilidad:

- validar niveles importados;
- listar niveles;
- cargar un nivel por id;
- persistir progreso;
- persistir preferencias de UI.

Conceptos clave:

- `LevelRepository`
- `ProgressRepository`
- `UiPreferencesRepository`
- validación con `zod`

Importancia:

- protege el sistema contra JSON inválidos;
- desacopla persistencia de la app principal;
- deja abierta migración futura a backend real.

### 5.4 `ui-editor`

Archivo principal:

- [ui-editor/src/index.tsx](C:\Users\aguerra\Documents\thesis\ui-editor\src\index.tsx)

Responsabilidad:

- proveer componentes visuales reutilizables de shell, panel y tablero;
- renderizar estructuras y variables en el board;
- encapsular layout visual común de pantallas.

Importancia:

- concentra la identidad visual del proyecto;
- separa presentación reutilizable de la lógica del editor.

### 5.5 `app`

Archivos de entrada:

- [app/src/main.tsx](C:\Users\aguerra\Documents\thesis\app\src\main.tsx)
- [app/src/App.tsx](C:\Users\aguerra\Documents\thesis\app\src\App.tsx)

Responsabilidad:

- aplicación React principal;
- rutas;
- pantallas;
- integración entre editor, sesión de juego, board, i18n y repositorios.

Pantallas principales:

- `MainMenuScreen`
- `CommunityLevelsScreen`
- `CampaignScreen`
- `PlayLevelScreen`
- `EditorShell`

## 6. Rutas y navegación

Definidas en [App.tsx](C:\Users\aguerra\Documents\thesis\app\src\App.tsx):

- home
- play
- play por id de nivel
- campaign
- editor

Pantallas relevantes:

- [app/src/components/MainMenuScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\MainMenuScreen.tsx)
- [app/src/components/CommunityLevelsScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\CommunityLevelsScreen.tsx)
- [app/src/components/CampaignScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\CampaignScreen.tsx)
- [app/src/components/EditorShell.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\EditorShell.tsx)
- [app/src/features/play-ui/PlayLevelScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\features\play-ui\PlayLevelScreen.tsx)

## 7. Flujo funcional principal

### 7.1 Selección de nivel

Pantalla:

- [CommunityLevelsScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\CommunityLevelsScreen.tsx)

Función:

- lista niveles;
- filtra por fuente, estructura, dificultad;
- muestra preview compacta;
- permite importar nivel.

Repositorios usados:

- `JsonLevelRepository`
- `LocalProgressRepository`

### 7.2 Juego y edición por nivel

Pantalla:

- [PlayLevelScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\features\play-ui\PlayLevelScreen.tsx)

Función:

- carga nivel;
- monta controlador de sesión;
- integra editor visual;
- muestra tablero derecho;
- controla run/step/pause/reset;
- gestiona diálogos de entrada;
- mantiene resize de paneles;
- gestiona consola/salida.

Esta es, en la práctica, la pantalla más compleja del sistema.

## 8. Núcleo de edición de programas

### 8.1 Dos capas internas

El editor tiene dos capas conceptuales:

1. **modelo semántico tree-first**  
   vive en `app/src/features/program-editor-core`;
2. **editor DOM/imperativo legacy-compatible**  
   vive en `app/src/play-editor`.

Documentos de apoyo ya existentes:

- [docs/editor-tree-architecture.md](C:\Users\aguerra\Documents\thesis\docs\editor-tree-architecture.md)
- [docs/play-editor-architecture.md](C:\Users\aguerra\Documents\thesis\docs\play-editor-architecture.md)

### 8.2 `program-editor-core`

Carpeta:

- `app/src/features/program-editor-core/`

Archivos clave:

- [types.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\types.ts)
- [tree.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\tree.ts)
- [adapters/index.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\adapters\index.ts)
- [compiler.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\compiler.ts)
- [compiler-statement.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\compiler-statement.ts)
- [compiler-expression.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\compiler-expression.ts)
- [projection.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\projection.ts)
- [routines.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\routines.ts)
- [pseudocode.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\pseudocode.ts)
- [persistence.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\persistence.ts)
- [index.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\index.ts)

Responsabilidad:

- definir AST/editor document;
- definir tipos de bloques semánticos;
- proyectar filas y mapas de nodos;
- compilar a instrucciones de depuración;
- inferir firmas de rutinas y tipos;
- emitir pseudocódigo.

#### Tipos semánticos relevantes

- declaraciones
- asignaciones
- llamadas a estructura
- llamadas a rutina
- miembros de rutina
- `if`, `while`, `for-each`, `break`, `return`
- definición de función
- definición de tipo
- acceso y asignación de campos
- expresiones literales, variables, binarias, unarias, punteros, instancias tipadas

#### Regla central

**El árbol es la fuente de verdad.**

No líneas.
No indentación visual.
No orden accidental del DOM.

Eso hace más robusto:

- breakpoints;
- compilación;
- depuración;
- pseudocódigo;
- roundtrip editor ↔ compilador.

### 8.3 `play-editor`

Carpeta:

- `app/src/play-editor/`

Entrada React:

- [PlayEditorSurface.tsx](C:\Users\aguerra\Documents\thesis\app\src\play-editor\PlayEditorSurface.tsx)

Engine principal:

- [engine/PlayEditorEngine.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\engine\PlayEditorEngine.ts)

Responsabilidad:

- orquestar renderers;
- orquestar controladores de interacción;
- traducir eventos UI a cambios de documento;
- gestionar refs de líneas, bloques y slots;
- mantener compatibilidad entre editor DOM y árbol semántico.

## 9. Módulos internos de `play-editor`

### 9.1 `engine/`

Archivo principal:

- [PlayEditorEngine.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\engine\PlayEditorEngine.ts)

Responsabilidad:

- ciclo de vida;
- wiring de servicios;
- wiring de controladores;
- render global;
- prompts de usuario;
- sincronización de labels y tipos declarados;
- integración de wheel, drag y canvas.

### 9.2 `render/`

Archivos clave:

- [CanvasRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\CanvasRenderer.ts)
- [BlockInstanceRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\BlockInstanceRenderer.ts)
- [PaletteRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\PaletteRenderer.ts)
- [GhostRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\GhostRenderer.ts)
- [PreviewRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\PreviewRenderer.ts)
- [WheelOverlayRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\WheelOverlayRenderer.ts)
- [blockAccent.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\blockAccent.ts)

Responsabilidad:

- render de paleta;
- render de lienzo;
- render de bloques instanciados;
- render de cavidades/slots;
- render ghost drag;
- render overlay de wheel;
- aplicación de acentos visuales.

### 9.3 `interaction/`

Archivos clave:

- [DragInteractionController.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\DragInteractionController.ts)
- [BlockActionController.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\interaction\BlockActionController.ts)
- [WheelInteractionController.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\interaction\WheelInteractionController.ts)
- [HostInteractionController.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\interaction\HostInteractionController.ts)

Responsabilidad:

- drag and drop;
- apertura de wheel;
- cambio de modo de bloques;
- asignación de operaciones;
- limpieza de slots;
- reglas de host.

### 9.4 `services/`

Archivos clave:

- [PaletteDerivationService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\PaletteDerivationService.ts)
- [PaletteDescriptorService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\PaletteDescriptorService.ts)
- [DropPlacementService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\DropPlacementService.ts)
- [DragPreviewBlockFactory.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\DragPreviewBlockFactory.ts)
- [BlockTreeService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\BlockTreeService.ts)
- [BlockMutationService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\BlockMutationService.ts)

Responsabilidad:

- derivar paleta desde nivel y documento;
- mutar árbol legacy;
- aplicar drop en root, ramas y slots;
- construir previews de drag;
- buscar bloques.

### 9.5 `domain/`

Archivos:

- [LiteralParserService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\domain\LiteralParserService.ts)
- [VariableValidationService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\domain\VariableValidationService.ts)

Responsabilidad:

- parseo de literales;
- validación de nombres de variable.

## 10. Flujo editor → documento → compilación → runtime

### 10.1 Edición

Usuario mueve bloques.

Motor:

- deriva paleta;
- detecta slot target;
- construye preview;
- aplica mutación;
- genera nuevo `EditorDocument`.

### 10.2 Proyección

`program-editor-core/projection` genera:

- filas visuales;
- rows map;
- numeración;
- asociaciones `nodeId ↔ row`.

### 10.3 Compilación

`compiler.ts` y módulos `compiler-*` producen:

- `CompiledInstruction[]`
- operaciones del engine
- diagnósticos
- mapas `nodeId ↔ instruction`
- firmas de rutina
- firmas de tipo

### 10.4 Ejecución

`play-session/controller.ts` + `play-session/runtime/*`:

- prepara ejecución;
- maneja frames runtime;
- maneja locals;
- maneja iteración `for-each`;
- invoca operaciones del core engine;
- sincroniza board;
- gestiona breakpoints;
- gestiona stepping.

## 11. Depuración y sesión de ejecución

Carpeta:

- `app/src/features/play-session/`

Archivos clave:

- [controller.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\controller.ts)
- [types.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\types.ts)
- [runtime/interpreter.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\runtime\interpreter.ts)
- [runtime/instruction-executor.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\runtime\instruction-executor.ts)
- [runtime/runtime-memory.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\runtime\runtime-memory.ts)

Responsabilidad:

- cargar nivel;
- mantener estado de sesión;
- compilar documento activo;
- ejecutar `run`, `step`, `pause`, `reset`;
- mantener breakpoints;
- reflejar variables runtime;
- sincronizar structures board;
- validar éxito contra goal state.

### 11.1 Estado importante de sesión

- `document`
- `compiledProgram`
- `structures`
- `variableSnapshots`
- `events`
- `runState`
- `stepCursor`
- `highlightedNodeId`
- `breakpointNodeIds`

### 11.2 Limitaciones importantes ya visibles

Hay puntos delicados que cualquier futuro cambio debe recordar:

- parte del stepping visible aún depende de instrucciones `breakpointable`;
- llamadas de función usadas como expresión tienen ruta especial;
- hay coexistencia entre ejecución visible y evaluación directa;
- el coupling entre restricciones del nivel y presupuesto de edición puede producir bugs si no se separa.

## 12. Sistema de tipos actual

El editor ya no maneja solo valores primitivos.

Existen referencias de tipo declaradas:

- primitivo
- estructura
- tipo definido por usuario

Representación:

- `DeclaredTypeRef`

Archivo clave:

- [types.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\types.ts)

### 12.1 Tipos primitivos

- `text`
- `boolean`
- `value`

### 12.2 Tipos estructura

- `stack`
- `queue`
- `list`

### 12.3 Tipos usuario

- referencia por `typeRoutineId`

## 13. Funciones y tipos definidos por usuario

El proyecto ya soporta conceptos avanzados:

- `function_definition`
- `type_definition`
- `return`
- `expect`
- instancias tipadas
- acceso a campos
- asignación a campos

Esto implica que el editor ya es más que un puzzle solver. Es un lenguaje visual tipado en crecimiento.

## 14. Paleta: modelo actual

La paleta no es estática completa. Parte se deriva desde el documento y el scope.

Carriles actuales:

- base
- scope
- created

Responsabilidad:

- mostrar bloques fijos;
- mostrar variables visibles;
- mostrar funciones exportadas;
- mostrar tipos creados;
- mostrar accesos de campo.

Archivo clave:

- [PaletteDerivationService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\PaletteDerivationService.ts)

## 15. I18n

Archivos:

- [app/src/i18n.ts](C:\Users\aguerra\Documents\thesis\app\src\i18n.ts)
- [app/src/i18n-helpers.ts](C:\Users\aguerra\Documents\thesis\app\src\i18n-helpers.ts)

Responsabilidad:

- español e inglés;
- labels de bloques;
- mensajes;
- nombres de operaciones;
- textos de pantallas.

Regla práctica:

cualquier texto nuevo visible al usuario debe pasar por i18n.  
No meter strings hardcodeados si el comportamiento ya es bilingüe.

## 16. Documentos ya existentes relevantes

Documentos técnicos y de tesis ya presentes:

- [docs/play-editor-architecture.md](C:\Users\aguerra\Documents\thesis\docs\play-editor-architecture.md)
- [docs/editor-tree-architecture.md](C:\Users\aguerra\Documents\thesis\docs\editor-tree-architecture.md)
- [docs/documento-diseno-proyecto.md](C:\Users\aguerra\Documents\thesis\docs\documento-diseno-proyecto.md)
- [docs/documento-pruebas-funcionales.md](C:\Users\aguerra\Documents\thesis\docs\documento-pruebas-funcionales.md)
- [docs/cobertura-curricular-integral-inf261.md](C:\Users\aguerra\Documents\thesis\docs\cobertura-curricular-integral-inf261.md)

Material académico de referencia:

- `Estructuras2025-2/`

Uso recomendado:

- documentos de `docs/` para narrativa de tesis;
- este documento para contexto de ingeniería;
- carpeta `Estructuras2025-2` para trazabilidad curricular y alineación académica.

## 17. Archivos fuente de verdad por tema

### 17.1 Si problema es de rutas o pantallas

Ver:

- [App.tsx](C:\Users\aguerra\Documents\thesis\app\src\App.tsx)

### 17.2 Si problema es de nivel o restricciones

Ver:

- [game-system/src/index.ts](C:\Users\aguerra\Documents\thesis\game-system\src\index.ts)
- `app/public/levels/*.json`

### 17.3 Si problema es de carga, progreso o importación

Ver:

- [storage/src/index.ts](C:\Users\aguerra\Documents\thesis\storage\src\index.ts)

### 17.4 Si problema es de tipos, AST, compilación o pseudocódigo

Ver:

- `app/src/features/program-editor-core/*`

### 17.5 Si problema es de drag/drop, wheel, paleta o slots

Ver:

- `app/src/play-editor/*`

### 17.6 Si problema es de depuración, step, breakpoints o runtime

Ver:

- [controller.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\controller.ts)

### 17.7 Si problema es del tablero visual derecho

Ver:

- [ui-editor/src/index.tsx](C:\Users\aguerra\Documents\thesis\ui-editor\src\index.tsx)

## 18. Convenciones implícitas del proyecto

### 18.1 Fuente de verdad

- árbol semántico primero;
- legacy blocks como adaptación de interacción/render.

### 18.2 Editor imperativo

`PlayEditorEngine` no es React puro.  
Es motor imperativo dentro de una superficie React delgada.

Consecuencia:

- no mover lógica arbitrariamente a hooks sin revisar lifecycle;
- cuidado con listeners globales;
- cuidado con refs y render sincronizado.

### 18.3 Breakpoints

Apuntan a `nodeId`, no a número de línea visual.

### 18.4 Tipado

El sistema ya persigue tipado más fuerte que un editor casual.

Consecuencia:

- muchos bugs de UI terminan siendo bugs de tipado, adapters o compiler;
- no asumir que “si se ve bien ya funciona”.

## 19. Riesgos técnicos actuales

### 19.1 Doble modelo

Aunque árbol manda, todavía existe proyección legacy para el editor DOM.  
Eso introduce riesgo en:

- roundtrip de tipos;
- pérdida de metadata;
- diferencias entre compile path y render path.

### 19.2 Coupling entre restricción de nivel y presupuesto de edición

`maxSteps` ha sido usado en algunos puntos como límite de bloques editoriales.  
Eso es semánticamente peligroso.

Debería separarse en futuro:

- límite de pasos de ejecución;
- límite de complejidad o bloques de edición.

### 19.3 Depuración parcial de llamadas

El stepping visible y la evaluación directa de funciones todavía no están completamente unificados.

### 19.4 Complejidad de `PlayLevelScreen`

La pantalla concentra:

- layout;
- diálogos;
- controlador;
- redimensionamiento;
- output;
- board;
- editor.

Es archivo crítico y sensible a regresiones.

## 20. Estrategia recomendada para cambios futuros

### 20.1 Si cambio es semántico

Tocar primero:

1. `types.ts`
2. `adapters/index.ts` (o módulo concreto dentro de `adapters/*`)
3. `compiler.ts`
4. `controller.ts`
5. luego render/editor

### 20.2 Si cambio es solo visual

Tocar primero:

1. `ui-editor/src/index.tsx`
2. `app/src/styles.css`
3. renderers de `play-editor`

### 20.3 Si cambio es de paleta o wheel

Tocar:

1. `PaletteDerivationService`
2. `PaletteDescriptorService`
3. `WheelInteractionController`
4. `BlockActionController`
5. `BlockInstanceRenderer`

### 20.4 Si cambio es de estructura/tipo de variable

Tocar:

1. `DeclaredTypeRef`
2. `collectVariableDeclarations`
3. `synchronizeVariableLabels`
4. compatibilidad en compiler/runtime
5. board visual

## 21. Checklist mínimo antes de tocar código delicado

Antes de cambios grandes revisar:

1. qué módulo es dueño real del comportamiento;
2. si existe metadata que deba pasar por adapters;
3. si el cambio afecta compilación;
4. si afecta stepping o breakpoints;
5. si requiere i18n;
6. si rompe board visual;
7. si cambia comportamiento de tesis o pruebas funcionales documentadas.

## 22. Checklist mínimo después de cambios

Después de cambios relevantes validar:

1. `npx tsc -p app/tsconfig.json --noEmit`
2. build de paquete afectado
3. drag/drop
4. edición de slots
5. wheel
6. breakpoints
7. run/step/pause/reset
8. cambio de idioma
9. board derecho
10. niveles `mixed-playground` y `hanoi`

## 23. Mapa corto de archivos críticos

### Aplicación

- [app/src/App.tsx](C:\Users\aguerra\Documents\thesis\app\src\App.tsx)
- [app/src/styles.css](C:\Users\aguerra\Documents\thesis\app\src\styles.css)
- [app/src/i18n.ts](C:\Users\aguerra\Documents\thesis\app\src\i18n.ts)

### Pantalla de juego

- [app/src/features/play-ui/PlayLevelScreen.tsx](C:\Users\aguerra\Documents\thesis\app\src\features\play-ui\PlayLevelScreen.tsx)

### Runtime y debugger

- [app/src/features/play-session/controller.ts](C:\Users\aguerra\Documents\thesis\app\src\features\play-session\controller.ts)

### AST, compilación, proyección

- [app/src/features/program-editor-core/types.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\types.ts)
- [app/src/features/program-editor-core/adapters/index.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\adapters\index.ts)
- [app/src/features/program-editor-core/compiler.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\compiler.ts)
- [app/src/features/program-editor-core/projection.ts](C:\Users\aguerra\Documents\thesis\app\src\features\program-editor-core\projection.ts)

### Editor visual

- [app/src/play-editor/engine/PlayEditorEngine.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\engine\PlayEditorEngine.ts)
- [app/src/play-editor/DragInteractionController.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\DragInteractionController.ts)
- [app/src/play-editor/render/BlockInstanceRenderer.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\render\BlockInstanceRenderer.ts)
- [app/src/play-editor/services/PaletteDerivationService.ts](C:\Users\aguerra\Documents\thesis\app\src\play-editor\services\PaletteDerivationService.ts)

### Dominio externo

- [core-engine/src/index.ts](C:\Users\aguerra\Documents\thesis\core-engine\src\index.ts)
- [game-system/src/index.ts](C:\Users\aguerra\Documents\thesis\game-system\src\index.ts)
- [storage/src/index.ts](C:\Users\aguerra\Documents\thesis\storage\src\index.ts)
- [ui-editor/src/index.tsx](C:\Users\aguerra\Documents\thesis\ui-editor\src\index.tsx)

## 24. Conclusión operativa

Proyecto ya no es solo juego de bloques.  
Proyecto hoy combina:

- motor de TADs;
- modelo de niveles;
- editor visual tipado;
- compilador;
- depurador;
- runtime con visualización;
- documentación académica de soporte.

Para trabajar bien aquí:

- pensar por subsistemas;
- respetar fuente de verdad del árbol;
- no mezclar visual con semántica;
- no olvidar roundtrip editor ↔ compiler ↔ runtime;
- documentar decisiones cuando toquen tipado, depuración o nivel pedagógico.

## 25. Uso recomendado de este documento

Usar este archivo cuando haga falta:

- retomar contexto después de días;
- ubicar dueño de una responsabilidad;
- planificar refactors;
- preparar cambios para tesis;
- orientar a otro desarrollador;
- evitar tocar archivos equivocados.

Si arquitectura cambia fuerte, actualizar primero este archivo y luego documentos formales.
