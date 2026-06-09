---
render_with_liquid: false
---
# Plan Maestro de Sistema de UI y Theme

## 1. Propósito del documento

Este documento define la planificación end-to-end para construir un sistema de UI y theme consistente en este proyecto.

Su función es doble:

1. servir como hoja de ruta técnica completa para ejecutar la refactorización;
2. servir como contrato operativo para futuras sesiones de desarrollo, evitando que se vuelva a degradar la consistencia visual y estructural.

Este documento no describe una mejora puntual de estilos. Define una reorganización arquitectónica de cómo se representa, compone, tematiza y mantiene la UI del proyecto.

## 2. Alcance

Este plan cubre:

- `app/` como aplicación React principal;
- `ui-editor/` como paquete visual compartido;
- interacción entre componentes React, CSS global, estilos inline, primitives accesibles y layout visual;
- reglas para pantallas de juego, campaña, comunidad, editor y settings;
- reglas para diseño futuro de componentes y tokens;
- estrategia de migración por fases;
- criterios de aceptación;
- checklist para revisar PRs;
- instrucciones explícitas para futuras sesiones de Codex o de cualquier desarrollador.

Este plan no cubre:

- rediseño pedagógico del producto;
- cambios de dominio en `core-engine/` o `game-system/` fuera de lo necesario para exponer metadatos visuales limpios;
- sistema de branding corporativo externo;
- theming multi-brand;
- dark mode en primera fase.

## 3. Diagnóstico actual

### 3.1 Problemas estructurales observados

La UI actual tiene cuatro fuentes de verdad visual en conflicto:

1. CSS global base que estiliza elementos HTML directamente, por ejemplo `button` y `body` en [app/src/styles/base.css](C:\Users\aguerra\Documents\thesis\app\src\styles\base.css).
2. CSS global por pantallas y shells, por ejemplo `.topbar`, `.menu-link`, `.back-link`, `.catalog-topbar` en [app/src/styles/app-layout.css](C:\Users\aguerra\Documents\thesis\app\src\styles\app-layout.css).
3. componentes React que usan `react-aria-components`, pero solo en algunas zonas, por ejemplo [app/src/components/ui/AppOverlay.tsx](C:\Users\aguerra\Documents\thesis\app\src\components\ui\AppOverlay.tsx).
4. `ui-editor` con estilos inline hardcodeados, por ejemplo `cardStyle`, `Screen`, `Panel`, `TabBar`, `CollapsiblePanel`, `LargeActionButton` en [ui-editor/src/index.tsx](C:\Users\aguerra\Documents\thesis\ui-editor\src\index.tsx).

### 3.2 Consecuencias

Esto produce:

- inconsistencia visual entre pantallas;
- duplicación de colores, bordes, radios y espaciados;
- baja capacidad de reutilización;
- dificultad para hacer cambios globales sin side effects;
- imposibilidad práctica de tener un theme coherente transversal entre `app` y `ui-editor`;
- crecimiento desordenado de clases CSS;
- mezcla de semántica de producto con decisiones visuales de bajo nivel;
- más fricción cuando varios desarrolladores editan UI en paralelo.

### 3.3 Problemas específicos

1. **Global styles demasiado agresivos**  
   Estilizar `button` globalmente hace que cualquier botón nuevo herede una apariencia no intencionada.

2. **Clases reutilizables sin sistema**  
   `.menu-link`, `.back-link`, `.topbar`, `.mini-tag`, `.error-banner` actúan como pseudo-componentes, pero viven como clases globales dispersas.

3. **Hardcodes de color en TS y CSS**  
   Hay hexadecimales repetidos en CSS, en `ui-editor`, en `EditorShell` y en lógica de bloques.

4. **`ui-editor` rompe el theme**  
   El paquete compartido toma decisiones visuales completas con `style={...}`. Eso lo vuelve difícil de tematizar desde `app`.

5. **No existe taxonomía de UI**  
   No está definido qué es primitive, layout, pattern, screen, token o visual domain mapping.

6. **No hay reglas de gobernanza**  
   Cualquier desarrollador puede agregar otra clase global o otro color inline sin barreras técnicas ni documentales.

## 4. Objetivo arquitectónico

El objetivo no es “tener CSS más bonito”. El objetivo es que la UI del proyecto pase a tener una arquitectura explícita:

1. una sola fuente de verdad para tokens visuales;
2. primitives accesibles y reutilizables;
3. layouts estructurales claramente separados de pantallas;
4. patterns de producto para casos repetidos del dominio;
5. posibilidad de retematizar `app` y `ui-editor` sin reescribir pantallas;
6. reglas duras para evitar regresión a estilos ad hoc.

## 5. Principios rectores

Todo el trabajo debe obedecer estos principios:

1. **token first**  
   ningún color, spacing, radius, shadow o font-size semántico debe introducirse primero en una pantalla.

2. **componentes antes que clases utilitarias arbitrarias**  
   si una UI aparece en más de un lugar, debe vivir como componente.

3. **layout separado de producto**  
   `PageHeader` no debe saber de “campaña”; `CampaignStepCard` sí.

4. **headless o themeable en paquetes compartidos**  
   `ui-editor` no debe decidir el theme completo por sí mismo.

5. **accesibilidad por defecto**  
   cuando exista primitive interactiva, usar preferentemente `react-aria-components`.

6. **sin estilos inline salvo geometría dinámica**  
   estilos inline solo son aceptables para canvas, posicionamiento dinámico, dimensiones calculadas o transforms runtime.

7. **cambios incrementales y verificables**  
   no hacer big bang. Migrar por capas.

## 6. Arquitectura objetivo

### 6.1 Capas de UI

La UI debe organizarse en cuatro capas.

#### A. `foundations`

Responsabilidad:

- tokens;
- theme;
- reset;
- motion;
- z-index;
- tipografía;
- mapeos visuales de dominio cuando sean compartidos.

Contenido esperado:

- `tokens.css`
- `theme-light.css`
- `reset.css`
- `motion.css`
- `typography.css`
- `structure-colors.ts`
- `semantic-colors.ts`

#### B. `primitives`

Responsabilidad:

- componentes mínimos, reutilizables, independientes de features.

Ejemplos:

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Tag`
- `Card`
- `Surface`
- `Dialog`
- `Popover`
- `Tooltip`
- `Banner`
- `Badge`
- `Divider`

#### C. `layout`

Responsabilidad:

- componer espacio, jerarquía visual y estructura de páginas.

Ejemplos:

- `AppPage`
- `PageHeader`
- `PageSection`
- `SidebarLayout`
- `SplitPane`
- `Stack`
- `Inline`
- `Cluster`
- `PanelFrame`
- `Toolbar`

#### D. `patterns`

Responsabilidad:

- componentes del producto que combinan primitives y layout para casos repetidos.

Ejemplos:

- `LevelCard`
- `CampaignStepCard`
- `LevelMetaTags`
- `EmptyState`
- `StatusBanner`
- `SearchToolbar`
- `EditorInspectorSection`
- `RoutineChipList`

### 6.2 Pantallas

Las pantallas deben vivir aparte y solo orquestar datos y patterns.

Ejemplos actuales afectados:

- `CampaignScreen`
- `CommunityLevelsScreen`
- `EditorDraftsScreen`
- `EditorShell`
- `PlayerShell`
- `SettingsScreen`
- `PlayLevelScreen`

Una pantalla no debe definir:

- su propio botón base;
- su propio tag base;
- su propio banner base;
- sus colores de borde primarios;
- sus radios semánticos;
- sus spacing escalados base.

## 7. Estructura de carpetas objetivo

### 7.1 En `app/src`

```text
app/src/
  ui/
    foundations/
      reset.css
      tokens.css
      theme-light.css
      motion.css
      typography.css
      structure-colors.ts
      semantic-colors.ts
    primitives/
      Button/
        Button.tsx
        Button.css
      IconButton/
      Input/
      Select/
      Tag/
      Card/
      Surface/
      Banner/
      Dialog/
      Tooltip/
      index.ts
    layout/
      AppPage/
      PageHeader/
      PageSection/
      SplitPane/
      SidebarLayout/
      Toolbar/
      Stack/
      Inline/
      index.ts
    patterns/
      LevelCard/
      CampaignStepCard/
      EmptyState/
      StatusBanner/
      LevelMetaTags/
      SearchToolbar/
      index.ts
  screens/
    Campaign/
    CommunityLevels/
    EditorDrafts/
    EditorShell/
    Player/
    Settings/
```

### 7.2 En `ui-editor/src`

`ui-editor` debe dejar de ser “paquete con colores y look completo embebido” y pasar a ser:

```text
ui-editor/src/
  components/
    Screen/
    Panel/
    Workspace/
    SplitPane/
    TabBar/
    CollapsiblePanel/
  board/
    StructuresBoard.tsx
    board-theme.ts
  index.tsx
```

Si `ui-editor` sigue exportando UI visible, sus componentes deben:

- aceptar `className`;
- aceptar variantes semánticas;
- depender de CSS variables en lugar de valores hardcodeados;
- dejar decisiones de theme a la app consumidora.

## 8. Diseño de tokens

### 8.1 Regla base

Los tokens deben ser semánticos, no contextuales ni “bonitos”.

Correcto:

- `--color-bg-app`
- `--color-surface-raised`
- `--color-border-strong`
- `--color-text-muted`

Incorrecto:

- `--blue-1` como token primario de uso app;
- `--campaign-button-blue`;
- `--editor-purple-soft`.

### 8.2 Familias mínimas de tokens

#### Color

- `--color-bg-app`
- `--color-bg-subtle`
- `--color-surface-1`
- `--color-surface-2`
- `--color-surface-3`
- `--color-border-subtle`
- `--color-border-default`
- `--color-border-strong`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-muted`
- `--color-text-inverse`
- `--color-accent`
- `--color-accent-hover`
- `--color-accent-strong`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`
- `--color-overlay`

#### Spacing

- `--space-1`
- `--space-2`
- `--space-3`
- `--space-4`
- `--space-5`
- `--space-6`
- `--space-7`
- `--space-8`

#### Radius

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-pill`

#### Shadow

- `--shadow-sm`
- `--shadow-md`
- `--shadow-lg`

#### Typography

- `--font-family-sans`
- `--font-family-mono`
- `--font-size-1` a `--font-size-8`
- `--font-weight-regular`
- `--font-weight-medium`
- `--font-weight-bold`
- `--font-weight-heavy`
- `--line-height-tight`
- `--line-height-normal`

#### Motion

- `--duration-fast`
- `--duration-normal`
- `--duration-slow`
- `--easing-standard`

#### Z-index

- `--z-base`
- `--z-dropdown`
- `--z-sticky`
- `--z-modal`
- `--z-toast`
- `--z-tooltip`

### 8.3 Tokens de dominio

Los colores de estructuras no deben estar repartidos en múltiples módulos.

Definir una sola fuente, por ejemplo:

- `--color-structure-stack`
- `--color-structure-queue`
- `--color-structure-list`
- `--color-structure-function`
- `--color-structure-variable`

Y además un mapping TS:

- `structureColorByKind`
- `operationAccentByKind`

Ese mapping se consume donde se necesite lógica, pero el valor fuente debe seguir un contrato común.

## 9. Catálogo objetivo de primitives

### 9.1 `Button`

Debe soportar:

- `variant`: `primary`, `secondary`, `ghost`, `danger`, `quiet`
- `size`: `sm`, `md`, `lg`
- `isDisabled`
- `isLoading`
- `startIcon`, `endIcon`
- render como botón o link si hace falta una abstracción segura

Debe reemplazar:

- `menu-link`
- botones sueltos de settings
- botones de dialogs
- botones secundarios de topbars

### 9.2 `Tag`

Debe soportar:

- `tone`: `neutral`, `info`, `success`, `warning`, `danger`, `accent`
- `size`: `sm`, `md`

Debe reemplazar:

- `mini-tag`
- badges de published/draft

### 9.3 `Banner`

Debe soportar:

- `tone`: `info`, `warning`, `danger`, `success`
- título opcional
- body opcional

Debe reemplazar:

- `error-banner`
- mensajes de estado repetidos

### 9.4 `Card` y `Surface`

Separación recomendada:

- `Surface`: decide fondo, borde, elevación;
- `Card`: composición de surface con body, header, footer opcionales.

### 9.5 `Dialog` y `Popover`

Reusar `react-aria-components`, pero envolverlos en primitives de proyecto.

El wrapper actual `AppOverlay` debe evolucionar hacia:

- `DialogRoot`
- `DialogContent`
- `DialogHeader`
- `DialogActions`
- `PopoverContent`

## 10. Catálogo objetivo de layouts

### 10.1 `AppPage`

Responsabilidad:

- ancho útil;
- padding exterior;
- manejo de scroll vertical principal;
- modo visual si es necesario: `player`, `editor`, `settings`.

### 10.2 `PageHeader`

Responsabilidad:

- acción de volver opcional;
- eyebrow opcional;
- título;
- subtitle opcional;
- actions slot.

Debe absorber:

- `.topbar`
- `.community-topbar`
- `.primary-screen-topbar`
- `.settings-topbar`

### 10.3 `Toolbar`

Responsabilidad:

- agrupar búsqueda, filtros, sort, CTA secundaria.

Debe absorber:

- `.catalog-topbar`
- secciones similares en editor/community

### 10.4 `SplitPane` y `SidebarLayout`

Responsabilidad:

- layouts de dos y tres columnas;
- variantes responsive controladas;
- manejo explícito de colapso.

## 11. Catálogo objetivo de patterns

### 11.1 `CampaignStepCard`

Debe encapsular:

- índice;
- estado `locked/unlocked/completed/current`;
- título;
- descripción;
- meta;
- CTA primaria.

### 11.2 `LevelCard`

Debe encapsular:

- título;
- autor;
- tags;
- restricciones;
- preview action;
- CTA de play/open.

### 11.3 `SearchToolbar`

Debe encapsular:

- input de búsqueda;
- select de orden;
- acciones secundarias.

### 11.4 `StatusBanner`

Debe recibir:

- `type`
- `title`
- `message`
- acción opcional

## 12. Estrategia para `ui-editor`

## 12.1 Problema

`ui-editor` hoy exporta UI con fuerte decisión estética embebida.

Eso afecta:

- `Screen`
- `Panel`
- `Workspace`
- `SplitPane`
- `TabBar`
- `CollapsiblePanel`
- `LargeActionButton`
- board wrappers y surfaces

## 12.2 Objetivo

Convertir `ui-editor` en un paquete:

- themeable;
- estable;
- de layout y render;
- no dueño del look global de la app.

## 12.3 Reglas de migración para `ui-editor`

1. mover colores hardcodeados a variables CSS o a un contrato `board-theme.ts`;
2. reemplazar `style={...}` estático por clases CSS o CSS variables;
3. mantener inline styles solo para:
   - tamaño de canvas;
   - transforms;
   - posiciones calculadas;
   - geometría dependiente del runtime;
4. permitir `className` en todos los contenedores exportados;
5. evitar exportar primitives visuales redundantes si ya existirán en `app/ui/primitives`.

## 12.4 Decisión arquitectónica recomendada

Separar dos tipos de piezas:

1. piezas agnósticas y reusables de render/editor que permanecen en `ui-editor`;
2. primitives de branding y look-and-feel que pertenecen a `app`.

Si un componente de `ui-editor` es puramente visual pero no aporta reutilización entre apps, considerar migrarlo a `app`.

## 13. Estrategia de migración por fases

## Fase 0. Inventario y congelamiento

Objetivo:

- entender qué existe y frenar crecimiento inconsistente.

Tareas:

1. inventariar clases globales activas;
2. inventariar colores hex repetidos;
3. inventariar primitives existentes y pseudo-primitives CSS;
4. listar componentes `ui-editor` con inline style estático;
5. definir lista de componentes objetivo y mapping de reemplazo.

Entregables:

- tabla de clases antiguas -> componente nuevo;
- tabla de hex -> token destino;
- lista de hot spots de migración.

Regla temporal:

- no introducir nuevas clases globales salvo bugfix urgente.

## Fase 1. Foundations

Objetivo:

- introducir la base del sistema sin romper pantallas.

Tareas:

1. crear `app/src/ui/foundations/`;
2. extraer tokens desde CSS y hardcodes repetidos;
3. introducir `reset.css` y mover ahí solo reglas verdaderamente globales;
4. eliminar estilo global directo de `button`, `input`, etc.;
5. crear theme light inicial.

Criterio de salida:

- app compila;
- tokens cargados una sola vez;
- no hay dependencias circulares;
- los componentes viejos siguen renderizando.

## Fase 2. Primitives mínimas

Objetivo:

- reemplazar pseudo-componentes más usados.

Orden recomendado:

1. `Button`
2. `Tag`
3. `Banner`
4. `Card`
5. `Input`
6. `Select`
7. `Dialog`
8. `Tooltip`

Criterio de salida:

- al menos 70% de botones visibles en `app` usan primitive;
- `mini-tag` y `error-banner` ya tienen reemplazo oficial;
- dialogs comparten look y spacing.

## Fase 3. Layouts

Objetivo:

- estabilizar shells y headers.

Orden recomendado:

1. `AppPage`
2. `PageHeader`
3. `Toolbar`
4. `SplitPane`
5. `SidebarLayout`

Reemplazos esperados:

- `.topbar`
- `.community-topbar`
- `.primary-screen-topbar`
- `.catalog-topbar`
- wrappers de shell redundantes

## Fase 4. Patterns de producto

Objetivo:

- consolidar UI repetida del dominio.

Orden recomendado:

1. `StatusBanner`
2. `EmptyState`
3. `LevelMetaTags`
4. `LevelCard`
5. `CampaignStepCard`
6. `SearchToolbar`

## Fase 5. Migración de pantallas simples

Orden recomendado:

1. `MainMenuScreen`
2. `SettingsScreen`
3. `EditorDraftsScreen`
4. `CampaignScreen`
5. `CommunityLevelsScreen`

Razón:

- tienen menor complejidad interactiva;
- permiten validar sistema antes de tocar editor y play.

## Fase 6. Migración de pantallas complejas

Orden recomendado:

1. `PlayerShell`
2. `PlayLevelScreen`
3. `IdePanel`
4. `BoardPanel`
5. `EditorShell`

Razón:

- aquí conviven layout, paneles, editor, board y tooling.

## Fase 7. Refactor de `ui-editor`

Objetivo:

- sacar hardcodes visuales del paquete compartido.

Tareas:

1. mover `Screen`, `Panel`, `TabBar`, `CollapsiblePanel` a CSS variables o clases;
2. extraer board theme;
3. eliminar estilos inline estáticos;
4. revisar export surface del paquete;
5. evaluar si algunas piezas deben quedarse solo en `app`.

## Fase 8. Limpieza final

Objetivo:

- quitar deuda residual.

Tareas:

1. borrar clases CSS obsoletas;
2. borrar imports de CSS viejos no usados;
3. eliminar duplicados de tokens;
4. consolidar docs;
5. actualizar contexto del proyecto con la nueva arquitectura.

## 14. Mapping inicial de legado a sistema nuevo

### Reemplazos prioritarios

- `.menu-link` -> `Button`
- `.back-link` -> `Button` variante `secondary` o `ghost`
- `.mini-tag` -> `Tag`
- `.error-banner` -> `Banner` o `StatusBanner`
- `.topbar` -> `PageHeader`
- `.catalog-topbar` -> `Toolbar`
- `.menu-card` -> `Card`
- `.player-main-panel` -> `Surface` o `PanelFrame`

### Reglas de deprecación

1. no crear nuevos usos de estas clases legacy;
2. cuando una pantalla se toque de forma sustancial, migrarla a primitives nuevas;
3. una vez migradas todas las referencias de una clase, borrar su CSS.

## 15. Reglas duras para futuras implementaciones

Estas reglas deben seguirse siempre.

### 15.1 Prohibiciones

Está prohibido:

1. agregar hex directos en pantallas o feature components;
2. agregar `style={...}` para colores, bordes, radios, sombras o tipografía estática;
3. crear clases globales nuevas para simular componentes;
4. estilizar elementos HTML genéricos globalmente salvo en reset;
5. duplicar un patrón ya existente con otro nombre;
6. agregar variantes visuales sin definir antes si son primitives, layout o pattern;
7. meter branding o color decision fuerte dentro de `ui-editor` sin pasar por tokens.

### 15.2 Excepciones permitidas

Se permite inline style solo para:

- canvas;
- transformaciones geométricas;
- posición dinámica;
- width/height calculadas runtime;
- CSS variables seteadas dinámicamente desde JS.

### 15.3 Reglas de naming

1. primitives usan nombres genéricos: `Button`, `Tag`, `Card`;
2. layouts usan nombres estructurales: `PageHeader`, `SplitPane`, `Toolbar`;
3. patterns usan nombres del dominio: `CampaignStepCard`, `LevelMetaTags`;
4. tokens usan nombres semánticos, no nombres arbitrarios de color.

## 16. Definición de responsabilidades por capa

### `foundations`

Puede decidir:

- escalas;
- variables;
- reset;
- fuentes;
- motion;
- color semantics.

No puede decidir:

- contenido del producto;
- layout concreto de una pantalla;
- copy de una feature.

### `primitives`

Puede decidir:

- interacción base;
- estados visuales base;
- tamaños controlados;
- accesibilidad.

No puede decidir:

- reglas de negocio;
- estructura de una página;
- copy del dominio.

### `layout`

Puede decidir:

- espaciado estructural;
- jerarquía;
- slots;
- distribución.

No puede decidir:

- semántica del dominio;
- contenido específico de campaña o editor.

### `patterns`

Puede decidir:

- composición de primitives para un caso de producto;
- small visual conventions del dominio.

No puede decidir:

- tokens base;
- overrides arbitrarios que ignoren primitives.

## 17. Criterios de aceptación globales

El sistema se considerará logrado cuando:

1. no existan nuevos estilos inline estáticos fuera de casos permitidos;
2. la mayoría de interacciones visibles usen primitives compartidas;
3. `ui-editor` no defina el theme global con hardcodes;
4. no se estilicen `button`, `input`, `select` globalmente;
5. pantallas clave compartan header, banner, card, tags y botones consistentes;
6. colores de estructuras vivan en una sola fuente oficial;
7. sea posible cambiar radios, bordes y palette principal tocando tokens y ver efecto transversal.

## 18. Riesgos y mitigaciones

### Riesgo 1. Big bang fallido

Mitigación:

- migración por fases;
- no reescribir todas las pantallas juntas.

### Riesgo 2. `ui-editor` difícil de desacoplar

Mitigación:

- introducir primero CSS variables;
- luego eliminar inline styles estáticos;
- mover solo lo necesario.

### Riesgo 3. PRs mezclando lógica y UI system

Mitigación:

- separar PRs de foundations/primitives de PRs de feature migration.

### Riesgo 4. regresión visual silenciosa

Mitigación:

- checklist visual por pantalla;
- screenshots de referencia si luego se incorpora esa práctica;
- revisión manual enfocada en spacing, jerarquía y estados.

## 19. Plan de validación

### 19.1 Validación técnica

- `npm run build` en raíz;
- builds individuales de `ui-editor` y `app`;
- revisión de imports huérfanos;
- búsqueda de hex nuevos con `rg "#[0-9a-fA-F]{3,8}"`;
- búsqueda de `style={{` fuera de módulos permitidos.

### 19.2 Validación estructural

- ninguna pantalla nueva consume clases legacy cuando ya existe primitive equivalente;
- `ui-editor` no expone componentes con palette rígida salvo board geometry dinámica;
- tokens usados de manera transversal en al menos dos zonas.

### 19.3 Validación visual

Revisar al menos:

- menú principal;
- campaña;
- comunidad;
- play level;
- drafts;
- settings;
- editor shell.

## 20. Checklist obligatorio para PRs de UI

Toda PR que toque UI debe responder afirmativamente:

1. ¿Reusé primitives existentes antes de crear algo nuevo?
2. ¿Evité hex directos en pantalla o feature?
3. ¿Evité crear nuevas clases globales legacy?
4. ¿La semántica del componente está en la capa correcta?
5. ¿Si agregué una variante, está respaldada por tokens?
6. ¿No introduje estilos inline no permitidos?
7. ¿No dupliqué una primitive o pattern existente?
8. ¿Verifiqué la pantalla en desktop y móvil?
9. ¿La interacción sigue siendo accesible?
10. ¿El cambio mejora la consistencia en lugar de aumentarla fragmentación?

## 21. Guía explícita para futuras sesiones de Codex

Esta sección está escrita como instrucción operativa futura.

### 21.1 Prioridad de trabajo

Si una sesión futura toca UI, debe hacer esto primero:

1. leer este documento;
2. identificar la fase actual de migración;
3. reusar la arquitectura aquí definida;
4. evitar atajos que aumenten deuda visual;
5. si hace falta una excepción, documentarla en el PR o en el commit.

### 21.2 Cómo decidir dónde vive una pieza nueva

Preguntas obligatorias:

1. ¿Es reutilizable entre features?  
   Si sí, probablemente es primitive o layout.

2. ¿Resuelve estructura espacial sin semántica de producto?  
   Si sí, es layout.

3. ¿Representa un caso repetido del dominio?  
   Si sí, es pattern.

4. ¿Solo define color, spacing o tipografía?  
   Entonces no es componente; es foundation.

### 21.3 Qué no hacer en futuras sesiones

No hacer:

- crear otra clase como `.fancy-topbar-v2`;
- agregar botón estilizado ad hoc dentro de una pantalla;
- copiar estilos de una pantalla a otra;
- meter más colores hardcodeados en `ui-editor`;
- resolver inconsistencia con overrides locales rápidos;
- introducir utilidades visuales arbitrarias sin diseño de sistema.

### 21.4 Si hay presión por velocidad

La regla correcta bajo presión es:

1. usar primitive existente;
2. si no existe, crear primitive mínima reusable;
3. solo si el cambio es urgente y acotado, hacer workaround temporal documentado;
4. registrar ese workaround como deuda explícita.

### 21.5 Si se detecta inconsistencia nueva

La respuesta no debe ser “parchar esa pantalla”.

Debe ser:

1. identificar si el problema corresponde a token, primitive, layout o pattern;
2. corregir en esa capa;
3. luego propagar a los consumidores afectados.

## 22. Orden recomendado de implementación real

Orden concreto sugerido:

1. crear `app/src/ui/foundations/`;
2. mover imports globales a la nueva base;
3. introducir `Button`, `Tag`, `Banner`, `Card`;
4. introducir `PageHeader` y `Toolbar`;
5. migrar `MainMenuScreen`, `SettingsScreen`, `EditorDraftsScreen`;
6. migrar `CampaignScreen` y `CommunityLevelsScreen`;
7. introducir `StatusBanner`, `LevelCard`, `CampaignStepCard`;
8. migrar `PlayLevelScreen`, `PlayerShell`, `IdePanel`, `BoardPanel`;
9. refactorizar `ui-editor` para themeability real;
10. migrar `EditorShell`;
11. borrar CSS legacy sobrante;
12. actualizar `project-context.md` con la arquitectura final.

## 23. Definition of done final

La iniciativa completa estará terminada cuando:

1. exista un sistema de tokens y theme documentado y usado;
2. las primitives principales sean la vía normal de desarrollo;
3. las pantallas centrales estén migradas;
4. `ui-editor` sea themeable y no rígido;
5. el CSS legacy residual sea mínimo o eliminado;
6. futuras contribuciones tengan reglas claras para no reintroducir caos.

## 24. Estado inicial sugerido para este repositorio

Dado el estado actual del proyecto, la recomendación es iniciar por:

1. Fase 0;
2. Fase 1;
3. Fase 2 con `Button`, `Tag`, `Banner`, `Card`;
4. Fase 3 con `PageHeader`;
5. migración de `SettingsScreen`, `EditorDraftsScreen`, `CampaignScreen`.

Ese camino da la mejor relación entre impacto visible, reducción de deuda y riesgo controlado.
