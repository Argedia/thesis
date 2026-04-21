# Documento de Pruebas Funcionales
## Plataforma Visual de Algoritmos y Estructuras de Datos

**Versión:** 1.0  
**Fecha:** 21 de abril de 2026  
**Tipo de documento:** Plan + especificación de casos funcionales (anexo de tesis)

---

## Resumen (formato tesis)

El presente documento define las pruebas funcionales del sistema, organizadas por pantalla y por nivel de profundidad (básico, combinatorio y avanzado). El objetivo es verificar que la aplicación cumpla el comportamiento esperado desde la perspectiva del usuario final, con trazabilidad explícita entre interacción, entrada y resultado observable.

## Palabras clave

Pruebas funcionales, pruebas de interfaz, pruebas combinatorias, validación de comportamiento, QA, tesis.

---

## 1. Objetivo

Establecer un conjunto detallado de pruebas funcionales para todas las pantallas de la aplicación, priorizando mayor volumen y profundidad en las pantallas con mayor complejidad operativa:

1. `CommunityLevelsScreen` (catálogo, filtros, importación y preview).
2. `PlayLevelScreen` (editor visual, ejecución, depuración, salida y tablero).

Además, cubrir pantallas de menor complejidad (`MainMenu`, `Campaign`, `EditorShell`, `AppShell`) con casos básicos y de regresión.

---

## 2. Alcance

## 2.1. Incluido

- Navegación por rutas de la app.
- Interacciones de UI y resultados visibles.
- Validaciones funcionales de importación, filtros, ejecución y estado.
- Mensajes de estado/diagnóstico visibles al usuario.
- Persistencia funcional de progreso/preferencias a nivel usuario.

## 2.2. Excluido

- Pruebas de rendimiento con métricas de infraestructura.
- Pruebas de seguridad ofensiva (pentest).
- Verificación interna de implementación (unit tests de bajo nivel).
- Evaluación formal de usabilidad con usuarios reales (estudio UX).

---

## 3. Entorno de prueba sugerido

- Navegador: Chrome/Edge actualizado.
- Resoluciones objetivo:
  - Desktop: `1920x1080`, `1366x768`.
  - Laptop escalada/zoom: `80%`, `100%`, `125%`.
- Idiomas: `es` y `en`.
- Repositorio en branch de evaluación.
- Datos de referencia:
  - niveles bundle (`app/public/levels/*.json`),
  - nivel `mixed-playground`.

---

## 4. Datos de prueba

## 4.1. Niveles JSON para importación

1. **JSON válido mínimo** con `id` nuevo y estructuras básicas.
2. **JSON inválido estructuralmente** (sin `constraints` o con tipos incorrectos).
3. **JSON con id existente** para validar reemplazo/actualización en niveles importados.
4. **JSON malformado** (error de parseo).

## 4.2. Programas de editor

1. Programa vacío.
2. Programa simple ejecutable (declaración + operación válida).
3. Programa con error semántico tipado (asignación incompatible).
4. Programa con breakpoints en líneas ejecutables.
5. Programa con rutinas, `for_each` y `break`.

---

## 5. Estrategia de cobertura

La suite se divide en tres niveles:

1. **Pruebas básicas:** flujo nominal por pantalla.
2. **Pruebas combinatorias:** combinaciones de estados/controles críticos.
3. **Pruebas avanzadas:** límites, secuencias rápidas, errores y regresión cruzada.

---

## 6. Inventario de pantallas y prioridad

| Pantalla | Ruta | Complejidad | Prioridad de prueba |
|---|---|---|---|
| AppShell (dock idioma global) | wrapper | Media | Alta |
| MainMenuScreen | `/` | Baja | Media |
| CommunityLevelsScreen | `/play` | Alta | Muy Alta |
| PlayLevelScreen | `/play/:levelId` | Muy Alta | Crítica |
| CampaignScreen | `/campaign` | Baja | Baja |
| EditorShell | `/editor` | Media | Alta |
| Fallback de rutas | `*` | Baja | Media |

---

## 7. Casos por pantalla

## 7.1. AppShell (idioma global)

**Descripción funcional:** provee selector ES/EN persistente y disponible en toda la app.

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| APP-001 | Básica | App abierta | Click en botón `ES` | UI cambia a español; `document.lang` en `es`; textos traducidos |
| APP-002 | Básica | App en español | Click en botón `EN` | UI cambia a inglés; `document.lang` en `en` |
| APP-003 | Combinatoria | Cambiar a EN | Navegar `/`, `/play`, `/play/:id`, `/editor` | Idioma se mantiene en todas las pantallas |
| APP-004 | Avanzada | Idioma cambiado a ES | Recargar página | Idioma persiste desde localStorage |
| APP-005 | Avanzada | Interacción rápida | Alternar ES/EN 10 veces | No crashea; estado final coincide con último click |

---

## 7.2. MainMenuScreen

**Descripción funcional:** entrada principal con navegación a campaña, comunidad y editor.

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| MM-001 | Básica | Cargar `/` | Ver pantalla | Se muestra título y 3 enlaces (`campaign`, `community`, `editor`) |
| MM-002 | Básica | En menú | Click `Campaign` | Navega a `/campaign` |
| MM-003 | Básica | En menú | Click `Community Levels` | Navega a `/play` |
| MM-004 | Básica | En menú | Click `Level Editor` | Navega a `/editor` |
| MM-005 | Combinatoria | Idioma EN/ES | Cambiar idioma y revisar menú | Labels se traducen correctamente |
| MM-006 | Avanzada | Navegación repetida | Entrar/salir de cada ruta 5 veces | Sin errores de navegación ni estados corruptos |

---

## 7.3. CommunityLevelsScreen (`/play`)

**Descripción funcional:** catálogo de niveles con búsqueda, filtros, ordenamiento, importación y preview compacto con acordeones.

### 7.3.1. Pruebas básicas

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| CL-001 | Básica | Cargar `/play` | Esperar carga | Lista de niveles visible; un nivel seleccionado por defecto |
| CL-002 | Básica | Niveles cargados | Escribir texto de búsqueda válido | Grid filtra por título/autor/descripción |
| CL-003 | Básica | Con niveles visibles | Limpiar búsqueda | Grid vuelve a lista completa |
| CL-004 | Básica | Con niveles | Cambiar `Sort` a `difficulty` | Ordena por dificultad (easy→medium→hard) |
| CL-005 | Básica | Con niveles | Cambiar `Sort` a `title` | Orden alfabético por título |
| CL-006 | Básica | Con niveles | Seleccionar tarjeta distinta | Preview refleja nivel seleccionado |
| CL-007 | Básica | Preview visible | Click `Show Initial State` | Se despliega estado inicial |
| CL-008 | Básica | Initial abierto | Click `Hide Initial State` | Se colapsa estado inicial |
| CL-009 | Básica | Preview visible | Click `Show Goal State` | Se despliega estado objetivo |
| CL-010 | Básica | Preview visible | Click `Show Constraints` | Se muestran operaciones permitidas |
| CL-011 | Básica | Preview visible | Click `Play` | Navega a `/play/:levelId` |

### 7.3.2. Pruebas de filtros

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| CL-020 | Básica | Catálogo cargado | Source=`community` | Solo niveles community |
| CL-021 | Básica | Catálogo cargado | Source=`my-levels` | Solo niveles importados |
| CL-022 | Básica | Catálogo cargado | Estructura=`stack` | Solo niveles que usan stack |
| CL-023 | Básica | Catálogo cargado | Estructuras=`stack+queue` | Solo niveles que contienen ambas |
| CL-024 | Básica | Catálogo cargado | Difficulty=`easy` | Solo easy |
| CL-025 | Básica | Catálogo cargado | Completion=`completed` | Solo completados |
| CL-026 | Básica | Catálogo cargado | Completion=`not-completed` | Solo no completados |
| CL-027 | Combinatoria | Catálogo cargado | Source + estructura + difficulty + completion | Intersección correcta de filtros |
| CL-028 | Combinatoria | Filtros activos | Cambiar búsqueda textual | Se mantiene lógica de intersección |
| CL-029 | Avanzada | Filtros que vacían grid | Revisar estado sin resultados | Muestra panel `No levels found` |

### 7.3.3. Pruebas de importación

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| CL-040 | Básica | En catálogo | Importar JSON válido | Nivel se agrega; source pasa a `my-levels`; queda seleccionado |
| CL-041 | Básica | En catálogo | Importar JSON inválido por schema | Muestra error legible |
| CL-042 | Básica | En catálogo | Importar JSON malformado | Muestra error de parseo |
| CL-043 | Combinatoria | Nivel importado | Buscar por título importado | Aparece en grid y preview |
| CL-044 | Combinatoria | Importado con id existente | Importar nueva versión del mismo id | Reemplaza/actualiza entrada importada |
| CL-045 | Avanzada | Varias importaciones | Importar 10 archivos válidos secuencialmente | Sin bloqueo; grid y filtros siguen funcionando |

### 7.3.4. Pruebas de estado del preview

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| CL-050 | Básica | Preview abierto | Cambiar nivel seleccionado | Acordeones vuelven colapsados |
| CL-051 | Combinatoria | Acordeón abierto | Cambiar filtros y selección automática | Estado de acordeones se resetea |
| CL-052 | Avanzada | Rápida alternancia de niveles | Click rápido en varias tarjetas | Preview consistente con última selección |

---

## 7.4. PlayLevelScreen (`/play/:levelId`)

**Descripción funcional:** pantalla central del producto. Integra editor por bloques, ejecución, depuración, tablero visual y salida diagnóstica/runtime.

### 7.4.1. Carga y estado inicial

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-001 | Básica | Navegar a nivel válido | Abrir `/play/mixed-playground` | Carga nivel; editor y tablero visibles |
| PL-002 | Básica | Cargando nivel | Esperar pantalla de carga | Muestra estado `Loading level` y luego contenido |
| PL-003 | Básica | Nivel cargado | Ver panel board | Muestra estructuras iniciales A/B/C |
| PL-004 | Combinatoria | Nivel cargado | Cambiar idioma ES/EN | Header, botones, hints y labels traducidos |
| PL-005 | Avanzada | Ruta inválida | Abrir `/play/id-inexistente` | Mensaje de error manejado (sin crash) |

### 7.4.2. Gestión de rutinas (tabs)

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-010 | Básica | Editor activo | Click `+` en tabs | Solicita nombre y crea rutina |
| PL-011 | Básica | Rutina existente | Click en otra rutina | Activa rutina seleccionada |
| PL-012 | Básica | Rutina activa | Doble click en tab | Dialog de rename; nombre actualizado |
| PL-013 | Combinatoria | RunState=running | Intentar cambiar rutina | Acción bloqueada o no aplicada según diseño |
| PL-014 | Avanzada | Muchas rutinas | Scroll horizontal con rueda sobre tabs | Navega tabs sin desplazar toda la página |

### 7.4.3. Editor por bloques

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-020 | Básica | Programa vacío | Arrastrar bloque desde paleta al canvas | Bloque se inserta correctamente |
| PL-021 | Básica | Bloques insertados | Reordenar por drag | Se actualiza posición respetando reglas |
| PL-022 | Básica | Bloque con slot | Soltar valor compatible en slot | Slot queda asignado |
| PL-023 | Básica | Bloque con wheel | Click en flecha `>` | Se abre menú contextual de operaciones/modos |
| PL-024 | Combinatoria | Bloques anidados | Insertar en then/else/body loop | Estructura semántica correcta |
| PL-025 | Combinatoria | Declaración de variable | Abrir dialog de declaración (tipo+nombre) | Crea variable tipada |
| PL-026 | Avanzada | Durante edición | Cambiar variable referenciada en assign/reference | Se retargetea variable correctamente |
| PL-027 | Avanzada | Stress UI | 30 operaciones drag/drop secuenciales | Sin freeze ni corrupción visible del editor |

### 7.4.4. Ejecución y control

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-030 | Básica | Programa válido | Click `Play` | Ejecuta hasta fin o breakpoint |
| PL-031 | Básica | Programa válido | Click `Step` | Ejecuta una unidad visible |
| PL-032 | Básica | En ejecución | Click `Pause` | runState cambia a paused |
| PL-033 | Básica | Estado avanzado | Click `Reset` | Vuelve a estado inicial de nivel/programa runtime |
| PL-034 | Básica | Programa con bloques | Click `Clear` | Limpia documento y recompila vacío |
| PL-035 | Combinatoria | Breakpoint en nodo ejecutable | `Play` | Pausa al breakpoint con status adecuado |
| PL-036 | Combinatoria | Varios breakpoints | `Play` y luego `Step` | Respeta orden de ejecución y pausas |
| PL-037 | Avanzada | Run/Pause rápidos | Alternar Play/Pause repetidamente | Sin estado inconsistente |

### 7.4.5. Consola de salida (runtime/diagnósticos)

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-040 | Básica | Programa válido sin eventos aún | Ejecutar `Play` | Output visible en modo runtime |
| PL-041 | Básica | Programa inválido semánticamente | `Play` | Output visible en modo diagnostics |
| PL-042 | Básica | Diagnostics visibles | Editar cualquier bloque | Output se oculta (`hidden`) |
| PL-043 | Combinatoria | Diagnostics + traducir idioma | Cambiar ES/EN | Mensajes diagnósticos traducidos |
| PL-044 | Avanzada | Multiples diagnósticos | Revisar listado | Muestra subset esperado (hasta límite visual) |

### 7.4.6. Diálogos de entrada

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-050 | Básica | Acción requiere texto | Ingresar valor válido y guardar | Aplica cambio |
| PL-051 | Básica | Acción requiere texto | Guardar vacío | Muestra error de validación |
| PL-052 | Básica | Selector requerido | Elegir opción y guardar | Selección aplicada |
| PL-053 | Básica | Dialog declaración | Elegir tipo + nombre | Crea declaración con ambos valores |
| PL-054 | Combinatoria | Dialog abierto | Click `Cancel` | No aplica cambios |
| PL-055 | Avanzada | Dialog abierto | Cerrar modal por dismiss | Resuelve sin aplicar cambios |

### 7.4.7. Panel de información de nivel

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-060 | Básica | Nivel cargado | Click botón info (`i`) | Abre popover con detalles |
| PL-061 | Básica | Popover abierto | Mantener `Preview Result` (pointer down) | Tablero muestra temporalmente `goalState` |
| PL-062 | Básica | Soltar botón preview | Pointer up/leave | Tablero vuelve a estado runtime |
| PL-063 | Combinatoria | Cambiar idioma | Abrir popover | Textos y labels traducidos |
| PL-064 | Avanzada | Aperturas repetidas | Abrir/cerrar 20 veces | Sin fuga de estado ni bloqueo UI |

### 7.4.8. Resize de paneles y layout

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-070 | Básica | Desktop ancho | Arrastrar divider horizontal | Ajusta ancho entre consola y board |
| PL-071 | Básica | Desktop ancho | Llevar divider a extremos | Respeta límites mínimos/máximos |
| PL-072 | Combinatoria | Cambiar viewport | Resize ventana navegador | Recalcula ancho ideal sin romper layout |
| PL-073 | Avanzada | Mobile/compact | Ver layout <=640px | Oculta divider y mantiene funcionalidad |

### 7.4.9. Estado de tablero y variables

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-080 | Básica | Ejecución con eventos | Observar board | Estructuras reflejan cambios de operación |
| PL-081 | Básica | Variables en runtime | Revisar tarjetas de variables | Se muestran nombre/valor/tipo/scope |
| PL-082 | Combinatoria | Variable pointer válida | Revisar board | Se muestra enlace visual a target |
| PL-083 | Avanzada | Objetos tipados con campos | Ejecutar asignaciones de campo | Se reflejan cambios en card de objeto |

### 7.4.10. Casos negativos críticos

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| PL-090 | Avanzada | Programa vacío | Click Play | Status indica que falta al menos un bloque |
| PL-091 | Avanzada | Assign incompatible tipo | Click Play | Se bloquea ejecución y sale diagnóstico tipo |
| PL-092 | Avanzada | Break fuera de loop | Compilar/Ejecutar | Diagnóstico semántico, no ejecución incorrecta |
| PL-093 | Avanzada | For-each sin fuente | Compilar/Ejecutar | Diagnóstico correspondiente |

---

## 7.5. EditorShell (`/editor`)

**Descripción funcional:** shell de edición avanzada con paneles configurables y tabs.

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| ES-001 | Básica | Abrir `/editor` | Esperar carga | Carga nivel base y layout inicial |
| ES-002 | Básica | Editor cargado | Cambiar tab principal (`canvas/preview/timeline`) | Contenido central cambia según tab |
| ES-003 | Básica | Tool buttons disponibles | Click `Palette/Inspector/Timeline` | Cambian paneles correspondientes |
| ES-004 | Combinatoria | Cambios de layout | Recargar página | Preferencias de layout persisten |
| ES-005 | Avanzada | Cambios múltiples | Alterar todos los paneles y tabs | Estado consistente, sin panel huérfano |

---

## 7.6. CampaignScreen (`/campaign`)

**Descripción funcional:** stub de campaña con lectura opcional de query param `level`.

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| CA-001 | Básica | Abrir `/campaign` | Ver pantalla | Muestra header y panel de campaña |
| CA-002 | Básica | Abrir `/campaign?level=mixed-playground` | Ver contenido | Muestra `Selected level: mixed-playground` |
| CA-003 | Avanzada | Query vacía/extraña | `/campaign?level=` o caracteres especiales | No crashea; render estable |

---

## 7.7. Ruteo fallback

| ID | Tipo | Precondición | Input / Acción | Resultado esperado |
|---|---|---|---|---|
| RT-001 | Básica | App en ejecución | Abrir hash/ruta no definida | Redirige a `/` |
| RT-002 | Avanzada | Navegación inválida tras idioma/cambios | Forzar ruta inválida | Redirección consistente sin perder estabilidad |

---

## 8. Matriz combinatoria priorizada

## 8.1. Combinaciones críticas en catálogo (`/play`)

| Combo ID | Source | Structures | Difficulty | Completion | Sort | Resultado esperado |
|---|---|---|---|---|---|---|
| CMB-CL-01 | all | none | none | all | newest | lista general visible |
| CMB-CL-02 | community | stack | easy | all | title | subconjunto correcto |
| CMB-CL-03 | my-levels | queue+list | medium | not-completed | difficulty | intersección correcta |
| CMB-CL-04 | all | stack+queue+list | hard | completed | newest | puede quedar vacío; mostrar `No levels found` |
| CMB-CL-05 | my-levels | none | none | all | title | solo importados ordenados por nombre |

## 8.2. Combinaciones críticas en PlayLevel

| Combo ID | Documento | Breakpoints | Acción | Output esperado |
|---|---|---|---|---|
| CMB-PL-01 | válido | ninguno | Play | runtime + eventos |
| CMB-PL-02 | válido | uno en línea 1 | Play | pausa en breakpoint |
| CMB-PL-03 | válido | varios | Play + Step | pausas secuenciales correctas |
| CMB-PL-04 | inválido (tipado) | cualquiera | Play | diagnostics, sin ejecución |
| CMB-PL-05 | vacío | ninguno | Play | status de bloque faltante |
| CMB-PL-06 | válido | ninguno | Step repetido | avance determinista hasta fin |

## 8.3. Combinaciones de idioma

| Combo ID | Pantalla | Idioma inicial | Acción | Resultado esperado |
|---|---|---|---|---|
| CMB-LANG-01 | `/` | EN | Cambiar a ES | menú en ES |
| CMB-LANG-02 | `/play` | ES | Cambiar a EN | filtros/preview en EN |
| CMB-LANG-03 | `/play/:id` | EN | Cambiar a ES en medio de edición | labels + mensajes actualizados sin perder documento |
| CMB-LANG-04 | `/editor` | ES | Recargar | idioma persiste |

---

## 9. Pruebas avanzadas (robustez y regresión)

## 9.1. Secuencias rápidas

| ID | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| ADV-001 | Stress de controles run | Play → Pause → Step → Play → Reset (x10) | Sin deadlock; runState coherente |
| ADV-002 | Stress drag/drop | insertar/mover/eliminar bloques continuamente | Documento válido o con diagnóstico, nunca estado corrupto |
| ADV-003 | Cambio de idioma en caliente | alternar ES/EN durante ejecución | UI no se rompe; textos actualizados |

## 9.2. Persistencia

| ID | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| ADV-010 | Progreso de nivel | Resolver nivel, volver al catálogo | Nivel marcado completed |
| ADV-011 | Preferencias UI | Cambiar paneles/tabs en editor | Persisten tras recarga |
| ADV-012 | Importados persistentes | Importar niveles, recargar app | Niveles importados se conservan |

## 9.3. Errores y tolerancia

| ID | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| ADV-020 | JSON importado inválido | Importar archivo sin campos obligatorios | Error claro, app estable |
| ADV-021 | Diagnóstico semántico múltiple | Construir programa con varios errores | Lista diagnóstica sin crash |
| ADV-022 | Ruta inválida | Navegar a hash inexistente | Redirección controlada |

---

## 10. Criterios de aceptación global

Se considera aprobado el ciclo funcional cuando:

1. 100% de casos básicos pasan.
2. Al menos 90% de combinatorios pasan sin defectos críticos.
3. 100% de casos avanzados críticos (`ADV-001`, `ADV-010`, `ADV-020`, `PL-091`) pasan.
4. No existen bloqueantes en:
- navegación,
- ejecución,
- importación,
- persistencia,
- cambio de idioma.

---

## 11. Defectos: clasificación sugerida

- **Crítico:** impide ejecutar o navegar flujo principal.
- **Alto:** resultado funcional incorrecto sin bloqueo total.
- **Medio:** inconsistencia parcial, workaround disponible.
- **Bajo:** issue visual o texto sin impacto funcional directo.

Campos mínimos de reporte:
- ID de caso,
- build/commit,
- pasos exactos,
- resultado obtenido,
- resultado esperado,
- evidencia (captura/video/log).

---

## 12. Plan de ejecución recomendado

1. Smoke inicial (MainMenu + Community + Play carga).
2. Suite básica completa por pantalla.
3. Matriz combinatoria de catálogo y play.
4. Suite avanzada y regresión final.
5. Repetir en ES y EN.

Orden sugerido por riesgo:
1. `PlayLevelScreen`.
2. `CommunityLevelsScreen`.
3. `EditorShell`.
4. `AppShell` idioma.
5. `MainMenu` y `Campaign`.

---

## 13. Trazabilidad resumida (pantalla vs volumen)

| Pantalla | # Casos definidos |
|---|---|
| AppShell | 5 |
| MainMenuScreen | 6 |
| CommunityLevelsScreen | 23 |
| PlayLevelScreen | 34 |
| EditorShell | 5 |
| CampaignScreen | 3 |
| Routing fallback | 2 |
| Avanzadas transversales | 9 |
| **Total** | **87** |

---

## 14. Conclusión

Este documento entrega una cobertura funcional amplia y estructurada para la plataforma, con énfasis en las pantallas de mayor complejidad operativa. La distribución de casos permite validar:

1. funcionalidad base,
2. consistencia ante combinaciones reales de uso,
3. robustez frente a errores, secuencias rápidas y persistencia.

Como anexo de tesis, esta suite aporta evidencia reproducible de validación funcional y proporciona una base directa para ciclos de regresión durante futuras iteraciones del proyecto.
