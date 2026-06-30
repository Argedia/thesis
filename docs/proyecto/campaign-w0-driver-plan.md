# W1 onboarding y plan de drivers

## Objetivo
Dejar implementado el primer mundo de campaña como onboarding real del software, y definir qué tutorial específico conviene para cada nivel.

## Niveles implementados en W1

### `W1-L1 · First Contact`
- Archivo: `campaign-w0-l1-first-contact`
- Meta pedagógica:
  primer contacto con arrastrar una estructura al programa, elegir una operación y ejecutar una transformación mínima.
- `introduces`:
  `placing one structure block, selecting an operation, and executing it`

### `W1-L2 · Step and Reset`
- Archivo: `campaign-w0-l2-step-and-reset`
- Meta pedagógica:
  aprender a usar `step` y `reset` para inspeccionar una solución corta sobre una sola pila.
- `introduces`:
  `step-by-step execution and reset while repeating one stack action`

### `W1-L3 · Description, Blocks and Output`
- Archivo: `campaign-w0-l3-read-before-run`
- Meta pedagógica:
  terminar la inducción enseñando cómo usar la descripción del nivel, la paleta de bloques izquierda y la salida para resolver un nivel.
- `introduces`:
  `using the level description, the left block palette, and output feedback to complete a level`

## Driver general de pantalla de nivel

El driver general `campaign-level-basics` debe mantenerse como explicación base del layout:

- tablero y estado del problema;
- vista objetivo;
- superficie de programación;
- acciones de ejecución;
- idea general del reto.

Ese driver general no debería intentar enseñar detalles muy específicos de UI avanzada en todos los niveles, porque se vuelve repetitivo.

## Drivers específicos propuestos para W1

### `W1-L1`
- Driver específico recomendado: sí.
- Razón:
  aquí se introduce por primera vez cómo colocar una estructura, elegir entre dos operaciones visibles y usar `run`.
- Focos:
  `play-preview-goal`, `play-program-header`, `play-run-actions`.
- Nota pedagógica:
  este nivel ahora funciona con una sola pila `A` y dos operaciones habilitadas (`POP` y `PEEK`) para que el usuario descubra que una observa y la otra sí cambia el estado.
- Estado de implementación:
  implementado como tutorial guiado por eventos (`campaign-w1-l1-guided`).
  No avanza hasta que el usuario:
  1. coloque la estructura,
  2. seleccione una operación,
  3. presione `Play`.

### `W1-L2`
- Driver específico recomendado: sí.
- Razón:
  aquí se introduce explícitamente `step` y `reset`, que son elementos de UI y no solo contenido del problema.
- Focos:
  botones de `step`, `run`, `reset`, y estado intermedio del tablero.

### `W1-L3`
- Driver específico recomendado: sí.
- Razón:
  aquí conviene guiar al usuario a leer la descripción, usar la paleta izquierda y apoyarse en la salida para corregir lo que falta.
- Focos:
  `play-level-description`, `editor-palette-base-body`, `play-output-panel`, además de la colocación mínima de estructura y literal.

## Regla sugerida para implementación

- Mantener un driver genérico para todos los niveles.
- Añadir drivers específicos solo cuando un nivel introduce un elemento nuevo de interfaz.
- En onboarding, eso aplica claramente a `W1-L1`, `W1-L2` y `W1-L3`.
- El mundo de onboarding queda recortado a `W1-L1`–`W1-L3`; no se necesita un `W1-L4`.
