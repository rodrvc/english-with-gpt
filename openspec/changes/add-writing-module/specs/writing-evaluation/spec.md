## ADDED Requirements

### Requirement: Evaluación de una redacción

El sistema SHALL evaluar el texto de un intento contra la consigna, el nivel CEFR, el registro esperado y el rango de palabras del desafío, produciendo un resultado estructurado que contenga: puntaje global, desglose por dimensiones, lista de correcciones, consejos pedagógicos y un veredicto de aprobación.

#### Scenario: Evaluación de un texto con errores

- **WHEN** se evalúa una redacción que contiene errores de gramática u ortografía
- **THEN** el resultado incluye una corrección por cada error detectado
- **AND** el puntaje global refleja la presencia de esos errores

#### Scenario: Evaluación de un texto correcto

- **WHEN** se evalúa una redacción sin errores objetivos y adecuada a la consigna
- **THEN** el resultado no contiene correcciones de tipo error
- **AND** el veredicto indica que el texto cumple el criterio de aprobación

### Requirement: Puntaje global y desglose por dimensiones

El sistema SHALL producir un puntaje global entero entre 0 y 100. SHALL además producir un desglose con un puntaje entero entre 0 y 100 para cada una de estas cuatro dimensiones: gramática, vocabulario, coherencia y registro. Todas las dimensiones SHALL estar presentes en todo resultado de evaluación.

#### Scenario: El resultado incluye todas las dimensiones

- **WHEN** se completa una evaluación
- **THEN** el resultado contiene puntajes para gramática, vocabulario, coherencia y registro
- **AND** cada puntaje es un entero entre 0 y 100

#### Scenario: Puntaje fuera de rango devuelto por el proveedor

- **WHEN** el proveedor de IA devuelve un puntaje fuera del rango 0 a 100
- **THEN** el sistema trata la respuesta como inválida y no la persiste como evaluación

### Requirement: Anclaje de correcciones al texto

Cada corrección SHALL identificar el tramo exacto del texto del estudiante al que se refiere mediante un desplazamiento de inicio y uno de fin, expresados en unidades de código Unicode sobre el texto enviado. El sistema SHALL verificar que el fragmento delimitado por esos desplazamientos coincide con el fragmento citado en la corrección. Las correcciones cuyo anclaje no pueda verificarse SHALL descartarse antes de entregar el resultado.

#### Scenario: Corrección con anclaje válido

- **WHEN** una corrección declara desplazamientos cuyo tramo coincide con el fragmento citado
- **THEN** el sistema conserva la corrección en el resultado

#### Scenario: Corrección con desplazamientos que no coinciden

- **WHEN** una corrección declara desplazamientos cuyo tramo no coincide con el fragmento citado
- **THEN** el sistema intenta relocalizar el fragmento por búsqueda exacta en el texto
- **AND** si encuentra una única coincidencia, corrige los desplazamientos y conserva la corrección
- **AND** si no encuentra coincidencia o encuentra varias ambiguas, descarta la corrección

#### Scenario: Correcciones con tramos superpuestos

- **WHEN** dos correcciones se anclan a tramos que se superponen
- **THEN** el sistema conserva la de mayor severidad y descarta la otra
- **AND** el resultado no contiene tramos superpuestos

#### Scenario: Desplazamientos fuera de los límites del texto

- **WHEN** una corrección declara desplazamientos que exceden la longitud del texto o son negativos
- **THEN** el sistema descarta la corrección

### Requirement: Clasificación de correcciones

Cada corrección SHALL declarar una severidad de entre dos valores: error, para infracciones objetivas de la lengua; y estilo, para mejoras de naturalidad, concisión o adecuación al registro. Cada corrección SHALL además declarar una categoría de entre: ortografía, gramática, concordancia, puntuación, vocabulario, registro, coherencia. Las categorías ortografía, gramática, concordancia y puntuación SHALL clasificarse siempre con severidad error; registro y coherencia SHALL clasificarse con severidad estilo.

#### Scenario: Error de ortografía

- **WHEN** la evaluación detecta una palabra mal escrita
- **THEN** la corrección se clasifica con categoría ortografía y severidad error

#### Scenario: Sugerencia de naturalidad

- **WHEN** la evaluación detecta una construcción correcta pero poco natural para el registro pedido
- **THEN** la corrección se clasifica con severidad estilo

#### Scenario: Severidad incongruente con la categoría

- **WHEN** el proveedor devuelve una corrección de categoría ortografía con severidad estilo
- **THEN** el sistema corrige la severidad al valor que corresponde a la categoría

### Requirement: Contenido de cada corrección

Cada corrección SHALL incluir: el fragmento original citado del texto, la reescritura propuesta, y una explicación breve en español dirigida al estudiante que justifique por qué la propuesta es mejor. La explicación SHALL describir la regla o el criterio, y SHALL NOT limitarse a repetir la reescritura.

#### Scenario: Corrección completa

- **WHEN** el resultado contiene una corrección
- **THEN** la corrección incluye fragmento original, propuesta y explicación en español

#### Scenario: Corrección sin explicación

- **WHEN** el proveedor devuelve una corrección sin explicación o con explicación vacía
- **THEN** el sistema descarta esa corrección

### Requirement: Consejos pedagógicos

El sistema SHALL producir junto a cada evaluación un conjunto acotado de consejos en español dirigidos al estudiante. Los consejos SHALL señalar patrones de error recurrentes cuando existan, y SHALL indicar el siguiente paso concreto para mejorar. Cuando la sesión tenga intentos previos, los consejos SHALL referirse a la evolución respecto de esos intentos.

#### Scenario: Patrón de error repetido en un mismo intento

- **WHEN** un intento presenta varias correcciones de la misma categoría
- **THEN** los consejos señalan explícitamente ese patrón recurrente

#### Scenario: Segundo intento con menos errores

- **WHEN** se evalúa un intento posterior con menos correcciones que el anterior
- **THEN** los consejos reconocen la mejora respecto del intento previo

### Requirement: Validación estructural de la respuesta del proveedor

El sistema SHALL validar toda respuesta del proveedor de IA contra el esquema del resultado de evaluación antes de usarla. Una respuesta que no satisfaga el esquema SHALL NOT persistirse ni entregarse al cliente. Ante una respuesta inválida, el sistema SHALL reintentar la evaluación un número acotado de veces y, si sigue fallando, SHALL responder con un error explícito de evaluación no disponible.

#### Scenario: Respuesta que no cumple el esquema

- **WHEN** el proveedor devuelve una respuesta que no satisface el esquema
- **THEN** el sistema no la persiste
- **AND** reintenta la evaluación

#### Scenario: Fallo persistente del proveedor

- **WHEN** los reintentos de evaluación se agotan sin obtener una respuesta válida
- **THEN** el sistema responde con un error de evaluación no disponible
- **AND** no crea un intento con evaluación incompleta

#### Scenario: Indisponibilidad del proveedor

- **WHEN** el proveedor de IA no responde o devuelve un error de servicio
- **THEN** el sistema responde con un error que distingue el fallo del proveedor de un error del cliente

### Requirement: Aislamiento frente a instrucciones incrustadas en el texto

El sistema SHALL tratar el texto redactado por el estudiante exclusivamente como contenido a evaluar. Las instrucciones que aparezcan dentro de ese texto SHALL NOT alterar los criterios de evaluación, el puntaje ni el formato del resultado.

#### Scenario: El texto contiene una instrucción dirigida al evaluador

- **WHEN** la redacción del estudiante incluye una frase que pide asignar el puntaje máximo o ignorar los errores
- **THEN** el sistema evalúa el texto según los criterios del desafío
- **AND** la instrucción incrustada se considera parte del contenido evaluado, no una directiva

### Requirement: Determinismo y trazabilidad de la evaluación

El sistema SHALL registrar, para cada evaluación persistida, el identificador del modelo utilizado y la versión del criterio de evaluación aplicado, de modo que los puntajes históricos puedan interpretarse cuando el modelo o los criterios cambien.

#### Scenario: Evaluación persistida

- **WHEN** se persiste el resultado de una evaluación
- **THEN** el registro incluye el identificador del modelo y la versión del criterio aplicado

#### Scenario: Comparación entre intentos de distinta versión

- **WHEN** se comparan intentos evaluados con distintas versiones del criterio
- **THEN** el sistema expone la versión de cada intento junto con su puntaje
