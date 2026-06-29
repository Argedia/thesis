# Campaña de tesis: definición canónica de niveles

## Propósito
Este documento fija la versión pedagógica final de la campaña.

Su objetivo no es describir una idea general, sino dejar definido exactamente:

- qué mundos existen;
- qué enseña cada nivel;
- qué operaciones del editor justifican ese nivel;
- y qué artefactos actuales del repo sirven como base.

Esta es la referencia que debe guiar implementación, documentación de tesis y refinamiento de `LevelTeachingPlan.introduces`.

## Estructura final de mundos
La campaña queda organizada en `5` mundos y `18` niveles:

1. `W1` Onboarding básico del editor: `4` niveles.
2. `W2` Pila: `4` niveles.
3. `W3` Cola + apoyo puntual de pila: `3` niveles.
4. `W4` Lista: `3` niveles.
5. `W5` Integración de stack, queue y list: `4` niveles.

## Convención de nombres
En esta documentación el primer mundo se llama `W1`.

Sin embargo, varios archivos ya creados en el repo todavía usan IDs técnicos con prefijo `campaign-w0-*`.

Eso no cambia su rol pedagógico:

- `campaign-w0-l1-first-contact` corresponde a `W1-L1`
- `campaign-w0-l2-step-and-reset` corresponde a `W1-L2`
- `campaign-w0-l3-read-before-run` corresponde a `W1-L3`

El archivo técnico `campaign-w0-l4-onboarding-checkpoint` puede mantenerse como referencia histórica, pero ya no forma parte del mundo de onboarding activo.

La recomendación es conservar esa equivalencia por ahora y renombrar IDs solo cuando el mapa y el índice de niveles queden estabilizados.

## Criterio pedagógico
Cada nivel debe introducir una sola idea principal.

Por eso `LevelTeachingPlan.introduces` debe contener exactamente un concepto central y, solo si hace falta, uno o dos conceptos de refuerzo en `reinforces`.

## Criterio técnico
La secuencia se limita a lo que el software soporta hoy con claridad visual:

- `stack`: `PUSH`, `POP`, `PEEK`, `IS_EMPTY`, `SIZE`, `CLEAR`
- `queue`: `ENQUEUE`, `DEQUEUE`, `PEEK`, `IS_EMPTY`, `SIZE`, `CLEAR`
- `list`: `APPEND`, `PREPEND`, `REMOVE_FIRST`, `REMOVE_LAST`, `GET_HEAD`, `GET_TAIL`, `IS_EMPTY`, `SIZE`, `CLEAR`

Aunque existen operaciones más generales como `GET_AT`, `INSERT_AT`, `REMOVE_AT`, `FIND`, `CONTAINS` y `REVERSE`, no conviene usarlas como base de campaña de tesis porque:

- suben complejidad demasiado pronto;
- vuelven menos transparente la semántica elemental;
- y desvían el foco desde estructuras lineales básicas hacia manipulación más avanzada.

## Regla sobre funciones y múltiples scripts
`Funciones` y `múltiples scripts/routines` no son un mundo ni un tema principal de campaña.

Se tratan como conocimiento transversal del editor:

- pueden aparecer como apoyo en niveles tardíos;
- pueden ayudar a ordenar soluciones;
- pero no deben ser el concepto principal introducido por ningún nivel de esta campaña.

## Secuencia definitiva de niveles

### W1 · Onboarding básico del editor

#### `W1-L1` Primer contacto
- `introduces`: `Flujo básico del editor: arrastrar estructura, elegir operación y ejecutar`
- Estructuras:
  `stack`
- Operaciones foco:
  `POP`, `PEEK`
- Qué aprende el estudiante:
  que el tablero tiene un estado inicial, un estado objetivo y que el programa transforma uno en otro.
- Justificación técnica:
  es el nivel ideal para el driver paso a paso porque solo necesita una estructura y una decisión simple.
- Base sugerida:
  `campaign-w0-l1-first-contact`

#### `W1-L2` Step y reset
- `introduces`: `Depuración básica con ejecución paso a paso y reinicio`
- Estructuras:
  `stack`
- Operaciones foco:
  `POP`
- Qué aprende el estudiante:
  que no solo importa correr, sino observar el proceso y reintentar con control.
- Justificación técnica:
  el editor ya soporta `step`, `run` y `reset`, así que el nivel puede concentrarse en ese flujo.
- Base sugerida:
  `campaign-w0-l2-step-and-reset`

#### `W1-L3` Descripción, bloques y salida
- `introduces`: `Uso de la descripción del nivel, la paleta izquierda y la salida para completar un nivel`
- Estructuras:
  `queue`
- Operaciones foco:
  `ENQUEUE`
- Qué aprende el estudiante:
  a leer la consigna, usar un literal desde la paleta izquierda y apoyarse en la salida cuando falta algo para ejecutar.
- Justificación técnica:
  el software ya soporta operaciones con valor, bloques literales y feedback diagnóstico en salida.
- Base sugerida:
  `campaign-w0-l3-read-before-run`

### W2 · Pila

#### `W2-L1` Transferencia de tope
- `introduces`: `Semántica LIFO en pila mediante POP y PUSH`
- Estructuras:
  `stack`, `stack`
- Operaciones foco:
  `POP`, `PUSH`
- Qué aprende el estudiante:
  que la pila expone naturalmente el tope y que mover un elemento depende de esa restricción.
- Justificación técnica:
  es el nivel más directo para enseñar comportamiento de pila.
- Base sugerida:
  `campaign-01-stack-top-transfer`

#### `W2-L2` Construir pila objetivo
- `introduces`: `Construcción de una pila respetando orden LIFO`
- Estructuras:
  `stack`, `stack`
- Operaciones foco:
  `POP`, `PUSH`
- Qué aprende el estudiante:
  a anticipar el orden final de la pila cuando hay varias inserciones consecutivas.
- Justificación técnica:
  el editor permite una meta pequeña pero suficiente para que el alumno piense en orden, no solo en un movimiento.
- Base sugerida:
  `campaign-02-stack-build-from-scratch`

#### `W2-L3` Destapar y restaurar
- `introduces`: `Uso de pila auxiliar para acceder a elementos que no están en el tope`
- Estructuras:
  `stack`, `stack`
- Operaciones foco:
  `POP`, `PUSH`, `PEEK`
- Qué aprende el estudiante:
  que una segunda pila no es “más memoria” arbitraria, sino una herramienta para respetar LIFO mientras reorganiza.
- Justificación técnica:
  sigue siendo un reto puramente de pila, pero introduce estrategia en vez de movimiento directo.
- Base sugerida:
  adaptar un nivel nuevo a partir de `campaign-02-stack-build-from-scratch`

#### `W2-L4` Cierre de pila
- `introduces`: `Selección de estrategia de pila bajo restricción simple`
- Estructuras:
  `stack`, `stack`
- Operaciones foco:
  `POP`, `PUSH`, `PEEK`
- Qué aprende el estudiante:
  a resolver una transformación pequeña con menos margen de ensayo y error.
- Justificación técnica:
  debe aumentar dificultad por restricción de pasos o por una meta menos obvia, no por agregar nuevas features.
- Base sugerida:
  crear variante nueva de pila

### W3 · Cola + apoyo puntual de pila

#### `W3-L1` Frente y final
- `introduces`: `Semántica FIFO en cola mediante DEQUEUE y ENQUEUE`
- Estructuras:
  `queue`, `queue`
- Operaciones foco:
  `DEQUEUE`, `ENQUEUE`, `PEEK`
- Qué aprende el estudiante:
  la diferencia esencial entre sacar del frente y agregar al final.
- Justificación técnica:
  debe ser cola pura para que FIFO se vea limpio antes de mezclar con otras estructuras.
- Base sugerida:
  crear nivel nuevo de cola pura

#### `W3-L2` Rotar sin invertir
- `introduces`: `Reordenamiento controlado de una cola preservando FIFO`
- Estructuras:
  `queue`
- Operaciones foco:
  `DEQUEUE`, `ENQUEUE`, `PEEK`
- Qué aprende el estudiante:
  que una cola puede rotarse moviendo frente al final sin convertirse en una pila.
- Justificación técnica:
  este nivel es clave para que la campaña no salte de cola básica a mixto demasiado rápido.
- Base sugerida:
  crear nivel nuevo de cola pura

#### `W3-L3` Invertir cola con pila auxiliar
- `introduces`: `Uso de pila auxiliar para invertir una cola`
- Estructuras:
  `queue`, `stack`
- Operaciones foco:
  `DEQUEUE`, `ENQUEUE`, `POP`, `PUSH`
- Qué aprende el estudiante:
  cómo se combinan FIFO y LIFO para producir una transformación que una cola sola no resuelve fácilmente.
- Justificación técnica:
  aquí sí conviene mezclar estructuras, pero solo después de haber fijado cola pura.
- Base sugerida:
  `campaign-03-queue-stack-reverse`

### W4 · Lista

#### `W4-L1` Construir desde extremos
- `introduces`: `Flexibilidad de lista en sus extremos con APPEND y PREPEND`
- Estructuras:
  `list`
- Operaciones foco:
  `APPEND`, `PREPEND`
- Qué aprende el estudiante:
  que la lista permite trabajar por ambos extremos, a diferencia de stack y queue.
- Justificación técnica:
  es el nivel que realmente presenta la ventaja operativa básica de `list`.
- Base sugerida:
  crear nivel nuevo de lista

#### `W4-L2` Recorte de bordes
- `introduces`: `Eliminación de primer y último elemento como operación de bordes`
- Estructuras:
  `list`
- Operaciones foco:
  `REMOVE_FIRST`, `REMOVE_LAST`
- Qué aprende el estudiante:
  a pensar en casos borde y en cómo conservar el interior de la secuencia.
- Justificación técnica:
  este ya es uno de los niveles más alineados con lo que el editor soporta claramente.
- Base sugerida:
  `campaign-04-list-trim-edges`

#### `W4-L3` Reconstrucción con extremos
- `introduces`: `Elección entre insertar y quitar en extremos para reconstruir una secuencia objetivo`
- Estructuras:
  `list`
- Operaciones foco:
  `APPEND`, `PREPEND`, `REMOVE_FIRST`, `REMOVE_LAST`
- Qué aprende el estudiante:
  a combinar operaciones de extremos según el objetivo, no por hábito.
- Justificación técnica:
  cierra el mundo lista sin exigir acceso arbitrario al medio.
- Base sugerida:
  crear nivel nuevo de lista

### W5 · Integración de stack, queue y list

#### `W5-L1` Elegir la estructura correcta
- `introduces`: `Comparación funcional entre stack, queue y list en un reto pequeño`
- Estructuras:
  `stack`, `queue`, `list`
- Operaciones foco:
  básicas de cada estructura
- Qué aprende el estudiante:
  que las tres estructuras no son intercambiables y que la estrategia depende de la semántica.
- Justificación técnica:
  el reto debe ser corto; la dificultad es de elección conceptual, no de tamaño.
- Base sugerida:
  adaptar `mixed-playground`

#### `W5-L2` Transferencia mixta
- `introduces`: `Coordinación de dos estructuras lineales para una transformación compuesta`
- Estructuras:
  `queue`, `stack`
- Operaciones foco:
  `DEQUEUE`, `ENQUEUE`, `POP`, `PUSH`
- Qué aprende el estudiante:
  a encadenar comportamientos de estructuras distintas para resolver un subproblema.
- Justificación técnica:
  profundiza el patrón ya visto en `W3-L3`, pero con menos guía.
- Base sugerida:
  adaptar `campaign-03-queue-stack-reverse`

#### `W5-L3` Lista como apoyo de integración
- `introduces`: `Uso de lista como estructura flexible de apoyo en un problema mixto`
- Estructuras:
  `stack`, `queue`, `list`
- Operaciones foco:
  básicas de `list` más operaciones simples de `stack` o `queue`
- Qué aprende el estudiante:
  cuándo la flexibilidad en extremos hace que una lista sea mejor apoyo que una pila o cola.
- Justificación técnica:
  evita que el mundo final quede sesgado solo a `queue + stack`.
- Base sugerida:
  crear nivel nuevo de integración

#### `W5-L4` Cierre de campaña
- `introduces`: `Aplicación integrada de stack, queue y list en un problema final corto`
- Estructuras:
  `stack`, `queue`, `list`
- Operaciones foco:
  selección estratégica de operaciones ya conocidas
- Qué aprende el estudiante:
  a usar moderadamente el software de principio a fin mientras aplica semántica básica de estructuras lineales.
- Justificación técnica:
  debe sentirse integrador, pero seguir siendo defendible como evidencia de tesis, no como capstone de alta complejidad.
- Base sugerida:
  crear nivel nuevo de integración

## Resumen operativo por mundo

### W1 Onboarding
- `W1-L1` Primer contacto
- `W1-L2` Step y reset
- `W1-L3` Descripción, bloques y salida

### W2 Pila
- `W2-L1` Transferencia de tope
- `W2-L2` Construir pila objetivo
- `W2-L3` Destapar y restaurar
- `W2-L4` Cierre de pila

### W3 Cola + un poco de pila
- `W3-L1` Frente y final
- `W3-L2` Rotar sin invertir
- `W3-L3` Invertir cola con pila auxiliar

### W4 Lista
- `W4-L1` Construir desde extremos
- `W4-L2` Recorte de bordes
- `W4-L3` Reconstrucción con extremos

### W5 Los tres
- `W5-L1` Elegir la estructura correcta
- `W5-L2` Transferencia mixta
- `W5-L3` Lista como apoyo de integración
- `W5-L4` Cierre de campaña

## Qué queda fuera de esta definición
No forman parte de esta campaña:

- mundos de funciones;
- mundos de tipos personalizados;
- retos centrados en `doubly-linked-list` o `circular-list`;
- ejercicios cuya dificultad dependa de `GET_AT`, `INSERT_AT` o `REMOVE_AT`;
- retos de implementación en `C++`.

## Criterio de aceptación
La campaña queda bien definida si al terminarla se puede sostener que el estudiante:

- sabe usar moderadamente el editor;
- entiende la diferencia entre `stack`, `queue` y `list`;
- resuelve ejercicios simples de cada estructura;
- y puede enfrentar un reto corto donde importa elegir y coordinar estructuras lineales.
