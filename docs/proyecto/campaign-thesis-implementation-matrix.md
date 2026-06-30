# Matriz de implementación de campaña para tesis

## Estado actual
La campaña activa ya no está parcialmente planificada: quedó implementada como una campaña de `16` niveles distribuidos en `5` mundos.

## Matriz nivel por nivel

| Nivel tesis | Objetivo principal | Archivo actual | Estado |
|---|---|---|---|
| `W1-L1` | arrastrar, elegir operación y ejecutar | `campaign-w0-l1-first-contact` | `listo` |
| `W1-L2` | usar `step` y `reset` para depurar | `campaign-w0-l2-step-and-reset` | `listo` |
| `W1-L3` | usar descripción, paleta izquierda y salida | `campaign-w0-l3-read-before-run` | `listo` |
| `W2-L1` | LIFO básico con transferencia de tope | `campaign-01-stack-top-transfer` | `listo` |
| `W2-L2` | construir pila objetivo respetando orden | `campaign-02-stack-build-from-scratch` | `listo` |
| `W2-L3` | usar pila auxiliar para destapar y restaurar | `campaign-w2-1` | `listo` |
| `W2-L4` | introducir `if` como verificación previa sobre pila | `campaign-w2-2` | `listo` |
| `W3-L1` | FIFO básico en cola pura | `campaign-w3-1` | `listo` |
| `W3-L2` | rotación de cola sin inversión | `campaign-w3-2` | `listo` |
| `W3-L3` | introducir `while` sobre cola | `campaign-w3-3` | `listo` |
| `W3-L4` | invertir cola usando pila auxiliar | `campaign-03-queue-stack-reverse` | `listo` |
| `W4-L1` | construir desde extremos con `append/prepend` | `campaign-w4-1` | `listo` |
| `W4-L2` | recorte de bordes | `campaign-04-list-trim-edges` | `listo` |
| `W4-L3` | definir una función helper simple | `campaign-w4-2` | `listo` |
| `W4-L4` | reusar helper en una solución de lista | `campaign-w4-3` | `listo` |
| `W5-L1` | integrar stack, queue y list | `campaign-w5-1` | `listo` |

## Decisiones importantes ya materializadas

### 1. El onboarding quedó acotado a tres niveles
Se descartó el antiguo `W1-L4`. El mundo de familiarización ahora cierra exactamente en `W1-L3`.

### 2. `if` y `while` entran de forma gradual
- `if` aparece recién en `W2-L4`, cuando el estudiante ya domina flujo básico y pila.
- `while` aparece en `W3-L3`, cuando ya entiende cola pura y una transformación simple.

### 3. Funciones no son un mundo aparte
La campaña sí introduce funciones, pero como recurso transversal y tardío dentro de `W4`, no como bloque separado.

### 4. El cierre quedó en un solo final boss
El mundo 5 ya no es una serie larga de integración. Es un único reto final defendible para tesis.

## Artefactos que deben considerarse desactualizados

### Plan viejo de mundos
Los planes heredados de `6` mundos, castillo, tipos personalizados o mundos exclusivos de funciones ya no describen el producto vigente.

### Placeholders de campaña anteriores
Los placeholders antiguos fuera de esta lista de `16` niveles no deben contarse como evidencia pedagógica activa.

## Referencias activas del repo

- Mapa real de campaña:
  `app/public/levels/campaign-worlds.json`
- Catálogo activo de niveles de campaña:
  `app/public/levels/index.json`
- Definición canónica pedagógica:
  `docs/proyecto/campaign-thesis-level-sequence.md`

## Cierre
Desde la perspectiva de implementación, la campaña de tesis queda cerrada en estructura. Lo pendiente ya no es “inventar qué niveles faltan”, sino probarlos, refinarlos y ajustar drivers o dificultad cuando la experiencia real lo pida.
