## Why

Un estudiante que reprueba una prueba de inglés no necesita más teoría: necesita producir lenguaje, recibir corrección precisa y volver a intentarlo hasta que le salga bien. Las herramientas actuales o corrigen automáticamente (el estudiante copia y no aprende) o dan una nota sin explicar qué falló. Este cambio entrega el primero de los cuatro módulos —Writing— como un ciclo cerrado de práctica deliberada: desafío → redacción → evaluación por IA → reescritura del propio estudiante → nueva evaluación, con una nota que sube o baja y deja rastro para el motor de métricas.

Writing va primero porque es el módulo con el bucle de feedback más corto y sin dependencias de audio, lo que permite validar el ciclo iterativo completo antes de invertir en Speaking, Listening y Reading.

## What Changes

- **Nuevo backend Express + TypeScript** desacoplado del frontend, única frontera con OpenAI. La API key vive solo en el servidor. La API se diseña como contrato público y estable para habilitar clientes externos y un futuro servidor MCP.
- **Nuevo frontend Vite + React + TypeScript** con el shell de navegación de los 4 módulos; Writing implementado, los otros tres visibles como *próximamente*.
- **Banco de desafíos de escritura** parametrizados por contexto (email laboral, carta a un amigo, instrucciones, reclamo, otros), nivel CEFR y restricciones (tono, extensión, tiempo).
- **Evaluador por IA** que recibe una redacción y devuelve un resultado estructurado y validado: puntaje global, desglose por dimensiones (gramática, vocabulario, coherencia, registro) y una lista de correcciones, cada una anclada a un rango exacto del texto y clasificada como error objetivo o sugerencia de estilo.
- **Ciclo de iteración con intentos versionados**: cada envío es un intento persistido; el estudiante ve el delta de nota respecto al intento anterior y itera hasta alcanzar el umbral de aprobación.
- **Corrección no destructiva**: la UI resalta los tramos mejorables y muestra la propuesta al lado, pero nunca reescribe el texto del estudiante. Se puede ocultar las marcas para corregir a ciegas.
- **Persistencia de sesiones e intentos** para alimentar métricas longitudinales, con un contrato de exportación pensado para el proyecto hermano (motor de aprendizaje).

## Capabilities

### New Capabilities

- `writing-practice` — el ciclo de práctica de escritura: desafíos, sesiones, intentos, iteración y criterio de aprobación.
- `writing-evaluation` — la evaluación por IA de una redacción: contrato de entrada/salida, anclaje de correcciones al texto, taxonomía de errores y puntuación.
- `practice-api` — la superficie HTTP pública del backend: recursos, versionado, autenticación, errores y límites; diseñada para clientes externos y MCP.

### Modified Capabilities

Ninguna. Es el primer cambio del proyecto.

## Impact

- **Código**: repositorio nuevo con dos paquetes (`apps/api`, `apps/web`) y tipos compartidos. No hay código previo que romper.
- **Dependencias externas**: OpenAI API (modelo de texto con salida estructurada). La key se reutiliza desde configuración local y nunca se versiona.
- **Datos**: nueva persistencia de desafíos, sesiones e intentos. Al ser el primer cambio, no hay migración.
- **Sistemas vecinos**: se define el contrato de exportación hacia el motor de métricas del proyecto hermano, pero la integración efectiva queda fuera de alcance.
- **Costo/latencia**: cada revisión es una llamada a un modelo de lenguaje; el diseño debe acotar tokens y proteger contra abuso.
- **Fuera de alcance**: Speaking, Listening y Reading; cuentas de usuario multi-tenant; el servidor MCP en sí (solo se deja el camino preparado).
