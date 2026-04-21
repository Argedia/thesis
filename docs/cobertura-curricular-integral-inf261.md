# Cobertura Curricular Integral del Proyecto
## Alineación del ecosistema completo con el curso INF261 (Algoritmos y Estructura de Datos)

**Fecha:** 21 de abril de 2026  
**Proyecto evaluado:** plataforma visual de estructuras de datos (módulos `app`, `core-engine`, `game-system`, `storage`, `ui-editor`)  
**Documento base de referencia:** `docs/evaluacion-cumplimiento-silabo.md`  
**Evidencia académica adicional:** carpeta `Estructuras2025-2` (implementaciones de Pila, Cola y Lista simplemente enlazada)

---

## 1. Propósito y enfoque

Este documento reemplaza una visión parcial centrada solo en un bloque reciente del desarrollo y presenta una **cobertura curricular integral** del proyecto, considerando:

1. motor de estructuras y ejecución;
2. editor visual tree-first y compilación semántica;
3. sesión de juego con depuración;
4. catálogo y previsualización de niveles;
5. persistencia local e importación validada;
6. soporte multilenguaje;
7. trazabilidad con prácticas reales del curso (`Estructuras2025-2`).

El objetivo es responder con mayor precisión a: **qué tanto del curso INF261 está realmente cubierto hoy por el sistema completo, qué está parcialmente cubierto y qué queda como brecha de evolución**.

---

## 2. Fuentes y evidencia revisada

### 2.1. Documentación y arquitectura del proyecto
- `docs/evaluacion-cumplimiento-silabo.md`
- `docs/play-editor-architecture.md`
- `docs/editor-tree-architecture.md`

### 2.2. Núcleo funcional (ejecución y dominio)
- `core-engine/src/index.ts`
- `game-system/src/index.ts`

### 2.3. Editor semántico y compilación
- `app/src/features/program-editor-core/types.ts`
- `app/src/features/program-editor-core/compiler.ts`

### 2.4. Ejecución en sesión de juego
- `app/src/features/play-session/controller.ts`
- `app/src/features/play-ui/PlayLevelScreen.tsx`

### 2.5. Experiencia de niveles y datos
- `app/src/components/CommunityLevelsScreen.tsx`
- `app/src/components/EditorShell.tsx`
- `storage/src/index.ts`
- `app/public/levels/mixed-playground.json`

### 2.6. Internacionalización
- `app/src/i18n.ts`

### 2.7. Evidencia del curso (2025-2)
- `Estructuras2025-2/Pila/main.cpp`
- `Estructuras2025-2/Pila/BibliotecaPila/funcionesPila.h`
- `Estructuras2025-2/Cola/main.cpp`
- `Estructuras2025-2/Cola/BibliotecaCola/funcionesCola.h`
- `Estructuras2025-2/ListaSimplementeEnlazada/main.cpp`
- `Estructuras2025-2/ListaSimplementeEnlazada/BibliotecaLista/funcionesLista.h`

---

## 3. Descripción del sistema completo (estado actual)

El proyecto ya no es solo un prototipo de operaciones lineales aisladas; actualmente opera como un ecosistema con capas diferenciadas:

1. **Motor de estructuras (`core-engine`)**
- TAD ejecutables de `stack`, `queue`, `list`.
- Operaciones formales: `PUSH`, `POP`, `ENQUEUE`, `DEQUEUE`, `APPEND`, `PREPEND`, `REMOVE_FIRST`, `REMOVE_LAST`, `GET_HEAD`, `GET_TAIL`, `SIZE`, `TRANSFER`.
- Estado serializable (`EngineState`) y eventos de ejecución (`VALUE_EXTRACTED`, `VALUE_INSERTED`, etc.).

2. **Modelo de niveles (`game-system`)**
- Contrato `LevelDefinition` con estado inicial/objetivo, restricciones, layout de juego/editor y metadata académica.
- Validación de programa contra `goalState`.

3. **Editor visual + core semántico (`app`)**
- Arquitectura tree-first: el programa semántico es fuente de verdad.
- Bloques y nodos para control de flujo, expresiones, variables, funciones y tipos.
- Compilador con diagnósticos y mapeo nodo↔instrucción para depuración.

4. **Sesión de juego y depuración (`play-session`)**
- `run/step/pause/reset`, breakpoints por nodo, cursor de ejecución.
- Evaluación de expresiones, llamadas de rutina, for-each y break.
- Registro de eventos y snapshots de variables para tablero.

5. **Experiencia de catálogo y nivel**
- Pantalla de comunidad con filtros, búsqueda, importación JSON y previsualización progresiva.
- Play screen dual (consola de programa + tablero de ejecución), resize de paneles, salida diagnóstica/runtime.

6. **Persistencia y calidad de datos (`storage`)**
- Repositorio de niveles (`JsonLevelRepository`) con validación estricta de esquema (zod).
- Persistencia de progreso y preferencias de UI.

7. **Internacionalización**
- i18n EN/ES para editor, ejecución, mensajes de tipo, categorías, acciones y restricciones.

---

## 4. Cobertura curricular por ejes del curso INF261

### 4.1. Fundamentos de algoritmo, dato y estructura (Cap. 1)
**Nivel de cobertura: Alto (práctico), Medio (teórico explícito)**

Aportes cubiertos:
- formulación algorítmica paso a paso en editor visual;
- ejecución controlada con observación de estado;
- relación instrucción→efecto mediante timeline/eventos.

Límite actual:
- no existe un módulo teórico formal dentro de la plataforma que sustituya clases expositivas del sílabo.

### 4.2. Estructuras lineales (Cap. 4: pilas, colas, listas)
**Nivel de cobertura: Alto**

Correspondencia observable con prácticas del curso:
- **Pila:** `apilar/desapilar/cima/longitud/vacía` ↔ `PUSH/POP/SIZE` + visualización LIFO.
- **Cola:** `encolar/desencolar/longitud/vacía` ↔ `ENQUEUE/DEQUEUE/SIZE` + visualización FIFO.
- **Lista:** inserciones y eliminaciones en extremos + consulta de cabeza/cola y tamaño.

Además:
- soporte de restricciones por nivel (`allowedOperations`, `maxSteps`) que refuerza disciplina algorítmica.

### 4.3. Control de flujo (secuencial, condicional, repetitivo)
**Nivel de cobertura: Alto**

Implementado en tipos/nodos/instrucciones:
- condicional (`if`, `if-else`),
- `while`,
- `for-each`,
- `break`,
- `return` (según reglas de rutina).

El compilador y runtime validan reglas de uso (por ejemplo `break` fuera de loop).

### 4.4. Expresiones y lógica computacional
**Nivel de cobertura: Alto**

Cobertura funcional:
- literales (`text`, `boolean`, `value`),
- operadores aritméticos,
- operadores lógicos,
- operadores de comparación,
- slots tipados (`value`, `boolean`, `any`) en construcción de bloques.

### 4.5. Variables, memoria y referencia
**Nivel de cobertura: Medio-Alto**

Disponible hoy:
- declaración (`declare`) y parámetros (`expect`),
- asignación,
- lectura,
- referencia/puntero (`pointer`) en el modelo semántico.

También hay snapshots para tablero de variables en runtime.  
Brecha pendiente para máxima alineación didáctica:
- representación de memoria con grafo de referencias (cajas y flechas) todavía requiere consolidación visual más explícita.

### 4.6. Funciones y modularización
**Nivel de cobertura: Medio-Alto**

Incluye:
- definición de función,
- parámetros (`expect`),
- retorno,
- llamadas entre rutinas,
- control de profundidad de llamada para evitar recursión/cadena no acotada en runtime.

Esta capa ya apoya competencias de modularidad y reutilización.

### 4.7. Tipos y estructuras definidas por usuario
**Nivel de cobertura: Medio**

Se observa infraestructura para:
- `type_definition`,
- instanciación de tipo,
- lectura/asignación de campo,
- chequeos de compatibilidad (`unknown_type`, `unknown_type_field`, `type_mismatch_*`).

La cobertura es real pero aún en estabilización UX/flujo pedagógico completo.

### 4.8. Depuración y metacognición algorítmica
**Nivel de cobertura: Alto**

Fortalezas:
- breakpoints por nodo semántico (no por línea frágil),
- `run/step/pause/reset`,
- salida de ejecución y salida diagnóstica,
- mapeo de instrucciones compiladas para seguimiento del flujo real.

Esto aporta mucho valor para aprendizaje activo en INF261.

### 4.9. Evaluación por niveles y práctica guiada
**Nivel de cobertura: Medio-Alto**

La plataforma ya permite:
- múltiples niveles,
- metadata (dificultad, estructuras usadas, autor, origen),
- importación de niveles,
- previsualización compacta con restricciones.

Aún puede crecer hacia rúbricas de evaluación más formales por resultado de aprendizaje.

### 4.10. Competencias de ingeniería de software (transversales)
**Nivel de cobertura: Alto**

El proyecto evidencia prácticas de diseño relevantes para formación moderna:
- separación por módulos y responsabilidades;
- tipado explícito de contratos;
- validación de datos de entrada;
- internacionalización;
- arquitectura preparada para evolución incremental.

---

## 5. Matriz de trazabilidad (resultado de aprendizaje ↔ evidencia)

| Resultado de aprendizaje INF261 | Evidencia en proyecto | Estado |
|---|---|---|
| Implementar y manipular TAD lineales | `core-engine` + niveles con restricciones + tablero | Cumplido (alto) |
| Diseñar algoritmos con control de flujo | nodos/instrucciones `if`, `while`, `for-each`, `break` | Cumplido (alto) |
| Usar variables y tipos de forma consistente | `declare/assign/read/reference`, `declaredTypeRef`, diagnósticos de tipo | Parcial alto |
| Modularizar con funciones y parámetros | `function_definition`, `expect`, `return`, `routine_call` | Cumplido (medio-alto) |
| Depurar y validar ejecución | breakpoints, step/run/pause, salida diagnóstica/runtime | Cumplido (alto) |
| Transferir entre representaciones (código↔modelo) | tree-first + compilador + pseudocódigo (infraestructura) | Parcial alto |
| Comparar estructuras por requerimientos del problema | catálogo por estructuras, restricciones por operación | Parcial (mejorable) |

---

## 6. Relación directa con Estructuras 2025-2

La carpeta `Estructuras2025-2` confirma que la práctica del curso trabaja TAD lineales por operaciones canónicas en C++. El proyecto se alinea porque mantiene la misma semántica operacional, pero la traduce a una interfaz visual depurable.

Equivalencias didácticas clave:

1. **Pila**
- Curso: `apilar`, `desapilar`, `cima`, `longitud`, `esPilaVacia`.
- Plataforma: `PUSH`, `POP`, `SIZE`, observación del tope y estado.

2. **Cola**
- Curso: `encolar`, `desencolar`, `longitud`, `esColaVacia`.
- Plataforma: `ENQUEUE`, `DEQUEUE`, `SIZE`, conservación FIFO visible.

3. **Lista simplemente enlazada**
- Curso: inserción en inicio/final/en orden, eliminación de nodo, destrucción.
- Plataforma: `APPEND`, `PREPEND`, `REMOVE_FIRST`, `REMOVE_LAST`, `GET_HEAD`, `GET_TAIL`, `SIZE`.

Conclusión de esta relación: el sistema no reemplaza la implementación de punteros en C++, pero sí fortalece el entendimiento conductual y la validación del algoritmo sobre estructuras lineales.

---

## 7. Fortalezas curriculares del proyecto

1. Aprendizaje activo orientado a ejecución real y feedback inmediato.
2. Reducción de fricción sintáctica para enfocarse en semántica algorítmica.
3. Depuración integrada desde etapas tempranas de formación.
4. Tipado y diagnósticos que promueven corrección conceptual.
5. Soporte EN/ES útil para accesibilidad pedagógica.
6. Arquitectura que permite escalar cobertura curricular sin reescritura total.

---

## 8. Brechas y riesgos académicos actuales

1. Algunas experiencias de tipo/estructura definida por usuario todavía están en fase de consolidación UX.
2. La visualización de memoria referencial compleja (punteros entre objetos) requiere estandarización final para máximo valor didáctico.
3. Cobertura de capítulos no lineales del sílabo (árboles, grafos, recursión avanzada) sigue pendiente por alcance.
4. Falta integrar analítica/rúbricas automáticas por competencia para evaluación docente más robusta.

---

## 9. Estimación de cobertura curricular (visión integral)

### 9.1. Dentro del alcance activo del producto (lineales + programación visual + depuración)
- Cobertura estimada: **70% a 85%**.

### 9.2. Respecto al sílabo completo INF261 (incluyendo no lineales)
- Cobertura estimada: **55% a 70%**.

Estas bandas reflejan un estado de producto en evolución, no un corte final de tesis.

---

## 10. Recomendaciones de evolución (priorizadas)

1. Consolidar representación visual de memoria referencial con flechas determinísticas.
2. Endurecer aún más validación de tipado previo a ejecución y mensajes pedagógicos por error.
3. Añadir actividades comparativas de costo/eficiencia entre estructuras.
4. Formalizar módulo de rúbricas por resultado de aprendizaje.
5. Extender en fases a recursión guiada, árboles y grafos para cerrar brecha global del sílabo.

---

## 11. Conclusión general

Tomando el proyecto completo, no solo el último módulo, la evidencia indica que la plataforma ya constituye una **base curricular sólida para INF261 en su eje de algoritmos y estructuras lineales**, con fortalezas claras en ejecución visual, depuración, modelado por bloques y validación semántica.

El estado actual es suficientemente maduro para sustentar uso académico en laboratorio y práctica guiada, y al mismo tiempo muestra una ruta técnica clara para ampliar cobertura hacia el sílabo completo.

---

## 12. Anexo A: Inventario funcional observado en tipos/nodos

Del modelo semántico (`program-editor-core/types.ts`) se identifican, entre otros:

- Bloques de definición: `function_definition`, `type_definition`.
- Flujo: `conditional`, `while`, `for_each`, `break`, `return`.
- Variables/memoria: `var_declaration`, `var_assign`, `var_read`, `var_reference`.
- Tipos: `type_instance_new`, `type_field_read`, `type_field_assign`.
- Rutinas: `routine_call`, `routine_value`, `routine_member`.
- Expresiones: literales, binarias, unarias, punteros, instancia de tipo y acceso a campo.

Esto confirma que la plataforma ya trabaja más allá de una maqueta de operaciones sueltas y dispone de un lenguaje visual con semántica explícita.

---