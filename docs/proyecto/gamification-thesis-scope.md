# Alcance de gamificación para tesis

## Estado
Este documento reemplaza como referencia funcional al enfoque de campaña con castillo, materiales y mundos de funciones/tipos.

La versión vigente para la tesis debe demostrar un modelo de gamificación **acotado**, centrado en estructuras de datos lineales y en evidencia pedagógica explícita.

## Objetivo
Definir una campaña suficientemente pequeña para:

- demostrar progresión por niveles;
- vincular cada nivel con un objetivo pedagógico concreto;
- mostrar retroalimentación inmediata y restricciones como reto;
- mantener el foco en el contenido del curso `INF261`.

No se busca construir un curso completo ni una capa de meta-juego extensa.

## Scope de la campaña
La campaña cubre exactamente cinco bloques:

1. Familiarización con el editor.
2. Mundo de pila.
3. Mundo de cola.
4. Mundo de lista.
5. Mundo de integración con retos mixtos.

En términos de volumen, la campaña debe quedar entre `16` y `20` niveles.

## Modelo de mundos
Se mantiene la idea de agrupar niveles por bloque pedagógico, pero con una implementación simple:

- sin castillo;
- sin materiales;
- sin mecánica de reparación;
- con mapa de nodos simple para navegación y progreso;
- con desbloqueo secuencial entre mundos;
- con progreso visible por mundo: `niveles completados / total`.

La pantalla de campaña debe funcionar como selector de mundos y niveles, no como meta-juego adicional.

El mapa de nodos sí es válido si se usa solo como interfaz de progresión:

- el avatar puede moverse entre nodos al hacer click;
- los nodos representan niveles;
- la ruta visual representa avance entre mundos y niveles;
- no debe introducir economía, reparación ni recompensas separadas del contenido.

Como mejora de onboarding, la primera entrada a campaña puede enviar directamente al primer nivel para evitar fricción inicial. Después de esa primera experiencia, el mapa puede mostrarse normalmente.

## Estructuras dentro del scope
El contenido principal de la campaña corresponde a:

- `stack`;
- `queue`;
- `list`;
- integración entre estructuras lineales.

Esto alinea la implementación con el alcance declarado de la tesis: `estructuras de datos lineales`.

## Funciones y múltiples scripts
`Funciones` y `múltiples scripts/routines` no deben presentarse como mundo propio.

Su tratamiento correcto es como **conocimiento transversal del editor**:

- pueden introducirse tardíamente cuando ayuden a organizar la solución;
- pueden aparecer en niveles de integración como herramienta de estructuración;
- no deben desplazar al concepto principal de estructura de datos del nivel.

En consecuencia:

- el contenido pedagógico principal sigue siendo la semántica y el comportamiento de las estructuras;
- las funciones y scripts son recursos de la plataforma para resolver o expresar estrategias.

## Reglas para `LevelTeachingPlan`
Cada nivel de campaña debe declarar un `LevelTeachingPlan`.

El campo mínimo obligatorio es:

- `introduces`: concepto principal que el nivel introduce.

Este campo existe para convertir la campaña en argumento académico trazable.

Ejemplos válidos:

- `introduces: "Transferencia de tope en pila con POP + PUSH"`
- `introduces: "Preservación del orden FIFO en cola"`
- `introduces: "Operaciones en extremos de lista"`
- `introduces: "Integración de stack, queue y list en una estrategia compuesta"`

Si un nivel usa capacidades del editor como funciones o múltiples scripts, eso debe tratarse como apoyo secundario, no como reemplazo del objetivo principal.

## Separación entre campaña y comunidad
La pertenencia de un nivel a campaña o comunidad no debe inferirse por prefijo del `id` ni por filtros ad hoc en la UI.

La separación correcta es por dato explícito en `LevelCatalogMetadata`:

- `catalog: "campaign"` para niveles reservados a la campaña;
- `catalog: "community"` para sandbox, niveles libres e importados.

La UI de community debe consumir esa clasificación explícita y no reconstruirla a partir de `campaign-worlds.json`.

## Qué queda fuera
Quedan fuera del scope de tesis:

- mundo de funciones como unidad pedagógica propia;
- mundo de tipos personalizados;
- castillo y mecánicas de reconstrucción;
- recompensas extrínsecas como puntos, insignias o rankings;
- validación empírica de aprendizaje con estudiantes reales.

Estas piezas pueden documentarse como trabajo futuro.

## Limitaciones que deben aparecer explícitamente en la tesis
### 1. Cobertura semántica, no implementación
La campaña enseña comportamiento y semántica de las estructuras, no su implementación en `C++` ni la gestión de memoria exigida por `INF261`.

### 2. Banco de niveles de demostración
Los niveles implementados validan la propuesta, pero no constituyen un currículo completo.

### 3. Sin motivación extrínseca
La gamificación no depende de puntos, insignias ni rankings. La motivación se apoya en reto, restricciones, claridad de objetivo y retroalimentación inmediata.

Eso no impide usar cierres visuales breves al completar niveles o mundos, siempre que funcionen como refuerzo de progreso visible y desbloqueo, no como economía de recompensas.

### 4. Sin validación de impacto pedagógico en esta entrega
La validación de esta entrega cubre usabilidad, no aprendizaje medible durante un ciclo académico.

## Cómo presentarlo en la tesis
El modelo de gamificación debe justificarse con lo ya implementado:

- progresión por niveles;
- objetivos explícitos;
- restricciones como reto;
- retroalimentación inmediata;
- visibilidad del progreso;
- cierres visuales breves al completar niveles o mundos.

En cambio, estas piezas deben presentarse como capacidades de plataforma complementarias, no como gamificación:

- sandbox;
- editor visual;
- niveles de comunidad;
- importación de niveles.

La tesis debe dejar explícito que la distinción es deliberada.

## Consecuencia de diseño
Si existe documentación anterior que describa:

- castillo;
- materiales;
- mundos de funciones;
- mundos de tipos;
- mapa de campaña complejo;

esa documentación debe tratarse como exploración previa o trabajo futuro, no como definición vigente del producto de tesis.
