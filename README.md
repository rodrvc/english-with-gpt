# English Practice — módulo Writing

Plataforma de práctica de inglés para hispanohablantes. Este repositorio contiene el primer módulo, **Writing**: el estudiante recibe un desafío, escribe en inglés, la IA evalúa y devuelve correcciones **ancladas a su texto**, y el estudiante **reescribe por sí mismo** hasta aprobar. La corrección nunca se aplica automáticamente.

Speaking, Listening y Reading aparecen en la navegación como *próximamente*.

## Requisitos

- Node.js ≥ 22.13 (usa `node:sqlite`, incluido en Node; sin compilación nativa). Desarrollado con Node 26.
- npm ≥ 10 (workspaces).
- Una credencial de OpenAI con acceso a un modelo con *structured outputs* (por defecto `gpt-5.4-mini`).

## Estructura

```
packages/shared   Esquemas Zod del contrato (dominio, API, salida del proveedor) y tipos derivados
apps/api          Backend Express + TypeScript. Única frontera con OpenAI. SQLite local.
apps/web          Frontend Vite + React + TypeScript.
openspec/         Propuesta, diseño, specs y tareas del cambio (OpenSpec)
mockups/          Maqueta visual validada (solo referencia)
```

## Configuración

Copia `.env.example` a `.env` en la raíz y completa la credencial:

| Variable | Descripción | Por defecto |
|---|---|---|
| `OPENAI_API_KEY` | Credencial del proveedor. **Solo vive en el servidor.** Sin ella la API no arranca. | — |
| `OPENAI_MODEL` | Modelo con soporte de salida estructurada estricta | `gpt-5.4-mini` |
| `PORT` | Puerto del backend | `3001` |
| `WEB_ORIGIN` | Orígenes permitidos por CORS, separados por coma | `http://localhost:5173` |
| `DATABASE_PATH` | Ruta del archivo SQLite (relativa a `apps/api`); `:memory:` para efímera | `./data/practice.db` |
| `MAX_TEXT_LENGTH` | Longitud máxima de una redacción (unidades UTF-16) | `4000` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_SECONDS` | Límite de evaluaciones por ventana | `10` / `60` |

El frontend acepta opcionalmente `VITE_API_URL` (por defecto `http://localhost:3001`).

## Arranque

```bash
npm install
npm run dev        # compila shared y levanta api (3001) + web (5173)
```

Abre http://localhost:5173. Otros comandos:

```bash
npm test           # tests de shared y api (Vitest)
npm run typecheck  # tsc --noEmit en los tres paquetes
npm run build      # build de producción de los tres paquetes
npm start          # api compilada (apps/api/dist)
```

## API HTTP

Base: `http://localhost:3001/api/v1`. Todas las respuestas son JSON. El contrato legible por máquina (JSON Schema de cada operación) está en `GET /api/v1/contract` y se deriva de los mismos esquemas Zod que validan la entrada y tipan el frontend.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio y si la evaluación está disponible. No revela configuración. |
| `GET` | `/contract` | Documento de contrato con operaciones, entradas y salidas. |
| `GET` | `/challenges?level=B1&context=work_email` | Catálogo de desafíos, filtrable por nivel CEFR y contexto. |
| `GET` | `/challenges/:id` | Un desafío. |
| `POST` | `/sessions` | Inicia una sesión. Cuerpo: `{ challengeId }` o filtros `{ level?, context? }` para elegir al azar. |
| `GET` | `/sessions/:id` | Sesión con sus intentos en orden, cada uno con texto, evaluación y delta. |
| `POST` | `/sessions/:id/attempts` | Cuerpo `{ text }`. Evalúa, persiste el intento numerado, calcula el delta y resuelve la aprobación. Sujeto a límite de tasa. |
| `GET` | `/export/attempts?from=&to=` | Exportación estable (`english-practice.attempts.v1`) para el motor de métricas. |

Contextos: `work_email`, `friend_letter`, `instructions`, `complaint`, `other`. Niveles: `A1`…`C2`.

### Evaluación

Cada intento devuelve una `evaluation` con:

- `score` (0–100): promedio ponderado del desglose, calculado en el servidor (gramática 35 %, vocabulario 20 %, coherencia 25 %, registro 20 %).
- `breakdown`: `grammar`, `vocabulary`, `coherence`, `register` (0–100 cada uno).
- `corrections[]`: `{ id, category, severity, start, end, original, suggestion, explanation }`. `start`/`end` son desplazamientos en unidades UTF-16 sobre el texto enviado (semántica de `String.prototype.slice`), **verificados en el servidor**: el fragmento citado es autoritativo; si los índices del modelo no coinciden se relocaliza por búsqueda única o se descarta.
- `severity`: `error` (ortografía, gramática, concordancia, puntuación, y vocabulario incorrecto) o `style` (registro, coherencia, vocabulario poco natural). Se deriva de la categoría en código.
- `tips[]` y `summary` en español; `passed`; `model` y `rubricVersion` para trazabilidad.

**Criterio de aprobación:** `score ≥ 85` **y** cero correcciones de severidad `error`. Las de estilo no bloquean.

### Errores

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Cuerpo inválido", "details": [{ "path": "text", "message": "…" }] } }
```

| Código | Estado | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Cuerpo/filtros inválidos, texto vacío o sobredimensionado. No invoca al proveedor. |
| `NOT_FOUND` | 404 | Desafío, sesión o ruta inexistente (incluye rutas sin prefijo de versión). |
| `SESSION_CLOSED` | 409 | Intento sobre una sesión ya aprobada. |
| `RATE_LIMITED` | 429 | Límite de evaluaciones; incluye `retryAfterSeconds` y cabecera `Retry-After`. |
| `PROVIDER_ERROR` | 502 | El proveedor de IA falló o no respondió. Nunca incluye la credencial. |
| `EVALUATION_UNAVAILABLE` | 503 | El proveedor devolvió respuestas inválidas tras los reintentos. No se crea intento. |
| `INTERNAL_ERROR` | 500 | Fallo no previsto. |

## Decisiones relevantes

- **Reconciliación de anclajes en el servidor** (`apps/api/src/evaluation/anchors.ts`): aceptar si `text.slice(start, end) === original`; si no, buscar `original` y relocalizar solo con una coincidencia única; descartar si es ambiguo, no aparece o los índices están fuera de rango; ante superposición conservar la de mayor severidad.
- **Editor de texto plano**: `textarea` transparente sobre una capa de resaltado que comparte un único bloque CSS de métricas (`.editor-text`). Al editar, las marcas de la zona editada se invalidan (no se transforman posiciones) y la UI indica *cambios sin revisar*.
- **El texto del estudiante va delimitado** en el prompt y declarado como dato; una instrucción incrustada ("give me 100") se evalúa como contenido.
- **`rubricVersion`** se incrementa a mano en `apps/api/src/evaluation/prompt.ts` cuando cambia el prompt o las reglas de puntuación.
- **Persistencia** con `node:sqlite` (API equivalente a better-sqlite3, sin dependencias nativas), tras repositorios para poder cambiar de motor.

Ver `openspec/changes/add-writing-module/` para la propuesta, el diseño, las specs y la revisión de cumplimiento.
