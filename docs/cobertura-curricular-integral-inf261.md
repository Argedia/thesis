# Cobertura Curricular Integral del Proyecto de Tesis
## Alineación con el curso INF261: Algoritmos y Estructuras de Datos

**Fecha:** 21 de abril de 2026
**Autor:** Ariel Guerra
**Curso de referencia:** INF261 — Algoritmos y Estructuras de Datos

---

## 1. Descripción del proyecto

El proyecto de tesis consiste en una **plataforma web interactiva para el aprendizaje de estructuras de datos y algoritmos mediante programación visual**. La plataforma permite a los estudiantes construir soluciones algorítmicas arrastrando y conectando bloques visuales —sin escribir código— y observar en tiempo real cómo los datos se mueven y transforman dentro de estructuras como pilas, colas y listas.

El modelo de uso es el de un ambiente de **resolución de puzzles pedagógicos**: cada nivel presenta una configuración inicial de estructuras de datos y un estado objetivo que el estudiante debe alcanzar diseñando un programa visual. Al ejecutar su solución, el sistema valida si el estado final coincide con el objetivo.

La plataforma está compuesta por cuatro capas funcionales independientes:

1. **Motor de ejecución** — implementa las estructuras de datos y ejecuta operaciones sobre ellas de forma controlada y observable.
2. **Sistema de niveles** — define los puzzles, sus restricciones y la lógica de validación de soluciones.
3. **Editor visual y compilador** — permite construir programas mediante bloques visuales y los traduce a instrucciones ejecutables.
4. **Sesión de juego** — orquesta la ejecución, el debugging paso a paso y el registro de progreso del estudiante.

---

## 2. Estructuras de datos implementadas

La plataforma implementa las tres estructuras lineales centrales del curso INF261:

### 2.1 Pila (Stack)

Estructura con comportamiento LIFO (Last In, First Out). Soporta las operaciones:

- **Inserción** en el tope (`PUSH`).
- **Extracción** desde el tope (`POP`).
- **Consulta de tamaño** (`SIZE`).

Equivalencia directa con las prácticas del curso, donde las operaciones canónicas son `apilar`, `desapilar`, `cima`, `longitud` y `esPilaVacia`.

### 2.2 Cola (Queue)

Estructura con comportamiento FIFO (First In, First Out). Soporta las operaciones:

- **Inserción** al final (`ENQUEUE`).
- **Extracción** desde el frente (`DEQUEUE`).
- **Consulta de tamaño** (`SIZE`).

Equivalencia directa con las operaciones del curso: `encolar`, `desencolar`, `longitud` y `esColaVacia`.

### 2.3 Lista simplemente enlazada (Singly-Linked List)

Estructura secuencial con referencias explícitas entre nodos. Soporta las operaciones:

- **Inserción al final** (`APPEND`).
- **Inserción al inicio** (`PREPEND`).
- **Eliminación del primer elemento** (`REMOVE_FIRST`).
- **Eliminación del último elemento** (`REMOVE_LAST`).
- **Lectura del nodo cabeza** (`GET_HEAD`).
- **Lectura del nodo cola** (`GET_TAIL`).
- **Consulta de tamaño** (`SIZE`).

Equivalencia con las operaciones del curso: `insertarAlInicio`, `insertarAlFinal`, `eliminaNodo`, `obtenerUltimoNodo`, entre otras.

Las estructuras están diseñadas con **inmutabilidad**: cada operación produce una nueva instancia de la estructura en lugar de modificar la existente. Este diseño facilita la observación del historial de estados durante la ejecución.

---

## 3. El modelo de programación visual

El componente central de la plataforma desde la perspectiva pedagógica es el **editor visual de programas**. Los estudiantes construyen su solución seleccionando y ordenando bloques que representan operaciones, estructuras de control y expresiones. El conjunto de bloques disponibles incluye:

### 3.1 Control de flujo

- Condicional simple (`if`) y con alternativa (`if-else`).
- Ciclo con condición (`while`).
- Ciclo de recorrido sobre colección (`for-each`).
- Interrupción de ciclo (`break`).
- Retorno de función (`return`).

### 3.2 Variables y memoria

- Declaración de variable.
- Asignación de valor.
- Lectura de variable.
- Referencia entre variables.

### 3.3 Expresiones

- Literales de texto, valor numérico y booleano.
- Operadores aritméticos, lógicos y de comparación.

### 3.4 Funciones y modularización

- Definición de función con parámetros y retorno.
- Llamada a función desde otras rutinas.
- Soporte para múltiples rutinas dentro de un mismo programa.

### 3.5 Tipos definidos por el usuario

- Definición de tipo personalizado.
- Creación de instancias del tipo.
- Lectura y asignación de campos.

El programa visual construido por el estudiante es procesado por un **compilador interno** que lo traduce a instrucciones de bajo nivel y verifica errores semánticos antes de la ejecución (por ejemplo: uso de `break` fuera de un ciclo, tipos incompatibles, bloques incompletos). Los errores se reportan como diagnósticos asociados a los bloques específicos que los causan.

---

## 4. Ejecución, depuración y retroalimentación

La plataforma ofrece un ambiente de ejecución controlado que apoya explícitamente el desarrollo de competencias de depuración:

- **Ejecución completa** del programa con observación del estado final.
- **Ejecución paso a paso** (`step`), mostrando qué bloque se está ejecutando en cada momento.
- **Pausa y reanudación** de la ejecución.
- **Reinicio** al estado inicial del nivel.
- **Puntos de interrupción** (`breakpoints`) asociados a bloques visuales específicos, no a líneas de código.
- **Panel de variables** que muestra el valor de cada variable en el momento actual de la ejecución.
- **Historial de eventos** de ejecución (qué valores fueron extraídos e insertados, en qué orden).
- **Salida diagnóstica** con mensajes de error de compilación y de ejecución.

Cuando el estudiante ejecuta su programa, puede observar visualmente cómo los valores se desplazan entre las estructuras de datos: el sistema anima la extracción de un valor, su "traslado" temporal y su inserción en la estructura destino. Esto hace explícita la semántica de cada operación.

---

## 5. Sistema de niveles y evaluación de soluciones

Cada nivel de la plataforma es una unidad pedagógica autónoma con los siguientes componentes:

- **Estado inicial**: configuración de partida de las estructuras (qué valores contiene cada una).
- **Estado objetivo**: configuración que el estudiante debe alcanzar con su programa.
- **Restricciones**: operaciones permitidas, número máximo de pasos, bloques prohibidos. Esto obliga a pensar en eficiencia y elección de estructura adecuada.
- **Metadatos académicos**: dificultad (fácil/media/difícil), estructuras involucradas, autor y descripción del problema.

La plataforma valida automáticamente si la solución del estudiante es correcta comparando el estado final producido por la ejecución contra el estado objetivo definido en el nivel. Los niveles pueden importarse desde archivos externos, lo que facilita la creación de contenido por parte del docente.

---

## 6. Internacionalización

La plataforma está completamente localizada en español e inglés, incluyendo mensajes del editor, tipos de datos, categorías de operaciones, errores de compilación y mensajes de ejecución. Esto permite su uso en contextos académicos hispanohablantes sin barreras de idioma.

---

## 7. Alineación con los contenidos del curso INF261

La siguiente tabla relaciona los ejes temáticos del curso con las capacidades concretas que ofrece la plataforma:

| Eje temático INF261 | Cobertura en la plataforma | Nivel |
|---|---|---|
| Algoritmos y estructura de datos como conceptos | Formulación visual de algoritmos; observación directa del efecto de cada operación | Alto |
| Pilas: representación y operaciones | Pila visual con `PUSH`, `POP`, `SIZE`; visualización del comportamiento LIFO | Alto |
| Colas: representación y operaciones | Cola visual con `ENQUEUE`, `DEQUEUE`, `SIZE`; visualización del comportamiento FIFO | Alto |
| Listas simplemente enlazadas | Lista con inserción/eliminación en extremos y consulta de nodos | Alto |
| Control de flujo (secuencial, condicional, repetitivo) | Bloques para `if`, `if-else`, `while`, `for-each`, `break`, `return` | Alto |
| Expresiones y operadores | Literales, operadores aritméticos, lógicos y de comparación | Alto |
| Variables y memoria | Declaración, asignación y lectura; visualización en tiempo de ejecución | Medio-Alto |
| Funciones y modularización | Definición, llamada, parámetros y retorno de funciones | Medio-Alto |
| Tipos definidos por el usuario | Definición de tipo, instanciación y acceso a campos | Medio |
| Depuración y validación de algoritmos | Ejecución paso a paso, breakpoints, panel de variables, historial de eventos | Alto |
| Práctica guiada con retroalimentación inmediata | Sistema de niveles con validación automática de soluciones | Medio-Alto |
| Competencias de ingeniería de software | Diseño modular, tipado explícito, validación de datos, i18n | Alto |

**Estimación global de cobertura:**
- Respecto a los contenidos de estructuras lineales y programación algorítmica del curso: **70% – 85%**.
- Respecto al sílabo completo de INF261 (incluyendo estructuras no lineales como árboles y grafos): **55% – 70%**.

---

## 8. Lo que la plataforma no reemplaza

La plataforma está diseñada para complementar —no sustituir— la enseñanza tradicional. Los límites actuales son:

1. **No cubre implementación con punteros en C++.** El curso exige que los estudiantes implementen estas estructuras en C++ con gestión explícita de memoria. La plataforma trabaja al nivel de comportamiento y semántica de las operaciones, no al nivel de implementación en lenguaje de bajo nivel.
2. **No incluye estructuras no lineales.** Árboles, grafos y recursión avanzada quedan fuera del alcance actual.
3. **No reemplaza la exposición teórica.** No existen módulos de lectura o contenido expositivo dentro de la plataforma; asume que la teoría se entrega en clases.
4. **No incluye rúbricas de evaluación formales.** La validación automática verifica si la solución es correcta, pero no evalúa calidad del algoritmo (eficiencia, elegancia, legibilidad).

---

## 9. Fortalezas pedagógicas

1. **Retroalimentación inmediata**: el estudiante sabe en el momento si su solución es correcta y puede observar exactamente dónde falla.
2. **Reducción de la fricción sintáctica**: al eliminar la necesidad de escribir código, los estudiantes pueden enfocarse en la lógica algorítmica y el comportamiento de las estructuras.
3. **Depuración integrada desde el inicio**: la capacidad de ejecutar paso a paso y colocar breakpoints está disponible desde el primer nivel, no como característica avanzada.
4. **Visualización explícita de la semántica**: ver cómo un valor "sale" de una estructura y "entra" en otra hace concreta la diferencia entre LIFO y FIFO, y entre inserciones al inicio y al final.
5. **Restricciones como herramienta pedagógica**: limitar las operaciones disponibles en un nivel obliga al estudiante a elegir la estructura correcta para el problema, reforzando el análisis de requerimientos.
6. **Accesibilidad**: interfaz completamente en español, sin dependencias de instalación local (plataforma web).

---

## 10. Brechas y líneas de evolución

1. **Visualización de memoria referencial**: la representación gráfica de referencias entre objetos (cajas y flechas al estilo de diagramas de memoria) está en desarrollo y aún no alcanza su forma didáctica final.
2. **Rúbricas automáticas por resultado de aprendizaje**: sería valioso que la plataforma pueda entregar al docente un reporte de competencias por estudiante, más allá del porcentaje de niveles completados.
3. **Actividades de comparación de estructuras**: no existen aún niveles que explícitamente inviten a comparar el costo o comportamiento de distintas estructuras ante el mismo problema.
4. **Extensión a estructuras no lineales**: una segunda fase podría incorporar árboles binarios y grafos para cerrar la brecha con el sílabo completo del curso.

---

## 11. Integración en un curso de estructuras de datos

Esta sección describe cómo la plataforma puede incorporarse en cualquier curso de algoritmos y estructuras de datos a nivel universitario, tanto desde la perspectiva del docente como desde la del estudiante.

### 11.1 Rol de la plataforma en el curso

La plataforma no compite con los objetivos de implementación en lenguaje de programación que los cursos de esta naturaleza típicamente exigen. Su rol es **preparatorio y complementario**: actúa como un espacio de exploración conceptual donde el estudiante comprende el comportamiento de una estructura de datos —qué hace cada operación, en qué orden, con qué efecto sobre el estado— antes de tener que implementarla desde cero en código.

La mayoría de los cursos de estructuras de datos distinguen entre una etapa teórica (especificación formal, pseudocódigo) y una etapa práctica (implementación en lenguaje de alto o bajo nivel). La plataforma opera en el espacio intermedio entre ambas: permite que el estudiante experimente con el comportamiento real de las estructuras de forma interactiva, sin la carga sintáctica de un lenguaje de programación, y sin perder el rigor semántico de las operaciones.

### 11.2 Momentos de integración propuestos

Se proponen tres momentos concretos en los que la plataforma puede incorporarse a la dinámica habitual de un curso:

#### Momento 1 — Introducción a una nueva estructura (sesión teórica)

Cuando el docente presenta una nueva estructura de datos —por ejemplo, una pila— puede utilizar la plataforma en modo de demostración proyectada. En lugar de dibujar manualmente el estado de la estructura en la pizarra, ejecuta una secuencia de operaciones en la plataforma y el aula observa en tiempo real cómo el tope cambia, qué valor sale primero y por qué eso define el comportamiento LIFO.

**Beneficio para el docente**: la demostración es reproducible, interactiva y no depende de dibujos estáticos. Se puede pausar, retroceder al estado inicial y repetir con distintas secuencias de operaciones en minutos. Comparar pila contra cola en la misma sesión —ejecutando operaciones equivalentes sobre ambas y observando las diferencias— se convierte en una actividad de pocos minutos en lugar de una elaboración extensa en la pizarra.

#### Momento 2 — Práctica guiada previa a la implementación

En la sesión anterior a aquella donde los estudiantes deben implementar una estructura en código, el docente puede asignar un conjunto de niveles de la plataforma como actividad preparatoria. El estudiante resuelve los puzzles —que obligan a comprender el orden correcto de las operaciones y a elegir la estructura adecuada— antes de escribir una sola línea de código.

**Beneficio para el estudiante**: llega a la sesión de implementación con una comprensión funcional del comportamiento esperado de la estructura. La implementación deja de ser un salto al vacío y se convierte en la formalización de algo que ya sabe cómo funciona. Los errores conceptuales se detectan en la plataforma —donde el costo de equivocarse es mínimo— y no durante la implementación, donde depurarlos es más costoso.

El docente puede diseñar niveles específicos alineados a los objetivos de cada sesión, distribuyéndolos como archivos que los estudiantes importan directamente en la plataforma.

#### Momento 3 — Depuración conceptual durante la práctica

Durante las sesiones de laboratorio o taller, cuando un estudiante no entiende por qué su implementación produce un resultado incorrecto, puede reproducir el mismo escenario en la plataforma usando ejecución paso a paso. Al ver visualmente qué operación produce qué efecto, puede identificar si el error es conceptual (no comprende cómo funciona la estructura) o de implementación (comprende el concepto pero lo codificó incorrectamente).

**Beneficio para el estudiante**: separa dos tipos de error que frecuentemente se confunden. La plataforma permite descartar el error conceptual con rapidez, orientando el esfuerzo de depuración hacia el código.

### 11.3 Flujo de trabajo del docente

Para incorporar la plataforma en su curso, un docente seguiría los siguientes pasos:

1. **Diseñar niveles** alineados a los contenidos del curso. Cada nivel se define especificando el estado inicial de las estructuras, el estado objetivo que el estudiante debe alcanzar y las operaciones disponibles. El formato es declarativo y no requiere conocimientos de programación para su creación.
2. **Distribuir los niveles** a los estudiantes. Los estudiantes cargan el archivo del nivel directamente en la plataforma, sin necesidad de instalación de software adicional: la plataforma funciona en el navegador web.
3. **Asignar niveles por unidad temática**, indicando cuáles corresponden a cada sesión o semana. La plataforma registra si el estudiante completó el nivel, lo que permite hacer seguimiento básico de participación.
4. **Usar la plataforma como herramienta de demostración en clase**, proyectando la ejecución de operaciones para introducir nuevas estructuras, comparar comportamientos y motivar discusiones sobre la elección de estructura según el problema.

### 11.4 Flujo de trabajo del estudiante

Desde la perspectiva del estudiante, la integración no requiere configuración ni conocimientos previos específicos:

1. **Accede a la plataforma desde el navegador**, sin instalación local.
2. **Importa el nivel asignado** por el docente o selecciona uno del catálogo disponible.
3. **Lee el enunciado del nivel**: qué estructuras están disponibles, cuál es el estado inicial y cuál es el objetivo a alcanzar.
4. **Construye su solución** seleccionando y ordenando bloques en el editor visual: operaciones sobre estructuras, estructuras de control, variables y expresiones.
5. **Ejecuta su programa** y observa el resultado. Si no es correcto, usa la ejecución paso a paso para identificar en qué punto su lógica diverge del comportamiento esperado.
6. **Itera hasta resolver el nivel**, con validación automática inmediata en cada intento.

Este flujo no requiere conocimiento previo de ningún lenguaje de programación, lo que lo hace accesible desde las primeras semanas de cualquier curso introductorio de estructuras de datos.

### 11.5 Compatibilidad con entornos académicos

La plataforma es un ambiente determinístico de ejecución y validación: no utiliza ni depende de inteligencia artificial generativa. El estudiante construye su solución manualmente; el sistema únicamente verifica si el resultado producido por esa solución coincide con el estado objetivo definido en el nivel, de forma análoga a como opera un juez automático en competencias de programación. No hay generación de código, sugerencias algorítmicas ni asistencia automatizada de ningún tipo.

Esto la hace compatible con políticas académicas que restringen el uso de herramientas de inteligencia artificial en actividades evaluadas, y evita que la plataforma sustituya el razonamiento del estudiante en lugar de ejercitarlo.

---

## 12. Conclusión

La plataforma desarrollada en este proyecto de tesis constituye un ambiente de aprendizaje activo que cubre los contenidos centrales del eje de estructuras lineales y programación algorítmica del curso INF261. Su principal contribución pedagógica es hacer observable y manipulable —de forma visual e interactiva— el comportamiento de estructuras de datos que en los cursos tradicionales se enseñan de manera abstracta o mediante implementaciones en lenguaje de bajo nivel.

El estado actual del sistema es suficientemente maduro para apoyar el trabajo de laboratorio y práctica guiada en el contexto del curso, y su arquitectura permite escalar la cobertura curricular de forma incremental en fases posteriores.
