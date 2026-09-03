## 1. Andamiaje del monorepo

- [x] 1.1 Crear la estructura `apps/api`, `apps/web`, `packages/shared` con workspaces de npm y TypeScript en modo estricto
- [x] 1.2 Configurar build y ejecución en desarrollo de ambas apps con un único comando desde la raíz
- [x] 1.3 Añadir `.env.example` con las variables requeridas y `.gitignore` que excluya `.env`, la base de datos y artefactos de build
- [x] 1.4 Configurar Vitest en `apps/api` y `packages/shared`

## 2. Contrato compartido

- [x] 2.1 Definir en `packages/shared` los esquemas Zod de dominio: `Challenge`, `Session`, `Attempt`, `Correction`, `ScoreBreakdown`, `Evaluation`
- [x] 2.2 Definir los esquemas de petición y respuesta de cada operación de la API y exportar los tipos derivados
- [x] 2.3 Fijar la taxonomía de categorías y severidades, y la función que deriva severidad a partir de categoría
- [x] 2.4 Derivar el esquema JSON de salida estructurada para el proveedor desde los mismos esquemas Zod
- [x] 2.5 Tests: la derivación de severidad cubre todas las categorías; los esquemas rechazan puntajes fuera de 0..100

## 3. Persistencia

- [x] 3.1 Definir el esquema SQLite de `challenges`, `sessions` y `attempts` con creación idempotente al arrancar
- [x] 3.2 Implementar el repositorio de desafíos con consulta por identificador y filtrado por nivel y contexto
- [x] 3.3 Implementar el repositorio de sesiones e intentos, con numeración secuencial de intentos por sesión
- [x] 3.4 Escribir la semilla de al menos 8 desafíos cubriendo email laboral, carta a un amigo, instrucciones, reclamo y otros contextos, en varios niveles CEFR
- [x] 3.5 Tests: la numeración de intentos es correcta y consecutiva; el filtrado de desafíos devuelve solo coincidencias

## 4. Evaluador por IA

- [x] 4.1 Implementar el cliente de OpenAI leyendo la credencial solo desde configuración de servidor, con fallo de arranque si falta
- [x] 4.2 Redactar el prompt de evaluación con la rúbrica por dimensiones y la delimitación explícita del texto del estudiante como dato no ejecutable
- [x] 4.3 Invocar al proveedor con salida estructurada estricta y validar la respuesta contra el esquema compartido
- [x] 4.4 Implementar la reconciliación de anclajes: verificación directa, relocalización por búsqueda única, y descarte cuando es ambiguo o fuera de rango
- [x] 4.5 Implementar el descarte de correcciones con tramos superpuestos conservando la de mayor severidad
- [x] 4.6 Normalizar la severidad a partir de la categoría y descartar correcciones sin explicación
- [x] 4.7 Implementar el reintento acotado ante respuesta inválida y el error explícito de evaluación no disponible al agotarse
- [x] 4.8 Registrar en cada evaluación el identificador del modelo y la `rubricVersion`
- [x] 4.9 Generar los consejos pedagógicos considerando los intentos previos de la sesión
- [x] 4.10 Tests con respuestas de proveedor simuladas: anclaje correcto, anclaje desplazado recuperable, fragmento ambiguo, fuera de rango, superposición, severidad incongruente, explicación vacía
- [x] 4.11 Test: un texto que contiene una instrucción dirigida al evaluador no altera el resultado

## 5. API HTTP

- [x] 5.1 Montar Express con el prefijo de versión, parseo JSON y apagado ordenado
- [x] 5.2 Implementar el middleware de errores con el formato uniforme, códigos estables y distinción entre fallo de cliente, de servidor y de proveedor
- [x] 5.3 Implementar la validación de entradas contra los esquemas compartidos, incluida la longitud máxima del texto, rechazando antes de invocar al proveedor
- [x] 5.4 Implementar `GET /challenges` con filtros y `GET /challenges/:id`
- [x] 5.5 Implementar `POST /sessions` con desafío explícito o selección al azar
- [x] 5.6 Implementar `GET /sessions/:id` devolviendo los intentos en orden con su texto, puntaje, desglose y correcciones
- [x] 5.7 Implementar `POST /sessions/:id/attempts` que evalúa, persiste, calcula el delta respecto al intento previo y resuelve el criterio de aprobación
- [x] 5.8 Implementar `GET /export/attempts` con filtro por rango de fechas y el formato estable de exportación
- [x] 5.9 Implementar `GET /health` informando disponibilidad de la evaluación sin revelar configuración
- [x] 5.10 Implementar el límite de tasa sobre las operaciones que invocan al proveedor, informando el tiempo de reintento
- [x] 5.11 Configurar CORS con lista de orígenes permitidos configurable
- [x] 5.12 Publicar el documento de contrato legible por máquina derivado de los esquemas compartidos
- [x] 5.13 Tests de integración de cada operación, incluidos texto vacío, sesión inexistente, texto sobredimensionado y límite de tasa excedido

## 6. Shell del frontend

- [x] 6.1 Montar la aplicación Vite con React, enrutado y el cliente HTTP tipado contra el contrato compartido
- [x] 6.2 Implementar los tokens de diseño de la paleta blanco y rosado, tipografía y espaciado, con soporte de tema claro y oscuro
- [x] 6.3 Implementar la barra superior con los cuatro módulos, Writing activo y los otros tres marcados como próximamente sin producir errores
- [x] 6.4 Implementar los estados de carga y de error de la aplicación con los mensajes de error del contrato

## 7. Vista de práctica de escritura

- [x] 7.1 Implementar la tarjeta del desafío con consigna, contexto, nivel, rango de palabras, registro y temporizador informativo
- [x] 7.2 Implementar el editor de texto plano con contador de palabras y estado de cambios sin revisar
- [x] 7.3 Implementar la capa de resaltado superpuesta y alineada con el editor, derivando los segmentos de los rangos de corrección
- [x] 7.4 Diferenciar visualmente las marcas de severidad error y de severidad estilo
- [x] 7.5 Implementar la invalidación de marcas al editar el texto
- [x] 7.6 Implementar el control de ocultar y mostrar marcas sin alterar el texto ni las correcciones almacenadas
- [x] 7.7 Implementar el panel de correcciones con categoría, fragmento original, propuesta y explicación
- [x] 7.8 Implementar el resaltado recíproco entre una corrección del panel y su tramo en el texto
- [x] 7.9 Implementar el panel de consejos de la IA
- [x] 7.10 Implementar el anillo de puntaje con el delta respecto al intento anterior y el desglose por dimensiones
- [x] 7.11 Implementar el envío a revisión con su estado de carga, manteniendo el texto editable
- [x] 7.12 Implementar el estado de sesión aprobada y la opción de iniciar un nuevo desafío
- [x] 7.13 Verificar que la corrección nunca se aplica automáticamente al texto del estudiante

## 8. Cierre

- [x] 8.1 Verificar de punta a punta el ciclo completo: iniciar desafío, enviar texto con errores, recibir correcciones ancladas, reescribir, reenviar y aprobar
- [x] 8.2 Confirmar que la credencial no aparece en respuestas, errores, logs ni en el bundle del frontend
- [x] 8.3 Escribir el README con requisitos, configuración de variables, arranque de ambas apps y descripción de la API
- [x] 8.4 Repasar cada requisito de las specs contra la implementación y registrar las desviaciones
