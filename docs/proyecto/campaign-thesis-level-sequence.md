# Campaña de tesis: definición canónica de niveles

## Propósito
Este documento fija la secuencia pedagógica final de la campaña implementada en la rama de gamificación.

La referencia activa es:

- `5` mundos
- `16` niveles
- onboarding del editor
- pila
- cola con introducción puntual de `while`
- lista con introducción de funciones sencillas
- un único `final boss`

## Estructura final de mundos

1. `W1` Familiarización con el editor: `3` niveles.
2. `W2` Pila: `4` niveles.
3. `W3` Cola + un poco de pila: `4` niveles.
4. `W4` Lista + funciones sencillas: `4` niveles.
5. `W5` Final boss de integración: `1` nivel.

## Convención de IDs
Los archivos técnicos del onboarding siguen usando prefijo `campaign-w0-*`, pero pedagógicamente corresponden a `W1`.

- `campaign-w0-l1-first-contact` = `W1-L1`
- `campaign-w0-l2-step-and-reset` = `W1-L2`
- `campaign-w0-l3-read-before-run` = `W1-L3`

## Criterio pedagógico
Cada nivel debe declarar en `LevelTeachingPlan.introduces` el concepto principal que incorpora.

La campaña no cubre implementación en `C++`; cubre semántica de uso y resolución de ejercicios simples con estructuras lineales.

## Secuencia definitiva

### W1 · Familiarización con el editor

#### `W1-L1` Primer contacto
- Archivo: `campaign-w0-l1-first-contact`
- `introduces`: `Flujo básico del editor: arrastrar estructura, elegir operación y ejecutar`
- Foco:
  una sola pila, una sola acción, primer contacto con tablero actual y meta.

#### `W1-L2` Step y reset
- Archivo: `campaign-w0-l2-step-and-reset`
- `introduces`: `Depuración básica con ejecución paso a paso y reinicio`
- Foco:
  observar una solución corta en dos acciones usando `step` y `reset`.

#### `W1-L3` Descripción, bloques y salida
- Archivo: `campaign-w0-l3-read-before-run`
- `introduces`: `Uso de la descripción del nivel, la paleta izquierda y la salida para completar un nivel`
- Foco:
  leer consigna, abrir la paleta izquierda, usar literal y entender el feedback de salida.

### W2 · Pila

#### `W2-L1` Transferencia de tope
- Archivo: `campaign-01-stack-top-transfer`
- `introduces`: `Semántica LIFO en pila mediante POP y PUSH`
- Foco:
  mover el tope de una pila a otra.

#### `W2-L2` Construir pila objetivo
- Archivo: `campaign-02-stack-build-from-scratch`
- `introduces`: `Construcción de una pila respetando orden LIFO`
- Foco:
  anticipar orden final y no solo ejecutar movimientos sueltos.

#### `W2-L3` Destapar y restaurar
- Archivo: `campaign-w2-1`
- `introduces`: `Uso de pila auxiliar para acceder a elementos que no están en el tope`
- Foco:
  apartar temporalmente, rescatar el valor útil y restaurar el estado restante.

#### `W2-L4` Verificar antes de mover
- Archivo: `campaign-w2-2`
- `introduces`: `Uso de un condicional simple para verificar una condición antes de mover desde una pila`
- Foco:
  primera aparición de `if` como verificación previa antes de transferir un valor.

### W3 · Cola + un poco de pila

#### `W3-L1` Frente y final
- Archivo: `campaign-w3-1`
- `introduces`: `Comportamiento FIFO en cola mediante DEQUEUE y ENQUEUE`
- Foco:
  fijar cola pura antes de mezclar con otras estructuras.

#### `W3-L2` Rotar sin invertir
- Archivo: `campaign-w3-2`
- `introduces`: `Rotación controlada de una cola preservando FIFO`
- Foco:
  mover el frente al final sin convertir la cola en una pila.

#### `W3-L3` Mientras queden elementos
- Archivo: `campaign-w3-3`
- `introduces`: `Repetición con while usando el tamaño de una cola como condición`
- Foco:
  primera aparición de `while` para repetir una misma transferencia hasta vaciar la cola.

#### `W3-L4` Invertir cola con pila auxiliar
- Archivo: `campaign-03-queue-stack-reverse`
- `introduces`: `Uso de pila auxiliar para invertir una cola`
- Foco:
  combinar FIFO y LIFO en una misma solución.

### W4 · Lista + funciones sencillas

#### `W4-L1` Construir desde extremos
- Archivo: `campaign-w4-1`
- `introduces`: `Flexibilidad de lista en sus extremos con APPEND y PREPEND`
- Foco:
  ventaja elemental de la lista frente a pila y cola.

#### `W4-L2` Recorte de bordes
- Archivo: `campaign-04-list-trim-edges`
- `introduces`: `Eliminación de primer y último elemento como operación de bordes`
- Foco:
  conservar el interior de la secuencia mientras se actúa en extremos.

#### `W4-L3` Primer helper sobre lista
- Archivo: `campaign-w4-2`
- `introduces`: `Definición de una función sencilla y llamada desde otro script`
- Foco:
  introducir función helper como recurso transversal del editor dentro de un problema de lista.

#### `W4-L4` Reusar helper para cerrar
- Archivo: `campaign-w4-3`
- `introduces`: `Reuso deliberado de una función helper para reducir bloques en la rutina principal`
- Foco:
  usar la misma abstracción varias veces sin cambiar el tema central de estructuras lineales.

### W5 · Final boss

#### `W5-L1` Final boss lineal
- Archivo: `campaign-w5-1`
- `introduces`: `Integración final de stack, queue y list con una estrategia compuesta`
- Foco:
  vaciar pila y cola en una lista preservando la semántica correcta de cada estructura.

## Resumen operativo

### W1
- `W1-L1` Primer contacto
- `W1-L2` Step y reset
- `W1-L3` Descripción, bloques y salida

### W2
- `W2-L1` Transferencia de tope
- `W2-L2` Construir pila objetivo
- `W2-L3` Destapar y restaurar
- `W2-L4` Verificar antes de mover

### W3
- `W3-L1` Frente y final
- `W3-L2` Rotar sin invertir
- `W3-L3` Mientras queden elementos
- `W3-L4` Invertir cola con pila auxiliar

### W4
- `W4-L1` Construir desde extremos
- `W4-L2` Recorte de bordes
- `W4-L3` Primer helper sobre lista
- `W4-L4` Reusar helper para cerrar

### W5
- `W5-L1` Final boss lineal

## Criterio de aceptación
La campaña queda bien definida si al terminarla se puede sostener que el estudiante:

- sabe usar moderadamente el editor;
- entiende la diferencia entre `stack`, `queue` y `list`;
- resolvió ejercicios simples y crecientes por tema;
- vio `if`, `while` y una función helper en el momento en que ya aportan valor;
- y puede cerrar con un reto corto de integración.
