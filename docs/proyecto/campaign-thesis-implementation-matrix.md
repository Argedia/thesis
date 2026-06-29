# Matriz de implementación de campaña para tesis

## Propósito
Traducir la secuencia canónica de campaña a una decisión práctica de implementación:

- qué niveles del repo ya sirven;
- cuáles requieren adaptación;
- cuáles faltan crear;
- cuáles existen pero no deben entrar al scope de tesis.

## Lectura rápida del estado actual

### Niveles ya útiles o casi útiles
- `intro-transfer`
- `campaign-w0-l1-first-contact`
- `campaign-w0-l2-step-and-reset`
- `campaign-w0-l3-read-before-run`
- `campaign-01-stack-top-transfer`
- `campaign-02-stack-build-from-scratch`
- `campaign-03-queue-stack-reverse`
- `campaign-04-list-trim-edges`

### Niveles existentes pero fuera de scope central
- `campaign-05-custom-function-helper`
- `campaign-06-custom-function-mixed`
- `campaign-07-custom-type-intro`
- `campaign-08-custom-type-integration`

Estos pueden reutilizarse parcialmente como referencia técnica, pero no deben definir la campaña final de tesis.

### Niveles placeholder que no cuentan como contenido real
Los niveles `campaign-w2-*`, `campaign-w3-*`, `campaign-w4-*`, `campaign-w5-*`, `campaign-w6-*` actualmente son en gran parte stubs o copias base y no deben tratarse como niveles pedagógicos válidos hasta ser rediseñados.

## Criterios usados en esta matriz
- `Ya sirve`: el nivel puede entrar con cambios menores de texto o metadata.
- `Adaptar`: la base técnica sirve, pero el objetivo pedagógico o el tablero deben cambiar.
- `Crear`: no hay base suficientemente buena en el repo actual.
- `No usar`: existe, pero contradice el scope de tesis o empuja contenido fuera del foco.

## Matriz nivel por nivel

| Nivel tesis | Objetivo principal | Fuente sugerida | Estado | Decisión |
|---|---|---|---|---|
| `W1-L1` | arrastrar, elegir operación y ejecutar | `campaign-w0-l1-first-contact` | listo | `Ya sirve` |
| `W1-L2` | usar `step` y `reset` para depurar | `campaign-w0-l2-step-and-reset` | listo | `Ya sirve` |
| `W1-L3` | usar descripción, paleta izquierda y salida | `campaign-w0-l3-read-before-run` | listo | `Ya sirve` |
| `W2-L1` | LIFO básico con transferencia de tope | `campaign-01-stack-top-transfer` | listo | `Ya sirve` |
| `W2-L2` | construir pila objetivo con repetición | `campaign-02-stack-build-from-scratch` | listo | `Ya sirve` |
| `W2-L3` | usar pila auxiliar para destapar y restaurar | variante nueva de pila | faltante | `Crear` |
| `W2-L4` | cierre de pila con restricción simple | variante nueva de pila | faltante | `Crear` |
| `W3-L1` | FIFO básico en cola pura | nivel nuevo de cola | faltante | `Crear` |
| `W3-L2` | rotación de cola sin inversión | nivel nuevo de cola | faltante | `Crear` |
| `W3-L3` | invertir cola usando pila auxiliar | `campaign-03-queue-stack-reverse` | listo | `Ya sirve` |
| `W4-L1` | construir desde extremos con `append/prepend` | nivel nuevo de lista | faltante | `Crear` |
| `W4-L2` | recorte de bordes | `campaign-04-list-trim-edges` | listo | `Ya sirve` |
| `W4-L3` | reconstrucción de secuencia con extremos | nivel nuevo de lista | faltante | `Crear` |
| `W5-L1` | comparar stack, queue y list | `mixed-playground` como base conceptual | base técnica útil | `Adaptar` |
| `W5-L2` | transferencia mixta `queue + stack` | `campaign-03-queue-stack-reverse` como punto de partida | base útil | `Adaptar` |
| `W5-L3` | usar `list` como apoyo de integración | nivel nuevo mixto | faltante | `Crear` |
| `W5-L4` | cierre final con las tres estructuras | nivel nuevo mixto | faltante | `Crear` |

## Revisión de sentido lógico con el editor

### Niveles que sí tienen sentido claro hoy
- `campaign-01-stack-top-transfer`
  enseña una transferencia concreta con operaciones que el editor soporta de forma nítida.
- `campaign-02-stack-build-from-scratch`
  enseña repetición sobre un tablero fijo, sin depender de features avanzadas.
- `campaign-03-queue-stack-reverse`
  tiene sentido lógico porque la inversión de cola usando pila auxiliar sí se puede observar y resolver con operaciones disponibles.
- `campaign-04-list-trim-edges`
  está muy bien alineado con lo que el editor realmente permite en listas sin entrar a acceso arbitrario al medio.

### Niveles técnicamente válidos pero pedagógicamente problemáticos para tesis
- `campaign-05-custom-function-helper`
  tiene sentido técnico, pero desplaza el foco hacia funciones.
- `campaign-06-custom-function-mixed`
  también funciona técnicamente, pero mete abstracción transversal como tema principal.
- `campaign-07-custom-type-intro`
  técnicamente existe, pero pedagógicamente se sale del scope lineal.
- `campaign-08-custom-type-integration`
  combina demasiadas capas para la versión acotada de tesis.

### Niveles placeholder sin valor pedagógico actual
Los `campaign-w*` heredados del plan antiguo repiten tableros base de stack con nombres distintos de mundo. No representan todavía un contenido real y, por tanto:

- no deben contarse como avance;
- no deben aparecer en una defensa como evidencia de cobertura;
- deben rediseñarse o descartarse.

## Incongruencias detectadas y decisión correctiva

### 1. Falta mundo de cola puro
Problema:
- hoy existe un nivel mixto `queue + stack`, pero no un nivel de cola pura suficientemente claro para introducir FIFO sin apoyo inmediato de otra estructura.

Corrección:
- crear `2` niveles nuevos de cola pura antes del nivel mixto `W3-L3`.

### 2. Falta mundo de lista realmente completo
Problema:
- hoy existe un buen nivel de recorte de bordes, pero no un nivel claro de construcción con `append/prepend`.

Corrección:
- crear exactamente `2` niveles nuevos de lista: uno de construcción y uno de cierre.

### 3. El onboarding ya no debe depender de niveles heredados de estructuras
Problema:
- si onboarding reutiliza niveles de pila, el usuario aprende semántica de estructura antes de dominar el editor.

Corrección:
- usar únicamente la serie `campaign-w0-*` como base del onboarding.

### 4. Integración actual está sesgada por funciones/tipos
Problema:
- los niveles mixtos existentes en la rama vieja empujan demasiado funciones o tipos.

Corrección:
- los niveles `W5-L1`, `W5-L3` y `W5-L4` deben reconstruirse como retos lineales puros.

## Backlog mínimo recomendado

### Reutilizar directo
- `campaign-w0-l1-first-contact`
- `campaign-w0-l2-step-and-reset`
- `campaign-w0-l3-read-before-run`
- `campaign-01-stack-top-transfer`
- `campaign-02-stack-build-from-scratch`
- `campaign-04-list-trim-edges`
- `campaign-03-queue-stack-reverse`

### Adaptar
- `mixed-playground`

### Crear desde cero
- `W2-L3`
- `W2-L4`
- `W3-L1`
- `W3-L2`
- `W4-L1`
- `W4-L3`
- `W5-L3`
- `W5-L4`

### Crear con referencia parcial
- `W5-L1`
- `W5-L2`

## Conclusión operativa
Si se busca una campaña de tesis coherente con el software real y con el scope acordado:

- no conviene seguir la campaña heredada de `6` mundos;
- no conviene contar placeholders como si fueran niveles reales;
- sí conviene rescatar `3` o `4` niveles bien construidos ya existentes;
- el resto debe diseñarse explícitamente para onboarding, cola, lista e integración acotada.

La conclusión práctica es que la campaña final de tesis está **parcialmente implementada**. Hoy ya existe una base sólida de:

- onboarding básico;
- introducción de pila;
- un nivel mixto fuerte de `queue + stack`;
- y un nivel fuerte de bordes de lista.

Lo faltante es cerrar deliberadamente:

- el mundo de cola pura;
- el mundo de lista completo;
- y el bloque final de integración de las tres estructuras.
