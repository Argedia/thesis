# Evaluación del Grado de Correspondencia entre el Prototipo Desarrollado y el Sílabo del Curso “Algoritmos y Estructura de Datos (INF261)”, con Énfasis en Estructuras de Datos Lineales

Fecha: 6 de abril de 2026

## 1. Introducción
El presente documento tiene por finalidad evaluar, con criterio académico, el grado de correspondencia entre el prototipo de software desarrollado en el marco de este proyecto de tesis y el sílabo del curso **Algoritmos y Estructura de Datos (INF261)**. La comparación se realiza a partir del programa analítico, los objetivos formativos y la descripción general del curso proporcionados por el usuario.

No obstante, esta evaluación incorpora una restricción metodológica explícita: **el análisis se limita a la cobertura de estructuras de datos lineales**, en concordancia con el alcance actual del prototipo. En consecuencia, los contenidos del sílabo relativos a búsqueda y ordenamiento avanzado, recursión, árboles y grafos no son considerados como déficits centrales del sistema, sino como componentes que se encuentran fuera del alcance funcional que se desea evaluar en esta etapa del proyecto.

Desde esta perspectiva, el documento busca responder a la siguiente pregunta: **¿en qué medida el prototipo actual constituye una herramienta pertinente para apoyar la enseñanza y experimentación de estructuras de datos lineales y sus operaciones fundamentales, conforme al sílabo del curso INF261?**

## 2. Objetivo de la evaluación
El objetivo de esta evaluación es determinar en qué medida el prototipo actual:

- contribuye al tratamiento de los contenidos del curso relacionados con estructuras de datos lineales;
- permite representar, manipular y observar operaciones sobre dichas estructuras;
- favorece el razonamiento algorítmico mediante construcción visual de programas, ejecución paso a paso y depuración;
- presenta limitaciones relevantes frente a los contenidos curriculares del curso, aun dentro del recorte temático adoptado.

## 3. Alcance de la comparación
Para efectos de esta evaluación, se consideran como contenidos **dentro del alcance** los temas del sílabo más directamente vinculados con estructuras lineales y con la formulación básica de algoritmos sobre ellas. En particular, se incluyen:

- **Capítulo 1**: introducción general, noción de algoritmo, datos y estructuras de datos;
- **Capítulo 4**: listas ligadas, pilas y colas;
- componentes transversales del curso vinculados a procesos **secuenciales, repetitivos y condicionales**, en la medida en que apoyan el trabajo sobre estructuras lineales.

Se consideran **fuera del alcance principal** de esta evaluación:

- **Capítulo 2**: búsqueda y ordenamiento, salvo como referencia contextual;
- **Capítulo 3**: algoritmos recursivos;
- **Capítulo 5**: árboles;
- **Capítulo 6**: grafos.

Esta delimitación no elimina la relevancia académica de dichos temas, pero evita evaluar negativamente al prototipo por no cubrir áreas que, por decisión de diseño, no constituyen todavía su objetivo inmediato.

## 4. Metodología de análisis
La evaluación se realizó mediante revisión cualitativa del estado actual del repositorio, tomando como evidencia directa las funcionalidades implementadas y los módulos principales del sistema. Entre las fuentes revisadas destacan:

- motor de estructuras y ejecución: [core-engine/src/index.ts](/abs/path/c:/Users/aguerra/Documents/thesis/core-engine/src/index.ts);
- modelo semántico del editor visual: [app/src/features/program-editor-core/types.ts](/abs/path/c:/Users/aguerra/Documents/thesis/app/src/features/program-editor-core/types.ts);
- compilación del programa visual: [app/src/features/program-editor-core/compiler.ts](/abs/path/c:/Users/aguerra/Documents/thesis/app/src/features/program-editor-core/compiler.ts);
- exportación a pseudocódigo: [app/src/features/program-editor-core/pseudocode.ts](/abs/path/c:/Users/aguerra/Documents/thesis/app/src/features/program-editor-core/pseudocode.ts);
- sesión de ejecución y depuración: [app/src/features/play-session/controller.ts](/abs/path/c:/Users/aguerra/Documents/thesis/app/src/features/play-session/controller.ts);
- visualización de estructuras: [ui-editor/src/index.tsx](/abs/path/c:/Users/aguerra/Documents/thesis/ui-editor/src/index.tsx);
- nivel de prueba con estructuras lineales: [app/public/levels/mixed-playground.json](/abs/path/c:/Users/aguerra/Documents/thesis/app/public/levels/mixed-playground.json).

La valoración empleada distingue tres niveles:

- **alta**, cuando el sistema cubre de forma explícita y operativa el contenido evaluado;
- **media o parcial**, cuando existe una cobertura funcional relevante, aunque incompleta;
- **baja**, cuando la relación con el contenido curricular es indirecta o insuficiente.

## 5. Descripción sintética del prototipo
El prototipo corresponde a un entorno visual para la construcción y ejecución de programas orientados a la manipulación de estructuras de datos. El usuario puede arrastrar bloques, configurar operaciones, componer expresiones, declarar y utilizar variables, y controlar el flujo de ejecución mediante condicionales.

En su estado actual, el sistema implementa explícitamente tres estructuras lineales:

- **pila** (`stack`);
- **cola** (`queue`);
- **lista** (`list`).

Asimismo, incorpora:

- operaciones específicas por estructura;
- ejecución paso a paso;
- puntos de interrupción;
- valores primitivos como cadenas, números y booleanos;
- exportación a pseudocódigo;
- representación visual del estado de las estructuras durante la ejecución.

En consecuencia, el sistema ya puede ser entendido como un entorno experimental funcional para el trabajo con estructuras lineales y algoritmos elementales construidos sobre ellas.

## 6. Análisis de correspondencia con el sílabo

### 6.1. Correspondencia con la descripción general del curso
El sílabo señala que el curso presenta los conceptos principales para el planteamiento de algoritmos usando el computador, permitiendo manipular estructuras de datos complejas mediante procesos secuenciales, repetitivos y condicionales.

En este punto, la correspondencia del prototipo es **media-alta**, debido a que el sistema ya permite:

- construir secuencias de acciones sobre estructuras de datos;
- utilizar condicionales mediante bloques `if`;
- operar con variables y expresiones;
- ejecutar el programa paso a paso;
- observar visualmente el efecto de cada instrucción.

La principal limitación es que el soporte para repetición todavía no constituye una funcionalidad consolidada del entorno en el mismo grado que la secuencialidad y la condicionalidad. Por ello, aun siendo favorable, la correspondencia no puede considerarse plena.

### 6.2. Correspondencia con los objetivos del curso

#### 6.2.1. Planteamiento de esquemas lógicos mediante algoritmos
La correspondencia es **media**. El prototipo permite construir algoritmos visuales a partir de bloques, estructurarlos en secuencias y condicionales, y expresar ciertas relaciones entre variables y estructuras. Esta capacidad es consistente con el objetivo de formular esquemas lógicos.

Sin embargo, el sílabo enfatiza también métodos de búsqueda y ordenamiento, y ese componente no constituye aún una parte desarrollada del sistema. En consecuencia, la alineación es pertinente, pero parcial.

#### 6.2.2. Organización de datos en estructuras tipo puntero, listas dinámicas simples, listas dobles y listas ortogonales, así como árboles binarios
Considerando el recorte adoptado hacia estructuras lineales, la correspondencia es **media**. El sistema ya cubre operativamente:

- listas;
- pilas;
- colas.

Esto constituye un avance significativo dentro del campo de las estructuras lineales. No obstante, el sílabo menciona de forma más específica:

- punteros como concepto explícito;
- listas simplemente enlazadas;
- listas doblemente enlazadas;
- listas ortogonales.

En el prototipo actual, la estructura `list` funciona como una abstracción operacional útil, pero no distingue todavía variantes de listas ligadas ni presenta la representación de punteros como objeto didáctico explícito. Por ello, existe afinidad conceptual, aunque no cobertura total.

#### 6.2.3. Aplicabilidad de algoritmos según requerimientos de uso de datos
La correspondencia es **media**. El sistema permite experimentar con operaciones distintas dependiendo de la estructura seleccionada, lo que favorece la comprensión de que no todas las estructuras ni todas las operaciones responden de igual manera a un problema determinado.

La principal fortaleza en este punto es que el estudiante puede observar que:

- una pila privilegia acceso por un extremo;
- una cola respeta un orden de atención;
- una lista admite operaciones más variadas en términos de inserción, eliminación y acceso.

Sin embargo, el sistema todavía no ofrece actividades comparativas suficientemente desarrolladas para justificar formalmente la elección de una estructura frente a otra en función de complejidad, eficiencia o restricciones del problema.

### 6.3. Correspondencia con el Capítulo 1 del programa analítico

#### 6.3.1. Introducción y objetivos del curso
La correspondencia es **baja**. El prototipo no incorpora un módulo expositivo destinado a presentar formalmente objetivos, terminología o bibliografía del curso. Puede utilizarse como recurso didáctico dentro del desarrollo del curso, pero no materializa por sí mismo esta parte introductoria.

#### 6.3.2. Terminología básica, algoritmos, datos y estructuras de datos
La correspondencia es **media**. El sistema permite trabajar de manera operativa con conceptos de algoritmo, dato y estructura de datos, ya que obliga al usuario a construir secuencias de instrucciones y a operar sobre estructuras diferenciadas. Aunque el tratamiento es más práctico que teórico, sí existe una relación formativa clara con este contenido.

### 6.4. Correspondencia con el Capítulo 4: Listas ligadas, pilas y colas
Este es el capítulo con **mayor grado de correspondencia** dentro del alcance evaluado.

#### 6.4.1. Pilas
La correspondencia es **alta**. El sistema implementa pilas y permite operaciones equivalentes a apilar y desapilar, así como observar el efecto de dichas operaciones sobre el estado de la estructura.

#### 6.4.2. Colas
La correspondencia es **alta**. El sistema implementa colas y permite representar operaciones equivalentes a formación y atención de cola, junto con una visualización explícita de la estructura durante la ejecución.

#### 6.4.3. Listas
La correspondencia es **media**. El sistema ya incluye una estructura `list` con operaciones propias, lo cual constituye un avance relevante. Sin embargo, la cobertura todavía no es equivalente a la amplitud curricular sugerida por el sílabo para listas ligadas.

En particular, aún no se distingue de manera formal entre:

- listas simplemente enlazadas;
- listas doblemente enlazadas;
- listas circulares;
- listas ortogonales.

Tampoco se observa todavía una representación explícita del nodo y el puntero como objeto de enseñanza. Por ello, si bien la dirección de desarrollo es correcta, la cobertura debe considerarse parcial.

#### 6.4.4. Aplicaciones
La correspondencia es **parcial**. Los niveles y el entorno visual permiten ensayar pequeñas tareas sobre estructuras lineales, lo cual constituye una forma inicial de aplicación. No obstante, todavía falta una colección más amplia de problemas o casos de uso representativos para sostener una cobertura sólida de esta parte del sílabo.

## 7. Síntesis de hallazgos
El análisis efectuado permite sostener que, cuando la comparación se restringe a estructuras de datos lineales, el prototipo presenta una correspondencia significativamente más favorable con el sílabo del curso INF261 que la que se obtendría en una comparación global no acotada.

Las principales fortalezas observadas son:

- implementación funcional de pila, cola y lista;
- entorno visual programable para manipular estructuras lineales;
- ejecución paso a paso y depuración;
- uso de variables, valores y condicionales;
- exportación del programa a pseudocódigo.

Las principales limitaciones son:

- ausencia de una formalización explícita del concepto de puntero;
- falta de diferenciación entre variantes de listas ligadas;
- cobertura aún limitada de aplicaciones comparativas;
- ausencia de soporte directo para búsqueda, ordenamiento y estructuras no lineales, aunque estas últimas se encuentran fuera del alcance principal de esta evaluación.

## 8. Estimación del grado de cumplimiento dentro del alcance adoptado
Considerando exclusivamente la cobertura de contenidos asociados a estructuras de datos lineales, se propone la siguiente estimación razonada:

- **Descripción general y objetivos del curso, en lo pertinente a algoritmos sobre estructuras lineales: 50% a 65%**
- **Capítulo 1, en lo relativo a conceptos básicos de algoritmos, datos y estructuras de datos: 40% a 55%**
- **Capítulo 4, en lo relativo a listas, pilas y colas: 60% a 75%**
- **Cumplimiento global estimado del sílabo dentro del alcance restringido a estructuras lineales: 55% a 70%**

Estas cifras son aproximadas y deben ser entendidas como un juicio académico orientativo, útil para ubicar el estado del proyecto dentro de una trayectoria de desarrollo, no como una medición cuantitativa exacta.

## 9. Conclusiones
De acuerdo con la evidencia revisada, el prototipo actual constituye una herramienta pertinente y académicamente justificable para apoyar el aprendizaje de estructuras de datos lineales dentro del marco del curso **Algoritmos y Estructura de Datos (INF261)**.

Su principal fortaleza radica en que ya permite construir y ejecutar algoritmos visuales sobre pilas, colas y listas, observar su comportamiento y relacionar la sintaxis del programa con el efecto producido sobre la estructura. Esta capacidad le otorga valor formativo real como entorno de experimentación y apoyo didáctico.

No obstante, el sistema aún no puede considerarse una cobertura completa del bloque temático de estructuras lineales del sílabo, debido principalmente a que:

- no explicita el concepto de puntero;
- no distingue aún con suficiente detalle los distintos tipos de listas ligadas;
- no desarrolla ampliamente aplicaciones, búsquedas ni ordenamientos sobre estas estructuras.

En consecuencia, la conclusión más adecuada es que el prototipo **sí presenta una correspondencia sustantiva con el sílabo cuando la evaluación se restringe a estructuras de datos lineales**, aunque todavía requiere ampliaciones para aproximarse a una cobertura más robusta y curricularmente más completa.

## 10. Recomendaciones de desarrollo futuro
Con el fin de fortalecer la alineación del sistema con el sílabo en el ámbito de estructuras lineales, se recomienda:

1. incorporar una representación didáctica explícita del concepto de puntero y nodo;
2. diferenciar variantes de listas, al menos entre lista simplemente enlazada y lista doblemente enlazada;
3. ampliar el conjunto de operaciones disponibles sobre listas;
4. incorporar problemas y niveles orientados a aplicaciones concretas de pilas, colas y listas;
5. introducir, en una etapa posterior, algoritmos básicos de búsqueda y ordenamiento sobre estructuras lineales.

En síntesis, el proyecto ya exhibe una base suficientemente sólida para ser presentado como evidencia de aporte académico en el campo de las estructuras de datos lineales, y al mismo tiempo proporciona una hoja de ruta clara para su maduración futura.
