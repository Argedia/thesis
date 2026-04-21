# Documento de Diseño del Proyecto
## Plataforma Visual de Algoritmos y Estructuras de Datos

**Versión:** 1.0  
**Fecha:** 21 de abril de 2026  
**Repositorio:** `visual-data-structures-editor`  
**Idioma del documento:** Español

---

## 1. Resumen ejecutivo

Este documento define el diseño integral del proyecto **Plataforma Visual de Algoritmos y Estructuras de Datos**, una solución orientada al aprendizaje activo de programación y estructuras de datos mediante edición visual por bloques, compilación semántica, ejecución paso a paso, depuración con breakpoints y verificación sobre niveles con estado inicial/objetivo.

El sistema está diseñado como un **monorepo modular**, con separación clara entre:

1. motor de dominio y ejecución de estructuras (`core-engine`),
2. modelo de niveles y validación (`game-system`),
3. almacenamiento y persistencia (`storage`),
4. biblioteca de componentes visuales (`ui-editor`),
5. aplicación interactiva de usuario (`app`).

El objetivo pedagógico principal es brindar una experiencia de construcción algorítmica donde el estudiante pueda:
- modelar lógica de control y manipulación de datos,
- observar consecuencias de cada instrucción,
- depurar con precisión nodal,
- recibir diagnósticos semánticos tempranos.

---

## 2. Objetivos de diseño

## 2.1. Objetivos funcionales

1. Permitir resolver niveles sobre estructuras (pila, cola, lista) con restricciones de pasos y operaciones.
2. Ofrecer un editor visual que transforme bloques en un programa semántico ejecutable.
3. Permitir ejecución en modo `run` y `step`, con `pause`, `reset` y `clear`.
4. Soportar funciones, tipos definidos por usuario, variables tipadas, referencias y acceso a campos.
5. Mostrar estado de estructuras y variables en un tablero visual durante la ejecución.
6. Mantener progresión de usuario (niveles completados) y preferencias de UI en persistencia local.
7. Operar en español e inglés con traducción consistente de UI, acciones y diagnósticos.

## 2.2. Objetivos no funcionales

1. **Mantenibilidad:** arquitectura por módulos, contratos tipados y separación de responsabilidades.
2. **Extensibilidad:** posibilidad de añadir nuevos bloques, tipos y reglas sin rediseño total.
3. **Confiabilidad:** validación de entradas, compilación con diagnósticos y control de errores en runtime.
4. **Trazabilidad pedagógica:** mapeo de nodos semánticos a instrucciones ejecutadas.
5. **Portabilidad:** stack web estándar (TypeScript + React) y ejecución local sin backend obligatorio.

---

## 3. Alcance del sistema

## 3.1. Alcance actual

- Estructuras lineales operativas: `stack`, `queue`, `list`.
- Construcción visual de programas con bloques.
- Compilación tree-first con diagnósticos.
- Depuración por breakpoints de nodo.
- Rutinas, llamadas, retorno, y rutinas tipo objeto.
- Tipado con primitivas, estructuras y tipos de usuario.
- Catálogo comunitario de niveles con importación JSON.

## 3.2. Fuera de alcance actual (iteración vigente)

- Motor de evaluación masiva en servidor.
- Colaboración multiusuario en tiempo real.
- Analítica docente avanzada (dashboards de cohortes).
- Cobertura completa de estructuras no lineales (árboles/grafos) en runtime visual final.

---

## 4. Principios arquitectónicos

1. **Tree-first state:** la fuente de verdad del programa es un árbol semántico (`EditorDocument.program`), no la representación visual.
2. **Separación dominio/UI:** la lógica de estructuras y compilación vive fuera de React.
3. **Contratos explícitos:** los tipos (`types.ts`) gobiernan interacción entre capas.
4. **Orquestador delgado:** `PlayEditorEngine` coordina servicios/renderers/controladores; no concentra reglas de negocio.
5. **Diagnóstico temprano:** el compilador marca inconsistencias antes de ejecución.
6. **Persistencia robusta:** `storage` valida esquemas con `zod`.
7. **Internacionalización transversal:** claves i18n para mensajes funcionales y pedagógicos.

---

## 5. Estructura del monorepo

```text
/
├─ core-engine/      # Motor de estructuras y ejecución de operaciones
├─ game-system/      # Contratos de nivel y validación de programa
├─ storage/          # Repositorios, persistencia local, validación de JSON
├─ ui-editor/        # Componentes UI reutilizables y tablero visual
├─ app/              # Aplicación React principal (rutas, sesiones, editor)
├─ docs/             # Documentación de arquitectura y cobertura
└─ scripts/          # utilidades de control de calidad
```

`package.json` usa workspaces y compone build en cascada por paquete.

---

## 6. Arquitectura lógica (vista de alto nivel)

```text
Usuario
  │
  ▼
app (React)
  ├─ UI de catálogo y juego
  ├─ PlayLevelScreen
  └─ PlayEditorSurface (wrapper)
        │
        ▼
play-editor (engine imperativo)
  ├─ render/
  ├─ interaction/
  ├─ services/
  └─ domain/
        │
        ▼
program-editor-core
  ├─ tipos / árbol
  ├─ adapters/projection
  ├─ compiler
  └─ pseudocode
        │
        ▼
play-session controller
  ├─ compilación + estado de sesión
  └─ ejecución sobre core-engine
        │
        ▼
core-engine (stack/queue/list + eventos)

Datos auxiliares:
- game-system: contrato de nivel + validateProgram
- storage: repositorios JSON/localStorage + schemas
- i18n: traducciones EN/ES
```

---

## 7. Diseño por módulos

## 7.1. `core-engine`

### Responsabilidad
Implementar estructuras, operaciones permitidas y evolución del estado del motor.

### Entidades clave
- `StructureSnapshot`, `DataStructure`, `EngineState`.
- `StackStructure`, `QueueStructure`, `ListStructure`.
- `VisualExecutionEngine`.

### Operaciones soportadas
- Inserción: `PUSH`, `ENQUEUE`, `APPEND`, `PREPEND`.
- Extracción: `POP`, `DEQUEUE`, `REMOVE_FIRST`, `REMOVE_LAST`.
- Lectura: `GET_HEAD`, `GET_TAIL`, `SIZE`.
- Compuesta: `TRANSFER`.

### Diseño relevante
- Inmutabilidad operacional: operaciones devuelven nuevas estructuras.
- Serialización de estado para UI.
- Emisión de eventos para timeline/tablero.

---

## 7.2. `game-system`

### Responsabilidad
Definir el contrato de nivel y validar el resultado de un programa contra un objetivo.

### Tipos clave
- `LevelDefinition`.
- `LevelConstraints`.
- `PlayLayout` / `EditorLayout`.
- `validateProgram(level, program)`.

### Diseño relevante
- Estado normalizado antes de comparar objetivo.
- Independencia de UI: valida contra snapshots de estructuras.

---

## 7.3. `storage`

### Responsabilidad
Persistencia y entrada/salida de niveles/progreso/preferencias.

### Repositorios
- `JsonLevelRepository`.
- `LocalProgressRepository`.
- `LocalUiPreferencesRepository`.

### Diseño relevante
- Validación estricta con `zod` para niveles importados.
- Normalización de niveles importados (defaults de layout/metadata/tooling).
- Tolerancia a errores de parseo (fallback seguro).

---

## 7.4. `ui-editor`

### Responsabilidad
Componentes visuales base: paneles, board, timeline, layout containers.

### Diseño relevante
- `StructuresBoard` dibuja en canvas con layout determinístico.
- Soporte de snapshots de variables:
  - primitivas,
  - punteros,
  - objetos tipados,
  - referencias a rutinas.
- Renderizado de enlaces de referencia entre tarjetas de variables.

---

## 7.5. `app`

### Responsabilidad
Aplicación de usuario final y orquestación de casos de uso.

### Rutas
- `/` menú principal,
- `/play` catálogo de niveles,
- `/play/:levelId` sesión de juego + editor,
- `/campaign` campaña,
- `/editor` shell de edición avanzada.

### Componentes clave
- `CommunityLevelsScreen` (catálogo, filtros, preview progresivo, importación).
- `PlayLevelScreen` (editor + tablero + salida runtime/diagnóstica).
- `EditorShell` (layout de panels para edición de nivel).
- `AppShell` (idioma y salida de rutas).

### Estado y sincronización
- `useUiLayoutStore` (zustand) para layout player/editor.
- `useUiPreferencesSync` para guardar/cargar preferencias en localStorage.

---

## 8. Diseño del editor de programas

## 8.1. Modelo semántico (`program-editor-core`)

El modelo central define:

- `EditorBlockKind` con soporte para:
  - estructuras y valores,
  - control de flujo (`conditional`, `while`, `for_each`, `break`),
  - variables (`var_declaration`, `var_assign`, `var_read`, `var_reference`),
  - funciones y tipos (`function_definition`, `type_definition`, `type_instance_new`, `type_field_read`, `type_field_assign`),
  - rutinas y miembros (`routine_call`, `routine_value`, `routine_member`).

- AST de statements/expressions:
  - `StatementNode` y `ExpressionNode`.

- Tipado:
  - `DeclaredTypeRef` con `primitive`, `structure`, `user`.

### Decisión crítica
Separar completamente:
- vista de bloques legacy para interacción DOM,
- estado canónico en árbol semántico.

Esto permite compilar, mapear breakpoints y exportar pseudocódigo de forma consistente.

## 8.2. `play-editor` (engine imperativo de interacción)

### Capas internas
- `render/` = pintura y widgets.
- `interaction/` = drag, wheel, acciones.
- `services/` = derivación de paleta, mutación de árbol, drop placement.
- `domain/` = validación/parseo de literales y variables.

### Flujo principal
1. `PlayEditorSurface` monta `PlayEditorEngine`.
2. El engine deriva paleta y líneas del canvas.
3. Controladores capturan input y mutan árbol vía servicios.
4. Cambios se propagan por `onChange` como `EditorDocument`.

### Diseño relevante
- Wheel contextual por tipo de bloque.
- Slots tipados y compatibilidad de inserción.
- Drag preview y ghost diferenciados.
- Paleta derivada por lanes (Base / Scope / Created).

---

## 9. Compilación y ejecución

## 9.1. Compilación (`compiler.ts`)

### Responsabilidad
Convertir AST en `CompiledInstruction[]`, `OperationDefinition[]`, diagnósticos y mapas de trazabilidad.

### Características
- Diagnósticos de completitud y tipado.
- Validaciones estructurales:
  - conflictos función/tipo,
  - `return` inválido en rutina tipo,
  - `break` fuera de loops,
  - `for-each` inválido sin estructura.
- Diagnósticos de tipo:
  - `type_mismatch_assign`,
  - `type_mismatch_field_assign`,
  - `type_mismatch_expect_arg`,
  - `unknown_type`, `unknown_type_field`.

### Resultado
`CompileResult` por rutina + rutina activa + firmas de rutina.

## 9.2. Sesión (`play-session/controller.ts`)

### Responsabilidad
Orquestar ciclo de vida de nivel/programa:
- carga de nivel,
- compilación,
- ejecución continua o paso a paso,
- pausa/reinicio,
- breakpoints,
- status y eventos,
- snapshots de variables y estructuras.

### Flujo Run/Step
1. `prepareExecution()` valida compilación.
2. Si hay diagnósticos: no ejecuta y reporta estado.
3. Si es válido: interpreta/ejecuta instrucciones sobre engine.
4. Actualiza foco de ejecución y eventos.
5. Detecta condición de éxito (`goalMatches`).

### Modo de salida en UI
`PlayLevelScreen` usa `outputMode`:
- `hidden`,
- `runtime`,
- `diagnostics`.

La salida diagnóstica se abre en intentos con compilación incompleta.

---

## 10. Diseño de UX principal

## 10.1. Catálogo de niveles (`CommunityLevelsScreen`)

- Filtros por fuente, estructuras, dificultad y completitud.
- Búsqueda por título/autor/descripción.
- Previsualización compacta por secciones colapsables:
  - estado inicial,
  - estado objetivo,
  - restricciones.
- Importación de niveles JSON con validación estructural.

## 10.2. Pantalla de juego (`PlayLevelScreen`)

- Layout dual: consola de programa + tablero de ejecución.
- Divider arrastrable para resize horizontal.
- Barra de controles por iconos con tooltip.
- Modalidades de diálogo:
  - texto,
  - selector,
  - declaración (tipo + nombre),
  - alerta.
- Tab de rutinas con creación/selección/rename.

## 10.3. Internacionalización

`i18n.ts` define recursos EN/ES para:
- navegación,
- acciones,
- categorías de editor,
- bloques,
- operaciones,
- mensajes de validación y tipado,
- textos de preview y tablero.

---

## 11. Modelo de datos y contratos

## 11.1. Nivel (`LevelDefinition`)

Contiene:
- `initialState`, `goalState`,
- `constraints` (`allowedOperations`, `maxSteps`),
- metadata (`source`, `difficulty`, `structuresUsed`, `author`, `description`),
- layout de paneles player/editor,
- `tooling` opcional.

## 11.2. Documento de editor (`EditorDocument`)

Contiene:
- `routines[]` con `ProgramNode` y `StatementNode[]`,
- `activeRoutineId`.

## 11.3. Estado de sesión (`PlaySessionState`)

Contiene:
- nivel actual,
- snapshots de estructuras/variables,
- eventos de ejecución,
- runState,
- breakpoints,
- nodo resaltado,
- estado textual,
- compilación activa,
- documento activo.

---

## 12. Reglas semánticas críticas

1. `break` solo válido en `while` o `for-each`.
2. `return` restringido por tipo de rutina.
3. `function_definition` y `type_definition` son excluyentes por rutina.
4. Tipado de asignación y argumentos validado en compile/runtime.
5. `for-each` requiere estructura fuente compatible.

Estas reglas están distribuidas entre compilador (validación primaria) y runtime (guardas defensivas).

---

## 13. Estrategia de persistencia

- Progreso (`completedLevelIds`, `lastPlayedLevelId`) en localStorage.
- Preferencias de layout player/editor en localStorage.
- Niveles importados se almacenan y mezclan con niveles bundle.
- Validación en carga para evitar corrupción de estado por JSON malformado.

---

## 14. Estrategia de calidad y pruebas recomendadas

## 14.1. Pruebas unitarias

1. `core-engine`: operaciones por estructura y eventos emitidos.
2. `compiler`: diagnósticos de completitud/tipo/control de flujo.
3. `PaletteDerivationService`: visibilidad condicional de bloques por contexto.
4. `storage`: validación de niveles importados y normalización.

## 14.2. Pruebas de integración

1. Drag/drop desde paleta hasta AST compilable.
2. Run/Step/Pause con breakpoints en nodos ejecutables.
3. Sincronía de rutina activa y foco visual de ejecución.
4. Flujo de diálogos para declaración, selección y renombrado.

## 14.3. Pruebas E2E (objetivo)

1. Resolver un nivel simple completo desde cero.
2. Importar nivel y jugarlo.
3. Cambiar idioma en runtime y validar textos de interfaz y diagnósticos.

---

## 15. Performance y escalabilidad

## 15.1. Estado actual

- Canvas de tablero redibuja por resize/state update.
- Compilación se recalcula al cambiar documento.
- Lógica de editor separada para minimizar rerender de React.

## 15.2. Riesgos de performance

1. Documentos grandes con muchas rutinas/nodos.
2. Recompilación completa ante cambios pequeños.
3. Render canvas de alta densidad con múltiples variables enlazadas.

## 15.3. Mejoras propuestas

1. Compilación incremental por rutina/nodo afectado.
2. Memoización de firmas/diagnósticos por hash de subárbol.
3. Virtualización de timeline de eventos largos.
4. Batch de repaints canvas en `requestAnimationFrame`.

---

## 16. Seguridad y robustez

## 16.1. Superficie principal

- Importación de niveles JSON desde usuario.
- Persistencia local.
- Ejecución de operaciones sobre estado in-memory.

## 16.2. Controles existentes

- Validación de esquema con `zod`.
- Normalización de datos de estructuras.
- Errores tipados/reportados en compilación y ejecución.

## 16.3. Recomendaciones

1. Limitar tamaño máximo de JSON importado.
2. Sanitizar strings mostrados en tags/labels dinámicas.
3. Añadir telemetría de errores (opt-in) para trazabilidad de fallos runtime.

---

## 17. Decisiones técnicas registradas

1. **Tree-first como source of truth** para resolver fragilidad de line-number semantics.
2. **Breakpoints por nodeId** en lugar de línea visual para estabilidad ante reordenamientos.
3. **Monorepo por paquetes** para separar dominio, UI y persistencia.
4. **Zod en storage** para blindar importaciones y parsing.
5. **i18n centralizado** en `app/src/i18n.ts` con recursos ES/EN.
6. **Engine imperativo para editor** para control fino de drag/drop/wheel sin sobrecarga React.


---

## 18. Riesgos de desarrollo de proyecto y mitigaciones

1. **Complejidad creciente del lenguaje visual**
- Mitigación: mantener contrato tipado y checklist de switches exhaustivos por `EditorBlockKind`.

2. **Regresiones por alta frecuencia de cambios UX**
- Mitigación: pruebas smoke automáticas de run/step/breakpoint/drag.

3. **Desalineación entre modelo semántico y rendering legacy**
- Mitigación: reforzar adapters y tests de roundtrip.

4. **Sobrecarga cognitiva en pantalla de juego**
- Mitigación: mantener disclosure progresivo y estados de salida contextuales.

---

## 19. Conclusión

El proyecto presenta una arquitectura madura para su objetivo: **enseñar y practicar algoritmos y estructuras de datos de forma visual, ejecutable y depurable**.

Su mayor fortaleza es la combinación de:
- modelado semántico robusto,
- interacción visual rica,
- compilación con diagnósticos,
- ejecución observable,
- persistencia y catálogo de niveles.

La base técnica actual permite evolucionar hacia mayor cobertura curricular sin romper el núcleo del sistema, siempre que se mantenga la disciplina de diseño modular, contratos tipados y validación temprana.

---
