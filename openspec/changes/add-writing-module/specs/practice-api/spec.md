## ADDED Requirements

### Requirement: Superficie HTTP versionada

El backend SHALL exponer su funcionalidad como una API HTTP JSON bajo un prefijo de versión explícito. La API SHALL ser el único medio de acceso a la funcionalidad de práctica, de modo que el frontend propio y cualquier cliente externo consuman el mismo contrato sin privilegios diferenciados.

#### Scenario: Cliente externo consume la API

- **WHEN** un cliente distinto del frontend propio invoca un recurso de la API con una petición válida
- **THEN** obtiene la misma respuesta que obtendría el frontend propio

#### Scenario: Petición sin prefijo de versión

- **WHEN** se invoca una ruta sin el prefijo de versión
- **THEN** el sistema responde con un error de recurso no encontrado

### Requirement: Confinamiento de credenciales del proveedor de IA

La credencial del proveedor de IA SHALL residir únicamente en la configuración del servidor. El sistema SHALL NOT incluirla en respuestas, mensajes de error, registros de log ni en ningún artefacto entregado al cliente. El servidor SHALL negarse a iniciar si la credencial no está configurada.

#### Scenario: Arranque sin credencial configurada

- **WHEN** el servidor arranca sin la credencial del proveedor configurada
- **THEN** falla el arranque con un mensaje que indica la variable de configuración faltante
- **AND** el mensaje no contiene ningún valor de credencial

#### Scenario: Error proveniente del proveedor

- **WHEN** el proveedor de IA devuelve un error que menciona datos de autenticación
- **THEN** la respuesta al cliente describe el fallo sin exponer la credencial

#### Scenario: Registro de actividad

- **WHEN** el sistema registra una llamada al proveedor de IA
- **THEN** el registro no contiene la credencial

### Requirement: Formato uniforme de errores

Toda respuesta de error SHALL usar un cuerpo JSON con una forma uniforme que incluya un código de error estable legible por máquina y un mensaje legible por humanos. Los errores de validación SHALL identificar los campos que fallaron. El sistema SHALL distinguir mediante el código de estado los errores atribuibles al cliente de los fallos internos o del proveedor.

#### Scenario: Petición con cuerpo inválido

- **WHEN** un cliente envía una petición cuyo cuerpo no satisface el esquema esperado
- **THEN** el sistema responde con un estado de error de cliente
- **AND** el cuerpo identifica los campos inválidos

#### Scenario: Fallo del proveedor de IA

- **WHEN** la evaluación falla por indisponibilidad del proveedor
- **THEN** el sistema responde con un estado que indica un fallo del lado del servidor
- **AND** el código de error permite al cliente distinguirlo de un error de validación

#### Scenario: Recurso inexistente

- **WHEN** un cliente solicita una sesión o desafío que no existe
- **THEN** el sistema responde con un estado de recurso no encontrado y el formato uniforme de error

### Requirement: Validación de entradas en la frontera

El sistema SHALL validar toda entrada recibida contra un esquema declarado antes de procesarla. El texto de una redacción SHALL estar acotado por una longitud máxima configurable. Las entradas que excedan los límites o no satisfagan el esquema SHALL rechazarse sin invocar al proveedor de IA.

#### Scenario: Redacción que excede la longitud máxima

- **WHEN** un cliente envía un texto que supera la longitud máxima configurada
- **THEN** el sistema rechaza la petición con un error de validación
- **AND** no invoca al proveedor de IA

#### Scenario: Campo requerido ausente

- **WHEN** una petición omite un campo requerido por el esquema
- **THEN** el sistema responde con un error de validación que nombra el campo faltante

### Requirement: Protección contra uso abusivo

El sistema SHALL limitar la tasa de peticiones que disparan llamadas al proveedor de IA. Al superarse el límite, SHALL responder con un error de límite excedido e indicar cuándo puede reintentarse, sin invocar al proveedor.

#### Scenario: Se supera el límite de evaluaciones

- **WHEN** un cliente supera el límite configurado de peticiones de evaluación en la ventana de tiempo
- **THEN** el sistema responde con un error de límite excedido
- **AND** informa el tiempo tras el cual puede reintentar
- **AND** no invoca al proveedor de IA

#### Scenario: Peticiones dentro del límite

- **WHEN** un cliente realiza peticiones por debajo del límite configurado
- **THEN** las peticiones se procesan normalmente

### Requirement: Acceso desde clientes de navegador

El sistema SHALL permitir el consumo de la API desde navegadores mediante una política de origen cruzado con una lista de orígenes permitidos configurable. Los orígenes no incluidos en la lista SHALL NOT obtener acceso desde el navegador.

#### Scenario: Petición desde un origen permitido

- **WHEN** un navegador en un origen configurado como permitido invoca la API
- **THEN** la respuesta autoriza el origen y el cliente puede leerla

#### Scenario: Petición desde un origen no permitido

- **WHEN** un navegador en un origen no configurado invoca la API
- **THEN** la respuesta no autoriza el origen

### Requirement: Descripción del contrato para clientes externos

El sistema SHALL publicar una descripción legible por máquina de su contrato, enumerando sus operaciones con sus entradas y salidas. Esta descripción SHALL mantenerse consistente con el comportamiento real de la API y SHALL servir de base para exponer las operaciones a través de un servidor MCP en el futuro.

#### Scenario: Consultar la descripción del contrato

- **WHEN** un cliente solicita la descripción del contrato de la API
- **THEN** el sistema devuelve un documento legible por máquina con las operaciones disponibles y sus esquemas

#### Scenario: Consistencia del contrato

- **WHEN** una operación acepta o devuelve un campo
- **THEN** ese campo aparece descrito en el documento de contrato

### Requirement: Verificación de estado del servicio

El sistema SHALL exponer un recurso de verificación de estado que informe si el servicio está operativo y si la configuración requerida para evaluar está presente, sin revelar valores de configuración.

#### Scenario: Servicio operativo

- **WHEN** se consulta el estado con la configuración completa
- **THEN** el sistema responde que está operativo y que la evaluación está disponible

#### Scenario: Configuración de evaluación ausente

- **WHEN** se consulta el estado sin la configuración del proveedor de IA
- **THEN** el sistema informa que la evaluación no está disponible
- **AND** no revela valores de configuración
