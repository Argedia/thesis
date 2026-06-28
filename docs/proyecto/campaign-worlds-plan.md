# Plan de contenidos de campaña por mundos

> Nota: este documento describe una exploración anterior con castillo, materiales y mundos de funciones/tipos.
> La referencia vigente para el alcance de tesis es [docs/proyecto/gamification-thesis-scope.md](C:\Users\aguerra\Documents\thesis\.worktrees\gamification\docs\proyecto\gamification-thesis-scope.md).

## Objetivo
Definir qué enseña cada mundo y qué niveles lo componen, para implementar una progresión clara en la campaña tipo mapa.

## Convención
- `Mundo`: unidad pedagógica principal.
- `Nivel`: desafío concreto dentro de un mundo.
- `Piles`: se interpreta como **colas (queues)** para mantener consistencia de términos en el proyecto.

## Estructura global propuesta
1. Mundo 0: Fundamentos del editor
2. Mundo 1: Estructuras por defecto (stack, queue, list)
3. Mundo 2: Patrones de transformación
4. Mundo 3: Composición de estructuras
5. Mundo 4: Abstracción con funciones
6. Mundo 5: Modelado con tipos
7. Mundo 6: Integración final

## Mapa principal de mundos (hub de campaña)
Este es el **primer mapa** que se muestra al entrar a campaña.

### Topología del hub (6 nodos de mundo + castillo central)
```text
  W1 - W2
   |    |
W6 -  C - W3
   |    |
  W5 - W4
```

- `C`: castillo (hub principal y punto de inicio visual).
- `W1..W6`: nodos de mundo jugables.

### Estado inicial de desbloqueo
- Al entrar por primera vez:
- `W1` desbloqueado.
- `W2, W3, W4, W5, W6` bloqueados.
- El avatar inicia en `C`.

### Regla de desbloqueo entre mundos
- Para desbloquear el siguiente mundo conectado, el jugador debe completar al menos `N` niveles del mundo actual.
- `N` se define por mundo y es exactamente la cantidad de niveles numéricos obligatorios de ese mundo.
- En este plan: Mundo 0 usa `N=4`; Mundos 1..6 usan `N=5`.

### Regla de robustez por tamaño de mundo
- Si un mundo tiene menos niveles que `N`, el umbral efectivo será:
- `min(N, totalNivelesDelMundo)`.
- Así evitamos mundos imposibles de progresar.

### Orden sugerido de progresión principal
- Ruta recomendada por diseño: `W1 -> W2 -> W3 -> W4 -> W5 -> W6`.
- El grafo permite sensación de mapa con bifurcaciones leves, pero la progresión pedagógica se mantiene controlada por la regla de desbloqueo.

### Progreso visible por mundo (materiales del castillo)
- Cada mundo debe mostrar un contador: `Conseguidos n/N`.
- `n`: materiales obtenidos (niveles completados en ese mundo).
- `N`: mínimo para reparar esa sección del castillo y desbloquear el siguiente mundo.
- Completar niveles por encima de `N` aporta progreso extra al castillo global (100%).

### Regla de desbloqueo dentro de cada mundo
- Al entrar a un mundo, **todos sus niveles quedan disponibles**.
- No hay prerrequisitos entre niveles del mismo mundo (se resuelven en cualquier orden).
- Los niveles numéricos y con letras se mantienen como clasificación pedagógica (base vs profundización), no como bloqueo técnico.
- Para avanzar de mundo se mantiene la regla de materiales `n/N`.

### Ajuste de secuencia pedagógica (orden parcial)
- Dentro de cada mundo, el orden no siempre es estricto.
- Hay niveles de conceptos independientes que se pueden resolver en paralelo.
- Ejemplo: un nivel solo de `stack` y otro solo de `list` pueden intentarse en cualquier orden.
- Solo se fuerza orden cuando existe dependencia real:
- introducción de herramienta/concepto nuevo,
- nivel integrador final del mundo,
- o nivel que reutiliza explícitamente una técnica anterior.

## Sistema único de progresión por mundo
- Los niveles numéricos (`X-1`, `X-2`, ...) son obligatorios.
- Los niveles con letra (`X-1A`, `X-2B`, ...) son opcionales de profundización.
- En cada mundo, `N = cantidad de niveles numéricos obligatorios`.
- No existe orden obligatorio dentro del mundo; las conexiones son solo guía visual/recomendada.

### Regla práctica para diseñar cada mundo
- `X-1`: nivel de entrada (sí conviene hacerlo primero).
- `X-2`, `X-3`, `X-4`: bloque de práctica paralela (sin orden rígido, salvo dependencia explícita).
- `X-5`: cierre/integración del mundo (sí conviene dejarlo al final).

---

## Mundo 0 · Fundamentos del editor
**Meta:** aprender a usar el entorno antes de enseñar EDD.

### Niveles (contenido + estructura)
1. `0-1` Arrastrar y ejecutar
- Contenido: colocar bloque, elegir operación y correr.
- Estructura: `stack` simple (`A`, `B`).
2. `0-2` Step, pause, reset
- Contenido: ciclo básico de depuración.
- Estructura: `stack` simple.
3. `0-3` Leer inicial vs objetivo
- Contenido: interpretar estado y planificar secuencia mínima.
- Estructura: `queue` simple.
4. `0-4` Mini desafío guiado
- Contenido: resolver sin ayudas contextuales.
- Estructura: `stack` + `queue`.
5. `0-2A` Profundización de depuración (opcional)
- Contenido: uso fino de step y reset con errores comunes.
- Estructura: `stack`.

### Ruta sugerida (topología: lineal con micro-rama)
- Principal: `0-1 -> 0-2 -> 0-3 -> 0-4`
- Profundización: `0-2A` (en paralelo entre `0-2` y `0-4`)

### Materiales del mundo
- Obligatorios: `4`
- Opcionales: `1`
- Total: `5`
- Requisito: `Conseguidos n/N`, con `N = 4`

---

## Mundo 1 · Estructuras por defecto
**Meta:** dominar operaciones base en stack, queue y list.

### Niveles (contenido + estructura)
1. `1-1` Transferencia de tope
- Contenido: `POP + PUSH`.
- Estructura: `stack`.
2. `1-2` Construir stack desde cero
- Contenido: repetición manual de `POP/PUSH`.
- Estructura: `stack`.
3. `1-3` Operaciones base de cola
- Contenido: `DEQUEUE + ENQUEUE`.
- Estructura: `queue`.
4. `1-4` Operaciones base de lista
- Contenido: `APPEND/PREPEND/REMOVE`.
- Estructura: `list`.
5. `1-5` Cierre de fundamentos
- Contenido: elegir operación correcta según estructura.
- Estructura: `stack + queue + list`.
6. `1-3A` Cola: rotación y estabilidad (opcional)
- Contenido: mantener orden bajo restricciones.
- Estructura: `queue`.
7. `1-4A` Lista: extremos y casos borde (opcional)
- Contenido: trim de bordes y validaciones.
- Estructura: `list`.

### Ruta sugerida (topología: abanico por estructura)
- Entrada común: `1-1`
- Ramas principales:
- `1-1 -> 1-2` (stack)
- `1-1 -> 1-3` (queue)
- `1-1 -> 1-4` (list)
- Convergencia: `1-5` (integrador)
- Profundización: `1-3A` desde `1-3`, `1-4A` desde `1-4`

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `2`
- Total: `7`
- Requisito: `N = 5`

---

## Mundo 2 · Patrones de transformación
**Meta:** aplicar estrategias algorítmicas sobre EDD lineales.

### Niveles (contenido + estructura)
1. `2-1` Invertir secuencia
- Contenido: inversión usando auxiliar.
- Estructura: `stack + queue`.
2. `2-2` Transferencia estable
- Contenido: mover sin romper orden final.
- Estructura: `queue + list`.
3. `2-3` Filtrar por regla
- Contenido: separar por criterio (par/impar, umbral, etc.).
- Estructura: `queue` con salida auxiliar.
4. `2-4` Partición en dos destinos
- Contenido: distribución de elementos en dos estructuras.
- Estructura: `queue + queue`.
5. `2-5` Checkpoint de patrones
- Contenido: combinación de transformación + restricciones de pasos.
- Estructura: `stack + queue + list`.
6. `2-3A` Filtro con límite estricto (opcional)
- Contenido: optimización de bloques/pasos.
- Estructura: `queue`.
7. `2-3B` Filtro con condición compuesta (opcional)
- Contenido: combinar dos criterios de selección.
- Estructura: `queue + list`.

### Ruta sugerida (topología: dos rutas alternativas + convergencia)
- Entrada: `2-1`
- Ruta A: `2-1 -> 2-2 -> 2-4`
- Ruta B: `2-1 -> 2-3`
- Convergencia: `2-5`
- Profundización: `2-3A`, `2-3B` desde `2-3`

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `2`
- Total: `7`
- Requisito: `N = 5`

---

## Mundo 3 · Composición de estructuras
**Meta:** resolver problemas que requieren coordinación entre EDD.

### Niveles (contenido + estructura)
1. `3-1` Coordinación básica
- Contenido: mover información entre dos estructuras.
- Estructura: `stack + queue`.
2. `3-2` Buffer intermedio
- Contenido: usar tercera estructura como staging.
- Estructura: `queue + list`.
3. `3-3` Fase triple I
- Contenido: pipeline de 3 pasos.
- Estructura: `stack + queue + list`.
4. `3-4` Fase triple II
- Contenido: reasignación de responsabilidades por estructura.
- Estructura: `stack + queue + list`.
5. `3-5` Checkpoint de composición
- Contenido: reto mixto integral del mundo.
- Estructura: `stack + queue + list`.
6. `3-2A` Profundización de buffer (opcional)
- Contenido: minimización de movimientos redundantes.
- Estructura: `queue + list`.

### Ruta sugerida (topología: diamante)
- Entrada: `3-1`
- Bifurcación:
- `3-1 -> 3-2`
- `3-1 -> 3-3`
- Reunión intermedia: `3-4`
- Cierre: `3-5`
- Profundización: `3-2A` desde `3-2`

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `1`
- Total: `6`
- Requisito: `N = 5`

---

## Mundo 4 · Abstracción con funciones
**Meta:** encapsular lógica repetida y reutilizarla.

### Niveles (contenido + estructura)
1. `4-1` Crear primera función helper
- Contenido: definición y llamada simple.
- Estructura: `stack`.
2. `4-2` Reusar helper
- Contenido: eliminación de repetición en script principal.
- Estructura: `stack + queue`.
3. `4-3` Dos funciones coordinadas
- Contenido: separar responsabilidades.
- Estructura: `queue + list`.
4. `4-4` Función con condicional
- Contenido: control de flujo dentro de función.
- Estructura: `stack + list`.
5. `4-5` Checkpoint de abstracción
- Contenido: resolver límite de pasos vía diseño de funciones.
- Estructura: `stack + queue + list`.
6. `4-2A` Reuso intensivo (opcional)
- Contenido: forzar múltiples invocaciones de helper.
- Estructura: `stack`.
7. `4-4A` Condicionales avanzadas en función (opcional)
- Contenido: decisión por estado de estructura.
- Estructura: `queue + list`.

### Ruta sugerida (topología: escalera)
- Secuencia principal:
- `4-1 -> 4-2 -> 4-3 -> 4-4 -> 4-5`
- Profundización colocada en peldaños:
- `4-2A` después de `4-2`
- `4-4A` después de `4-4`

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `2`
- Total: `7`
- Requisito: `N = 5`

---

## Mundo 5 · Modelado con tipos
**Meta:** definir tipos, instancias y operaciones de campos.

### Niveles (contenido + estructura)
1. `5-1` Definir tipo básico
- Contenido: campos simples.
- Estructura: `type` + `stack`.
2. `5-2` Instanciar y asignar
- Contenido: crear objetos y setear campos.
- Estructura: `type` + `queue`.
3. `5-3` Tipos dentro de EDD
- Contenido: almacenar objetos en estructuras lineales.
- Estructura: `type` + `stack + queue`.
4. `5-4` Leer/actualizar campos en flujo
- Contenido: field read/write durante ejecución.
- Estructura: `type` + `list`.
5. `5-5` Checkpoint de modelado
- Contenido: integración tipo + estructuras + restricciones.
- Estructura: `type` + `stack + queue + list`.
6. `5-3A` Nodo doble (opcional)
- Contenido: pre-requisito para modelar doble enlace (`prev/next`).
- Estructura: `type Node` con dos referencias.
7. `5-4A` Doble lista mínima (opcional)
- Contenido: construir y validar cadena doblemente enlazada con funciones.
- Estructura: `type Node` + `type DList`.

### Ruta sugerida (topología: híbrida, casi secuencial)
- Secuencia base:
- `5-1 -> 5-2`
- Bloque de aplicación (orden flexible):
- `5-3` y `5-4` en cualquier orden
- Cierre: `5-5`
- Profundización especializada:
- `5-3A` después de `5-3`
- `5-4A` después de `5-4` (idealmente tras `5-3A`)

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `2`
- Total: `7`
- Requisito: `N = 5`

---

## Mundo 6 · Integración final
**Meta:** resolver retos globales con decisiones de diseño.

### Niveles (contenido + estructura)
1. `6-1` Capstone I
- Contenido: integración de operaciones base + composición.
- Estructura: `stack + queue`.
2. `6-2` Capstone II
- Contenido: restricciones de pasos y operaciones requeridas.
- Estructura: `stack + queue + list`.
3. `6-3` Capstone III
- Contenido: tipo personalizado obligatorio.
- Estructura: `type` + `list`.
4. `6-4` Capstone IV
- Contenido: función + tipo + composición.
- Estructura: `type` + `functions` + `stack/queue`.
5. `6-5` Final del castillo
- Contenido: desafío final integral.
- Estructura: todas las piezas habilitadas.
6. `6-3A` Modo experto (opcional)
- Contenido: mismos objetivos con límite más duro de pasos.
- Estructura: misma base de `6-3`.

### Ruta sugerida (topología: hub de pre-finales)
- Entrada: `6-1`
- Nodos de preparación (hub):
- `6-2`, `6-3`, `6-4` en orden libre
- Cierre global: `6-5`
- Profundización experta: `6-3A` después de `6-3`

### Materiales del mundo
- Obligatorios: `5`
- Opcionales: `1`
- Total: `6`
- Requisito: `N = 5`

---

## Mapeo inicial con niveles ya existentes
Los niveles actuales `campaign-01` a `campaign-08` pueden mapearse temporalmente en:
- Mundo 1 (parte de default DS), Mundo 3 (composición básica), Mundo 4/5 (funciones y tipos).
- Luego se completa cobertura con niveles nuevos en Mundo 0, 2 y 6.

## Criterios mínimos de calidad por mundo
- Debe introducir una sola idea principal al inicio.
- Debe cerrar con al menos un nivel de transferencia (aplicar la idea en contexto nuevo).
- Debe aumentar dificultad en pasos, operaciones requeridas o límite de bloques.

## Pendientes
- Definir IDs finales de nivel por mundo para JSON.
- Definir coordenadas finales `(x, y)` del hub de mundos y estilos visuales de nodos bloqueados/desbloqueados.
- Definir hito del castillo asociado a cada mundo.
- Implementar UI de contador por mundo `Conseguidos n/N` y su impacto en progreso global del castillo.

---

## Dependencias de conocimiento (mapa pedagógico no bloqueante)

**Nota de implementación**
- Estas dependencias ordenan el aprendizaje, pero **no bloquean** niveles.
- Dentro de un mundo, el jugador puede resolver en cualquier orden.
- El único bloqueo de progreso es por materiales `n/N` para abrir el siguiente mundo.

### Grafo global de dependencias (recomendadas)
- `M0` Fundamentos editor -> base para todo lo demás.
- `M1` Estructuras por defecto -> prerequisito de `M2` y `M3`.
- `M2` Patrones de transformación -> fortalece `M3`.
- `M3` Composición de estructuras -> prerequisito natural de `M4`.
- `M4` Funciones -> prerequisito de `M6` (capstones con abstracción).
- `M5` Tipos -> prerequisito de `M6` (capstones con modelado).
- `M6` Integración final <- depende de `M3 + M4 + M5`.

### Dependencias por mundo (intra-mundo, recomendadas)

#### Mundo 0
- `0-1` recomendado como entrada.
- `0-2` y `0-3` recomendados después de `0-1`.
- `0-4` recomendado tras `0-2` y `0-3`.
- `0-2A` recomendado tras `0-2`.

#### Mundo 1
- `1-1` recomendado como entrada.
- `1-2`, `1-3`, `1-4` pueden resolverse en cualquier orden (temas paralelos).
- `1-5` recomendado después de al menos dos entre `1-2`, `1-3`, `1-4`.
- `1-3A` recomendado tras `1-3`.
- `1-4A` recomendado tras `1-4`.

#### Mundo 2
- `2-1` recomendado como entrada.
- `2-2`, `2-3`, `2-4` pueden resolverse en cualquier orden.
- `2-5` recomendado tras al menos dos entre `2-2`, `2-3`, `2-4`.
- `2-3A`, `2-3B` recomendados tras `2-3`.

#### Mundo 3
- `3-1` recomendado como entrada.
- `3-2`, `3-3`, `3-4` pueden resolverse en cualquier orden.
- `3-5` recomendado tras al menos dos entre `3-2`, `3-3`, `3-4`.
- `3-2A` recomendado tras `3-2`.

#### Mundo 4
- `4-1` recomendado como entrada.
- `4-2`, `4-3`, `4-4` pueden resolverse en cualquier orden (siempre que ya se haya visto `4-1`).
- `4-5` recomendado tras al menos dos entre `4-2`, `4-3`, `4-4`.
- `4-2A` recomendado tras `4-2`.
- `4-4A` recomendado tras `4-4`.

#### Mundo 5
- `5-1` recomendado como entrada.
- `5-2` recomendado tras `5-1`.
- `5-3` y `5-4` pueden resolverse en cualquier orden tras `5-2`.
- `5-5` recomendado tras al menos uno entre `5-3` y `5-4`.
- `5-3A` recomendado tras `5-3`.
- `5-4A` recomendado tras `5-4` y `5-3A`.

#### Mundo 6
- `6-1` recomendado como entrada.
- `6-2`, `6-3`, `6-4` pueden resolverse en cualquier orden.
- `6-5` recomendado como cierre tras `6-2`, `6-3` y `6-4`.
- `6-3A` recomendado tras `6-3`.

### Regla de diseño recomendada
- No bloquear niveles por dependencia interna.
- Marcar ruta sugerida en la UI (`Recomendado`) para orientar al estudiante.
- Mantener desbloqueo entre mundos únicamente por `n/N`.
