# Vista previa de campaña de tesis

## Estado actual
La campaña ya no está en modo de vista previa mínima. El mapa activo quedó consolidado en:

- `5` mundos
- `16` niveles reales
- nodos de inicio por mundo
- desbloqueo secuencial
- progreso visible

## Archivo activo
- `app/public/levels/campaign-worlds.json`

## Nota histórica
El archivo legado puede mantenerse como referencia de iteraciones previas:

- `app/public/levels/campaign-worlds.legacy.json`

Pero ya no debe interpretarse como la definición vigente de tesis.

## Estructura activa

1. `W1 · Familiarización con el editor`
2. `W2 · Pila`
3. `W3 · Cola + un poco de pila`
4. `W4 · Lista + funciones sencillas`
5. `W5 · Final boss`

## Nodos de inicio
- cada mundo tiene un nodo de inicio;
- ese nodo no cuenta como nivel;
- sirve para navegación y animación de entrada o cambio de mundo.

## Guías visuales
- el botón flotante `?` sirve para relanzar ayudas contextuales;
- los tutoriales de onboarding de campaña viven en los niveles tempranos, no en el nodo inicial del mundo.

## Siguiente trabajo razonable
- probar dificultad real de `W2-L4`, `W3-L3`, `W4-L3`, `W4-L4` y `W5-L1`;
- refinar mensajes o drivers específicos si algún paso del editor sigue generando fricción.
