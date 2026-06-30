# Gamificación del sistema completo

## Propósito

Este documento describe la gamificación del software como **sistema completo**, no solo como campaña.

La idea central es que la gamificación ocurre en varias capas:

- una capa pedagógica principal, centrada en la campaña;
- una capa de continuidad y participación, centrada en comunidad y editor;
- una capa de onboarding, centrada en ayudas, tutoriales y primeros ejemplos.

Esto evita una lectura demasiado estrecha donde solo la campaña cuenta como gamificación y todo lo demás se trata como infraestructura neutra.

## 1. Tesis general

En este proyecto, la gamificación no depende de puntos, insignias ni rankings.

La motivación del sistema surge de:

- progresión visible;
- resolución de retos;
- restricciones como mecanismo de desafío;
- retroalimentación inmediata;
- desbloqueo gradual;
- continuidad de práctica;
- circulación de contenido creado por usuarios.

Por eso, la gamificación del sistema debe entenderse como un **loop de participación y aprendizaje**, no solo como un mapa de campaña.

## 2. Capas de gamificación

### 2.1 Gamificación pedagógica central

La campaña es la forma más explícita y más defendible de gamificación pedagógica.

Aquí viven:

- progresión por niveles;
- agrupación por mundos;
- desbloqueo secuencial;
- objetivos pedagógicos explícitos;
- restricciones de edición y ejecución como reto;
- retroalimentación inmediata del sistema;
- visibilidad del progreso;
- cierres visuales breves al completar niveles o mundos.

Esta capa es la más importante para tesis porque vincula contenido, secuencia y objetivo de aprendizaje.

## 2.2 Gamificación de participación y continuidad

La comunidad y el editor también participan del modelo de gamificación, pero con una función distinta.

No organizan la progresión pedagógica principal, pero sí sostienen el loop de uso:

1. el usuario aprende en campaña;
2. luego practica en niveles libres;
3. luego crea sus propios niveles;
4. publica ese contenido;
5. recibe señales sociales y de uso;
6. vuelve a practicar, iterar y mejorar.

En esta capa entran:

- niveles de comunidad;
- publicación de niveles;
- consumo de contenido creado por otros;
- likes y dislikes;
- dificultad percibida o emergente según uso y resolución;
- práctica libre sin orden rígido;
- continuidad del uso más allá de la campaña.

Por tanto, editor y comunidad no son simplemente utilidades técnicas: también forman parte del diseño gamificado del ecosistema.

## 2.3 Onboarding y retención suave

Existe una tercera capa más pequeña, pero importante:

- tutoriales por pantalla;
- botón global `?`;
- onboarding guiado en primeros niveles;
- borradores de ejemplo en el editor;
- primera entrada simplificada a la campaña.

Esta capa no define el reto académico principal, pero reduce fricción y mejora permanencia.

Su función es que el usuario entre rápido al loop de juego-aprendizaje sin abandonar por complejidad inicial.

## 3. Cómo entra cada pantalla

### 3.1 Menú principal

El menú principal cumple una función de entrada al loop:

- presenta modos de uso diferenciados;
- sugiere comenzar por campaña;
- puede activar tutorial de primera entrada;
- orienta al usuario hacia una secuencia de apropiación del sistema.

No es gamificación fuerte por sí sola, pero sí puerta de entrada gamificada.

### 3.2 Campaña

La campaña concentra la gamificación pedagógica fuerte:

- mundos;
- niveles;
- representación del usuario en un avatar;
- niveles secuenciales;
- visibilidad de progreso;
- avance automático tras completar niveles;
- cierre visual al terminar mundo;
- paso al siguiente mundo como recompensa estructural.

Aquí el progreso sí tiene significado pedagógico claro.

### 3.3 Pantalla de juego de nivel

La pantalla de nivel materializa el loop micro de desafío:

- comparar estado inicial y objetivo;
- construir solución;
- ejecutar;
- fallar o corregir;
- recibir feedback;
- completar;
- regresar al mapa con progreso actualizado.

Es la unidad mínima repetible de la gamificación.

### 3.4 Comunidad

La comunidad extiende la experiencia:

- permite práctica continua fuera de la secuencia principal;
- introduce exploración libre;
- expone contenido de otros usuarios;
- refuerza motivación por variedad;
- permite valorar contenido mediante likes/dislikes;
- mantiene activo el sistema incluso después de terminar campaña.

Su aporte no es secuenciar contenidos, sino sostener uso y participación.

### 3.5 Editor

El editor también participa del loop gamificado:

- permite pasar de jugador a creador;
- ofrece borradores como punto de entrada;
- deja probar y refinar retos;
- habilita publicación de contenido;
- conecta la producción del usuario con el consumo comunitario.

Este cambio de rol es importante: el usuario ya no solo resuelve, también diseña desafíos.

### 3.6 Ajustes y ayuda

Los ajustes no son gamificación por sí mismos.

Pero el sistema de ayuda sí contribuye al onboarding:

- tutoriales por pantalla;
- repetición bajo demanda con `?`;
- primera activación automática en pantallas nuevas;
- apoyo contextual en niveles tempranos.

## 4. Loop completo del sistema

El loop gamificado completo puede describirse así:

1. entrar al software;
2. recibir orientación inicial;
3. empezar campaña;
4. completar niveles y mundos;
5. practicar más libremente;
6. entrar a comunidad;
7. explorar niveles ajenos;
8. usar el editor;
9. crear y publicar niveles propios;
10. recibir interacción social y volver a iterar.

Este loop combina aprendizaje, práctica, creación y participación.

## 5. Qué sí cuenta como gamificación

En el sistema completo, deben contarse como gamificación:

- campaña por niveles;
- progreso visible;
- desbloqueo de mundos;
- restricciones como reto;
- feedback inmediato;
- tutoriales de onboarding;
- retorno automático al mapa tras completar niveles;
- cierre visual de mundo;
- comunidad como práctica continua;
- editor como transición a rol creador;
- publicación de niveles;
- likes/dislikes;
- dificultad inferida desde comportamiento de uso, cuando aplique.

## 6. Qué no conviene presentar como gamificación principal

Aunque formen parte del producto, no conviene defender como núcleo del modelo:

- almacenamiento local;
- importación/exportación de archivos;
- infraestructura de persistencia;
- renderizado visual del tablero por sí mismo;
- internacionalización;
- ajustes técnicos de UI.

Estas piezas soportan la experiencia, pero no son el mecanismo gamificado central.

## 7. Cómo defenderlo ante tesis o revisión externa

La manera correcta de explicarlo es esta:

- la campaña es la gamificación pedagógica principal;
- comunidad y editor forman una gamificación de continuidad y participación;
- tutoriales y ayudas forman una gamificación de onboarding;
- todo junto compone el modelo gamificado del sistema completo.

Eso permite evitar dos errores:

- decir incorrectamente que solo la campaña es gamificación;
- decir exageradamente que cualquier feature visual o técnica ya es gamificación.

## 8. Relación con los documentos existentes

Este documento complementa, no reemplaza, a:

- [gamification-thesis-scope.md](C:\Users\aguerra\Documents\thesis\.worktrees\gamification\docs\proyecto\gamification-thesis-scope.md)
- [campaign-thesis-level-sequence.md](C:\Users\aguerra\Documents\thesis\.worktrees\gamification\docs\proyecto\campaign-thesis-level-sequence.md)
- [campaign-thesis-implementation-matrix.md](C:\Users\aguerra\Documents\thesis\.worktrees\gamification\docs\proyecto\campaign-thesis-implementation-matrix.md)
- [project-context.md](C:\Users\aguerra\Documents\thesis\.worktrees\gamification\docs\proyecto\project-context.md)

La diferencia es que esos documentos explican principalmente campaña, arquitectura o alcance de tesis; este archivo documenta la lectura sistémica de la gamificación.
