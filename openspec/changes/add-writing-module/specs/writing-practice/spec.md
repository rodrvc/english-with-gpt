## ADDED Requirements

### Requirement: Selección de módulo de práctica

El sistema SHALL presentar los cuatro módulos de práctica (Speaking, Listening, Writing, Reading) como puntos de entrada visibles, y SHALL permitir iniciar únicamente aquellos implementados. Los módulos no implementados SHALL indicarse como no disponibles sin producir un error.

#### Scenario: El estudiante entra a la aplicación

- **WHEN** el estudiante abre la aplicación
- **THEN** ve los cuatro módulos identificados por nombre
- **AND** Writing aparece como disponible
- **AND** Speaking, Listening y Reading aparecen marcados como próximamente

#### Scenario: El estudiante intenta abrir un módulo no implementado

- **WHEN** el estudiante activa Speaking, Listening o Reading
- **THEN** el sistema informa que el módulo aún no está disponible
- **AND** permanece en una vista utilizable sin errores

### Requirement: Catálogo de desafíos de escritura

El sistema SHALL mantener un catálogo de desafíos de escritura. Cada desafío SHALL declarar: identificador estable, contexto comunicativo (por ejemplo email laboral, carta a un amigo, instrucciones, reclamo), consigna en inglés, descripción de la tarea, nivel CEFR objetivo, rango de palabras mínimo y máximo, registro esperado (formal o informal) y límite de tiempo sugerido en segundos.

#### Scenario: Consultar desafíos disponibles

- **WHEN** se solicita el catálogo de desafíos
- **THEN** el sistema devuelve la lista de desafíos con todos sus campos declarados

#### Scenario: Filtrar por nivel y contexto

- **WHEN** se solicita el catálogo indicando un nivel CEFR y/o un contexto comunicativo
- **THEN** el sistema devuelve solo los desafíos que coinciden con los filtros

#### Scenario: Desafío inexistente

- **WHEN** se solicita un desafío con un identificador que no existe en el catálogo
- **THEN** el sistema responde con un error de recurso no encontrado

### Requirement: Inicio de una sesión de práctica

El sistema SHALL crear una sesión de práctica al iniciar un desafío. La sesión SHALL registrar el desafío asociado, el instante de inicio, el estado y la colección ordenada de intentos. El sistema SHALL permitir iniciar una sesión con un desafío elegido explícitamente o solicitar uno al azar dentro de filtros dados.

#### Scenario: Iniciar sesión con un desafío específico

- **WHEN** el estudiante inicia una práctica indicando un desafío existente
- **THEN** el sistema crea una sesión en estado activo
- **AND** devuelve el identificador de la sesión y el desafío completo
- **AND** la sesión no tiene intentos registrados

#### Scenario: Iniciar sesión con un desafío al azar

- **WHEN** el estudiante inicia una práctica sin indicar desafío
- **THEN** el sistema selecciona un desafío del catálogo y crea la sesión

### Requirement: Envío de un intento para evaluación

El sistema SHALL aceptar el texto redactado por el estudiante como un intento asociado a una sesión activa, SHALL evaluarlo y SHALL persistir el resultado. Cada intento SHALL numerarse secuencialmente dentro de la sesión comenzando en 1, y SHALL conservar el texto exacto enviado junto con su evaluación.

#### Scenario: Primer envío de una sesión

- **WHEN** el estudiante envía su primera redacción en una sesión activa
- **THEN** el sistema crea un intento con número 1
- **AND** devuelve la evaluación del texto
- **AND** el intento queda persistido en la sesión

#### Scenario: Envío posterior tras corregir

- **WHEN** el estudiante envía una nueva versión del texto en la misma sesión
- **THEN** el sistema crea un intento con el número siguiente
- **AND** conserva los intentos anteriores sin modificarlos

#### Scenario: Texto vacío o solo espacios

- **WHEN** el estudiante envía un texto vacío o compuesto únicamente de espacios en blanco
- **THEN** el sistema rechaza el intento con un error de validación
- **AND** no crea un intento ni consume una llamada al proveedor de IA

#### Scenario: Envío sobre una sesión inexistente o cerrada

- **WHEN** se envía un intento a una sesión que no existe o que ya está cerrada
- **THEN** el sistema responde con un error y no crea el intento

### Requirement: Progreso entre intentos

El sistema SHALL exponer, para cada intento a partir del segundo, la variación de puntaje respecto del intento inmediatamente anterior de la misma sesión. El primer intento SHALL reportar variación nula.

#### Scenario: El estudiante mejora su texto

- **WHEN** un intento obtiene un puntaje mayor que el intento anterior
- **THEN** el sistema reporta una variación positiva igual a la diferencia de puntajes

#### Scenario: El estudiante empeora su texto

- **WHEN** un intento obtiene un puntaje menor que el intento anterior
- **THEN** el sistema reporta una variación negativa igual a la diferencia de puntajes

#### Scenario: Primer intento de la sesión

- **WHEN** se consulta la variación del primer intento
- **THEN** el sistema reporta variación nula

### Requirement: Criterio de aprobación e iteración

El sistema SHALL declarar una sesión como aprobada cuando un intento alcance o supere el umbral de puntaje de aprobación y no contenga correcciones de severidad de error objetivo. Las sugerencias de estilo pendientes SHALL NOT impedir la aprobación. Mientras no se cumpla el criterio, el sistema SHALL permitir intentos adicionales sin límite superior fijo.

#### Scenario: El intento cumple el criterio de aprobación

- **WHEN** un intento alcanza el umbral de puntaje y no tiene correcciones de tipo error
- **THEN** el sistema marca la sesión como aprobada
- **AND** comunica al estudiante que completó el desafío

#### Scenario: El puntaje alcanza el umbral pero quedan errores objetivos

- **WHEN** un intento alcanza el umbral de puntaje pero contiene al menos una corrección de tipo error
- **THEN** la sesión permanece activa
- **AND** el sistema indica que quedan errores por resolver

#### Scenario: Quedan solo sugerencias de estilo

- **WHEN** un intento alcanza el umbral y sus únicas correcciones son de tipo estilo
- **THEN** el sistema marca la sesión como aprobada
- **AND** conserva las sugerencias de estilo como mejoras opcionales

### Requirement: Corrección no destructiva

El sistema SHALL NOT modificar, reemplazar ni reescribir automáticamente el texto del estudiante en ningún momento. Las correcciones propuestas SHALL presentarse como información adyacente al texto, y aplicarlas SHALL ser siempre una acción manual del estudiante sobre su propia redacción.

#### Scenario: Se reciben correcciones desde la evaluación

- **WHEN** la evaluación devuelve correcciones para un intento
- **THEN** el texto del estudiante permanece exactamente como lo escribió
- **AND** las correcciones se muestran junto al texto sin aplicarse

#### Scenario: El estudiante consulta una corrección

- **WHEN** el estudiante selecciona una corrección propuesta
- **THEN** el sistema resalta el tramo de texto correspondiente y muestra la propuesta
- **AND** no altera el contenido de la redacción

### Requirement: Ocultamiento de marcas de corrección

El sistema SHALL permitir al estudiante ocultar y volver a mostrar las marcas de corrección sobre su texto, de modo que pueda reescribir sin verlas. El estado de visibilidad SHALL NOT afectar el texto ni las correcciones almacenadas.

#### Scenario: El estudiante oculta las marcas

- **WHEN** el estudiante activa la opción de ocultar marcas
- **THEN** el texto se muestra sin resaltados de corrección
- **AND** el texto redactado permanece editable e intacto

#### Scenario: El estudiante vuelve a mostrar las marcas

- **WHEN** el estudiante desactiva la opción de ocultar marcas
- **THEN** las correcciones vigentes vuelven a resaltarse sobre el texto

### Requirement: Historial de la sesión

El sistema SHALL permitir recuperar una sesión con todos sus intentos, incluyendo para cada uno el texto enviado, el puntaje, el desglose por dimensiones y las correcciones recibidas, en orden cronológico.

#### Scenario: Recuperar una sesión con varios intentos

- **WHEN** se solicita una sesión que tiene múltiples intentos
- **THEN** el sistema devuelve la sesión con sus intentos ordenados por número ascendente
- **AND** cada intento incluye su texto, puntaje, desglose y correcciones

#### Scenario: Recuperar una sesión inexistente

- **WHEN** se solicita una sesión cuyo identificador no existe
- **THEN** el sistema responde con un error de recurso no encontrado

### Requirement: Exportación de resultados para el motor de métricas

El sistema SHALL exponer los resultados de práctica en un formato estable y documentado, apto para ser consumido por el motor de aprendizaje del proyecto hermano. La exportación SHALL incluir, por intento: identificador de sesión, desafío, número de intento, instante, puntaje, desglose por dimensiones y el recuento de correcciones agrupado por categoría de error.

#### Scenario: Exportar resultados de práctica

- **WHEN** se solicita la exportación de resultados
- **THEN** el sistema devuelve los intentos registrados con todos los campos declarados
- **AND** el formato es estable e independiente de la representación interna

#### Scenario: Exportar filtrando por rango de fechas

- **WHEN** se solicita la exportación indicando un rango de fechas
- **THEN** el sistema devuelve únicamente los intentos cuyo instante cae dentro del rango
