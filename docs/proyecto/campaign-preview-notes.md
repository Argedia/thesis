# Vista previa de campaña de tesis

## Qué se hizo
Para poder visualizar la nueva dirección de la campaña sin perder el trabajo anterior:

- el mapa viejo se guardó en `app/public/levels/campaign-worlds.legacy.json`;
- el archivo activo `app/public/levels/campaign-worlds.json` se reemplazó por una vista previa mínima;
- esta vista previa reutiliza niveles existentes como `stand-ins`, solo para validar navegación y presentación.

## Importante
Esto **no** significa que esos niveles ya sean la campaña final de tesis.

Solo significa que:

- la navegación por mundos nueva ya puede verse;
- el mapa puede evaluarse visualmente;
- podemos iterar sobre mundos y nodos antes de construir todos los niveles nuevos reales.

## Stand-ins actuales
- `campaign-w0-l1-first-contact` se usa como primer nivel de onboarding.
- `campaign-w0-l2-step-and-reset` se usa como segundo nivel de onboarding.
- `campaign-03-queue-stack-reverse` se usa como primer nivel visible del mundo de pila.

## Nodos de inicio
- cada mundo ahora tiene un nodo de inicio separado del primer nivel;
- ese nodo existe solo para navegación y animación de entrada/salida;
- no cuenta para progreso ni intenta abrir un nivel.

## Guía visual
- el mapa de campaña ahora puede lanzar una guía visual con `driver.js`;
- se dispara automáticamente la primera vez que el usuario entra a un mundo;
- también puede repetirse manualmente desde el botón flotante con bombilla al lado izquierdo.

## Siguiente paso recomendado
Crear niveles reales para:

- `W1-L1`
- `W1-L2`
- `W2-L1`

y luego reemplazar estos stand-ins uno por uno.
