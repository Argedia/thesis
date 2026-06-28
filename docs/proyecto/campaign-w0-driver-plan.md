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
  aprender a usar `step` y `reset` para inspeccionar una solución corta.
- `introduces`:
  `step-by-step execution and reset for debugging a short solution`

### `W1-L3 · Read Before Run`
- Archivo: `campaign-w0-l3-read-before-run`
- Meta pedagógica:
  leer el estado inicial y el objetivo antes de programar.
- `introduces`:
  `reading initial and goal states before planning a solution`

### `W1-L4 · Onboarding Checkpoint`
- Archivo: `campaign-w0-l4-onboarding-checkpoint`
- Meta pedagógica:
  resolver un mini reto de forma autónoma usando el flujo completo del editor.
- `introduces`:
  `autonomous resolution of a short challenge using the full editor flow`

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
  botones de `step`, `run`, `reset`, y registro visual de ejecución.

### `W1-L3`
- Driver específico recomendado: sí.
- Razón:
  aquí conviene guiar al usuario a mirar primero el tablero y el objetivo antes de tocar bloques.
- Focos:
  panel del tablero, comparación entre estado inicial y objetivo, luego superficie del programa.

### `W1-L4`
- Driver específico recomendado: no obligatorio.
- Razón:
  este nivel funciona mejor como checkpoint.
- Alternativa:
  usar solo mensajes de `teaching` / `teachingPlan` y no un driver nuevo, para no sobre-guiar el cierre del onboarding.

## Regla sugerida para implementación

- Mantener un driver genérico para todos los niveles.
- Añadir drivers específicos solo cuando un nivel introduce un elemento nuevo de interfaz.
- En onboarding, eso aplica claramente a `W1-L1`, `W1-L2` y `W1-L3`.
- `W1-L4` puede quedarse sin driver específico para medir autonomía básica.
