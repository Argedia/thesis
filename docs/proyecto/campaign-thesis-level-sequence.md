# Secuencia final de campaña para tesis

## Propósito
Este documento define la campaña de tesis en su versión pedagógica final, nivel por nivel.

La meta no es cubrir todo el curso ni todas las capacidades del software. La meta es demostrar que:

- el estudiante puede aprender a usar moderadamente el editor mientras juega;
- el software puede enseñar semántica y aplicación básica de `stack`, `queue` y `list`;
- la campaña puede mapear cada nivel a un objetivo pedagógico concreto mediante `LevelTeachingPlan.introduces`.

## Qué es capaz de enseñar el software hoy
El software ya permite enseñar, de manera razonable, estas habilidades de uso:

- leer estado inicial y estado objetivo;
- identificar qué estructura se está manipulando;
- armar una solución con bloques y operaciones;
- ejecutar con `run`, `step` y `reset`, y usar `pause` cuando el nivel realmente lo requiera;
- corregir una solución cuando el resultado no coincide con el objetivo;
- trabajar con restricciones de pasos y operaciones;
- organizar una solución en más de una rutina cuando eso ayude a expresar mejor la estrategia.

Dentro del alcance de tesis, `funciones` y `múltiples scripts/routines` se tratan como conocimiento transversal del editor, no como bloque temático propio.

## Estructura final propuesta
La campaña queda en `18` niveles, repartidos en `5` bloques:

1. `W1` Familiarización con el editor: `4` niveles.
2. `W2` Mundo de pila: `4` niveles.
3. `W3` Mundo de cola: `3` niveles.
4. `W4` Mundo de lista: `3` niveles.
5. `W5` Integración: `4` niveles.

Esto mantiene la campaña dentro del rango acordado de `16` a `20` niveles.

## Regla pedagógica
Cada nivel debe declarar en `LevelTeachingPlan.introduces` el concepto principal que introduce.

Se recomienda que ese campo tenga exactamente un concepto principal y, si hace falta, uno o dos apoyos secundarios.

## Revisión de incongruencias
Antes de fijar la secuencia se corrigieron estas incongruencias:

- El onboarding no debe introducir demasiada carga conceptual de estructuras. Por eso se mantuvo centrado en uso del editor y transformaciones muy simples.
- `Funciones` y `múltiples routines` no deben aparecer como concepto principal de campaña. Si se usan, deben quedar como apoyo transversal del editor.
- En niveles mixtos no siempre corresponde decir que el usuario "elige cualquier estructura", porque muchas veces el tablero ya entrega estructuras fijas. La formulación correcta es que el usuario elige la estrategia adecuada según la estructura disponible.
- La dificultad debe crecer por complejidad de transformación y restricciones, no por meter features fuera de scope.

## Revisión de factibilidad lógica con el editor actual
La secuencia también fue revisada contra lo que el editor realmente soporta hoy.

Criterios de factibilidad usados:

- los retos deben poder resolverse con operaciones reales sobre `stack`, `queue` y `list`;
- no se debe asumir acceso arbitrario a cualquier posición si el nivel está pensado solo con operaciones básicas;
- no se debe depender de funciones, tipos o múltiples routines para que un nivel tenga sentido;
- las transformaciones deben ser de tamaño fijo y observables en tablero, no ejercicios que exijan abstracción algorítmica más cercana a implementación general;
- las restricciones deben usarse como ajuste de dificultad, no como sustituto de una mecánica que el editor no ofrece.

Consecuencias de esta revisión:

- los niveles de lista se formulan solo alrededor de extremos y secuencias pequeñas;
- los niveles mixtos se describen como comparación y coordinación de estructuras dadas, no como diseño libre de estructuras;
- el uso de rutinas queda siempre como opcional y secundario;
- los niveles finales se mantienen simples en tamaño, aunque integradores en conceptos.

## Secuencia nivel por nivel

### W1 · Familiarización con el editor

#### `W1-L1` Primer contacto: arrastrar, ejecutar y observar
- `introduces`: `Uso básico del editor para ejecutar una transformación simple`
- Habilidad de software:
  colocar bloques, elegir una operación disponible y ejecutar.
- Contenido de estructuras:
  reconocer que una estructura cambia de estado tras una operación.
- Resultado esperado:
  el estudiante entiende que el objetivo del juego es transformar un estado inicial en uno objetivo.

#### `W1-L2` Step, pause y reset
- `introduces`: `Depuración básica de soluciones mediante ejecución paso a paso`
- Habilidad de software:
  usar `step` y `reset` para inspeccionar y reiniciar una solución.
- Contenido de estructuras:
  observar cómo una operación modifica una estructura en cada paso.
- Resultado esperado:
  el estudiante deja de usar el editor como caja negra y empieza a inspeccionar el proceso.

#### `W1-L3` Leer tablero y planificar antes de ejecutar
- `introduces`: `Lectura de estado inicial y estado objetivo como base de planificación`
- Habilidad de software:
  comparar tablero inicial con tablero meta antes de programar.
- Contenido de estructuras:
  identificar qué cambios concretos necesita cada estructura.
- Resultado esperado:
  el estudiante aprende a planear una secuencia mínima en vez de probar al azar.

#### `W1-L4` Mini reto de cierre de onboarding
- `introduces`: `Resolución autónoma de un reto simple usando el flujo completo del editor`
- Habilidad de software:
  combinar lectura, construcción, ejecución y corrección.
- Contenido de estructuras:
  aplicar operaciones básicas en un caso corto con una estructura principal y una meta clara.
- Resultado esperado:
  el estudiante sale del onboarding sabiendo usar moderadamente el entorno.

### W2 · Mundo de pila

#### `W2-L1` Transferencia de tope
- `introduces`: `Comportamiento LIFO y transferencia de tope con POP y PUSH`
- Habilidad de software:
  seleccionar operaciones correctas sobre `stack`.
- Contenido de estructuras:
  entender que solo el tope está disponible de manera natural.
- Resultado esperado:
  el estudiante comprende la semántica elemental de pila.

#### `W2-L2` Construir una pila objetivo
- `introduces`: `Construcción paso a paso de una pila respetando el orden LIFO`
- Habilidad de software:
  encadenar varias operaciones para construir una meta completa.
- Contenido de estructuras:
  anticipar cómo cambia el orden al apilar múltiples elementos.
- Resultado esperado:
  el estudiante puede producir un estado objetivo simple de pila sin ayuda.

#### `W2-L3` Deshacer y rehacer con pila auxiliar
- `introduces`: `Uso de una pila auxiliar para reorganizar elementos`
- Habilidad de software:
  manejar dos estructuras a la vez sin perder trazabilidad.
- Contenido de estructuras:
  usar una segunda pila para invertir o reacomodar orden.
- Resultado esperado:
  el estudiante entiende que una estructura auxiliar cambia la estrategia disponible.

#### `W2-L4` Cierre de mundo pila
- `introduces`: `Elección de estrategia de pila bajo restricciones simples`
- Habilidad de software:
  resolver con límite de pasos o con menos ensayo y error en un tablero pequeño.
- Contenido de estructuras:
  aplicar LIFO en un problema un poco menos directo.
- Resultado esperado:
  el estudiante ya usa pila en ejercicios simples con autonomía razonable.

### W3 · Mundo de cola

#### `W3-L1` Frente y final
- `introduces`: `Comportamiento FIFO en cola mediante DEQUEUE y ENQUEUE`
- Habilidad de software:
  distinguir visualmente frente, final y efecto de cada operación.
- Contenido de estructuras:
  entender que la cola preserva orden de llegada.
- Resultado esperado:
  el estudiante internaliza la diferencia esencial entre pila y cola.

#### `W3-L2` Rotación y preservación de orden
- `introduces`: `Rotación controlada de cola sin romper el criterio FIFO`
- Habilidad de software:
  ejecutar secuencias largas sin perder el objetivo.
- Contenido de estructuras:
  mover elementos del frente al final para reposicionar la cola sin invertirla.
- Resultado esperado:
  el estudiante puede manipular una cola sin confundir reordenamiento con inversión.

#### `W3-L3` Cierre de mundo cola
- `introduces`: `Aplicación de FIFO para resolver una transformación simple de cola`
- Habilidad de software:
  resolver un reto con menos guía explícita.
- Contenido de estructuras:
  planear movimientos preservando orden cuando corresponde.
- Resultado esperado:
  el estudiante sabe aplicar cola en ejercicios básicos con criterio.

### W4 · Mundo de lista

#### `W4-L1` Extremos de lista
- `introduces`: `Operaciones en extremos de lista con inserción y extracción`
- Habilidad de software:
  elegir entre operaciones de inicio y fin según el objetivo del tablero.
- Contenido de estructuras:
  entender que la lista es más flexible que pila y cola en sus extremos, sin asumir acceso arbitrario al medio.
- Resultado esperado:
  el estudiante reconoce la ventaja operativa de una lista frente a stack/queue.

#### `W4-L2` Recorte de bordes
- `introduces`: `Manipulación de primer y último elemento como casos borde de lista`
- Habilidad de software:
  validar cambios parciales antes de cerrar la solución.
- Contenido de estructuras:
  remover en bordes sin alterar innecesariamente el interior.
- Resultado esperado:
  el estudiante ya piensa en casos borde como parte del problema.

#### `W4-L3` Cierre de mundo lista
- `introduces`: `Selección de operaciones de lista para reconstruir una secuencia objetivo`
- Habilidad de software:
  combinar operaciones de lista con lectura cuidadosa del tablero.
- Contenido de estructuras:
  usar `append`, `prepend`, `remove_first` y `remove_last` para llegar a un estado final específico.
- Resultado esperado:
  el estudiante puede resolver retos simples de lista de forma intencional.

### W5 · Integración de estructuras lineales

#### `W5-L1` Comparar comportamientos en reto mixto
- `introduces`: `Comparación funcional entre stack, queue y list en un mismo reto`
- Habilidad de software:
  reconocer qué estrategia conviene según la estructura disponible en el tablero.
- Contenido de estructuras:
  contrastar LIFO, FIFO y operaciones de extremos en un caso pequeño y concreto.
- Resultado esperado:
  el estudiante deja de ver las estructuras como equivalentes.

#### `W5-L2` Transferencia mixta con estructura auxiliar
- `introduces`: `Uso de una estructura auxiliar para resolver una transformación mixta`
- Habilidad de software:
  si el nivel lo habilita, separar una solución en rutina principal y rutina auxiliar para ordenarla mejor.
- Contenido de estructuras:
  resolver un reto que requiere más de una estructura lineal.
- Resultado esperado:
  el estudiante entiende la estrategia mixta del reto, mientras las rutinas quedan como apoyo secundario.

#### `W5-L3` Reto mixto con restricciones
- `introduces`: `Integración de estructuras lineales bajo restricciones de pasos u operaciones`
- Habilidad de software:
  optimizar una solución cuando hay límites explícitos.
- Contenido de estructuras:
  combinar `stack`, `queue` y `list` según el subproblema en una transformación de tamaño fijo.
- Resultado esperado:
  el estudiante ya puede adaptar su estrategia, no solo repetir recetas.

#### `W5-L4` Cierre de campaña
- `introduces`: `Aplicación compuesta de stack, queue y list en un problema final simple`
- Habilidad de software:
  usar el editor con autonomía moderada de principio a fin.
- Contenido de estructuras:
  resolver un problema corto donde la estructura dada y el orden de operaciones importan.
- Resultado esperado:
  al terminar la campaña, el estudiante sabe usar moderadamente el software mientras aplica conceptos básicos de pilas, colas y listas en ejercicios simples.

## Qué no entra en esta secuencia
Quedan fuera de esta campaña final:

- un mundo propio de funciones;
- un mundo propio de tipos personalizados;
- capstones de complejidad alta;
- implementación en `C++`;
- estructuras no lineales.

Si alguna de esas capacidades aparece en el software, se documenta como extensión de plataforma o trabajo futuro, no como núcleo de la campaña de tesis.

## Relación con niveles existentes del repo
La secuencia de arriba es la referencia pedagógica final.

Los niveles ya implementados en `app/public/levels` pueden reutilizarse, adaptarse o fragmentarse si ayudan a cubrir estos objetivos, pero la campaña no debe quedar definida por los artefactos heredados de funciones/tipos ni por el plan antiguo de 6 mundos.

## Criterio de aceptación de la campaña
La campaña está bien definida si al terminarla se puede defender que el usuario:

- sabe desplazarse por la campaña y abrir niveles;
- interpreta tablero inicial y objetivo;
- ejecuta, depura y reinicia soluciones;
- resuelve transformaciones simples con `stack`;
- resuelve transformaciones simples con `queue`;
- resuelve transformaciones simples con `list`;
- distingue cuándo conviene cada estructura en un reto mixto corto.
