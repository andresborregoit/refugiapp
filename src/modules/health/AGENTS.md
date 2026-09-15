# Reglas para `health`

## Responsabilidad
- Expone health checks de liveness y readiness para orquestadores (Kubernetes, ECS, load balancers).
- `GET /health` es liveness: responde `200` mientras el proceso esta vivo, sin dependencias externas.
- `GET /health/ready` es readiness: comprueba la aplicacion y la conexion a PostgreSQL; responde `503` si algun componente esta `down`.

## Convenciones
- Los endpoints de health son publicos: no requieren JWT.
- El estado global puede ser `ok`, `degraded` o `error`.
  - `ok` -> HTTP `200`.
  - `degraded` -> HTTP `200` (sigue sirviendo trafico, pero con latencia elevada).
  - `error` -> HTTP `503` (al menos un componente `down`).
- Los indicadores no deben lanzar excepciones: siempre devuelven un resultado `up`, `degraded` o `down`.
- `HealthAggregatorService` combina los resultados de los indicadores; no agregar logica de conexion ahi.
- El chequeo de base de datos vive en `infrastructure` porque usa `DataSource` (TypeORM). No importar TypeORM en `domain`.
- Usar `@HealthCheck()` de `@nestjs/terminus` para no cachear la respuesta y documentar en Swagger.
- No incluir secretos, URLs de conexion ni credenciales en las respuestas de health.

## Umbrales
- `HEALTH_DB_TIMEOUT_MS`: timeout del `SELECT 1` contra PostgreSQL (default `2000`).
- `HEALTH_DEGRADED_LATENCY_MS`: latencia a partir de la cual la base se considera `degraded` (default `500`).
- Toda variable nueva debe declararse en `.env.example` y validarse en `validation.schema.ts`.