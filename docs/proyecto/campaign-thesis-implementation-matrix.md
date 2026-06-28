# Matriz de implementación de campaña para tesis

## Propósito
Traducir la secuencia pedagógica final a una decisión práctica de implementación:

- qué niveles del repo ya sirven;
- cuáles requieren adaptación;
- cuáles faltan crear;
- cuáles existen pero no deben entrar al scope de tesis.

## Lectura rápida del estado actual

### Niveles ya útiles o casi útiles
- `intro-transfer`
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
| `W1-L1` | primer contacto con arrastrar, ejecutar y observar | `intro-transfer` | viable | `Adaptar` |
| `W1-L2` | usar `step` y `reset` para depurar | `intro-transfer` | viable | `Adaptar` |
| `W1-L3` | leer estado inicial y objetivo antes de programar | `campaign-01-stack-top-transfer` | viable | `Adaptar` |
| `W1-L4` | mini reto autónomo de onboarding | `campaign-01-stack-top-transfer` o nivel nuevo corto | parcial | `Crear` |
| `W2-L1` | LIFO básico con transferencia de tope | `campaign-01-stack-top-transfer` | listo | `Ya sirve` |
| `W2-L2` | construir pila objetivo con repetición | `campaign-02-stack-build-from-scratch` | listo | `Ya sirve` |
| `W2-L3` | usar pila auxiliar para reordenar | `campaign-05-custom-function-helper` sin función obligatoria | base técnica útil | `Adaptar` |
| `W2-L4` | cierre de pila con restricción simple | variante de `campaign-02` o `campaign-05` | parcial | `Crear` |
| `W3-L1` | FIFO básico en cola | variante simplificada de `campaign-03-queue-stack-reverse` sin foco en stack | parcial | `Crear` |
| `W3-L2` | rotación sin romper FIFO | nivel nuevo de cola | faltante | `Crear` |
| `W3-L3` | cierre de cola en reto simple | variante de `W3-L2` con restricción | faltante | `Crear` |
| `W4-L1` | operaciones en extremos de lista | nivel nuevo con `append/prepend` | faltante | `Crear` |
| `W4-L2` | recorte de bordes | `campaign-04-list-trim-edges` | listo | `Ya sirve` |
| `W4-L3` | reconstrucción simple con operaciones de extremos | nivel nuevo de lista | faltante | `Crear` |
| `W5-L1` | comparar stack, queue y list en reto pequeño | `mixed-playground` como base de tablero, no como nivel final | base técnica útil | `Adaptar` |
| `W5-L2` | resolver transformación mixta con estructura auxiliar | `campaign-03-queue-stack-reverse` o `campaign-06-custom-function-mixed` sin función obligatoria | base útil | `Adaptar` |
| `W5-L3` | reto mixto con restricciones | `campaign-065-synthesis-challenge` simplificado | riesgo medio | `Adaptar` |
| `W5-L4` | cierre de campaña con integración simple | nivel nuevo mixto corto | faltante | `Crear` |

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
- crear al menos `2` niveles nuevos de cola pura antes del nivel mixto.

### 2. Falta mundo de lista realmente completo
Problema:
- hoy existe un buen nivel de recorte de bordes, pero no un nivel claro de construcción con `append/prepend`.

Corrección:
- crear al menos `2` niveles nuevos de lista, uno de construcción y otro de cierre.

### 3. El onboarding todavía depende demasiado de niveles de estructuras existentes
Problema:
- si se reutiliza sin cambios `campaign-01`, el primer contacto del usuario entra demasiado rápido al concepto de pila.

Corrección:
- usarlo solo como base de tablero o crear un nivel onboarding más neutro.

### 4. Integración actual está sesgada por funciones/tipos
Problema:
- los niveles mixtos existentes en la rama vieja empujan demasiado funciones o tipos.

Corrección:
- los niveles de integración de tesis deben reconstruirse como retos mixtos cortos con estructuras lineales y restricciones simples.

## Backlog mínimo recomendado

### Reutilizar casi directo
- `campaign-01-stack-top-transfer`
- `campaign-02-stack-build-from-scratch`
- `campaign-04-list-trim-edges`

### Adaptar
- `intro-transfer`
- `campaign-03-queue-stack-reverse`
- `mixed-playground`

### Crear desde cero
- `W1-L4`
- `W2-L4`
- `W2-L1`
- `W2-L2`
- `W2-L3`
- `W3-L1`
- `W3-L3`
- `W4-L4`

### Crear probablemente desde cero, aunque con referencia parcial
- `W4-L1`
- `W4-L2`
- `W4-L3`

## Conclusión operativa
Si se busca una campaña de tesis coherente con el software real y con el scope acordado:

- no conviene seguir la campaña heredada de `6` mundos;
- no conviene contar placeholders como si fueran niveles reales;
- sí conviene rescatar `3` o `4` niveles bien construidos ya existentes;
- el resto debe diseñarse explícitamente para onboarding, cola, lista e integración acotada.

La conclusión práctica es que la campaña final de tesis **no está mayormente implementada todavía**. Lo que existe hoy es una mezcla de:

- unos pocos niveles realmente útiles;
- una exploración previa de funciones/tipos;
- y varios stubs de mundos antiguos.

Eso no es un problema si se documenta bien: sirve justamente para separar qué se conserva, qué se adapta y qué se construye de forma deliberada para la versión final de tesis.
