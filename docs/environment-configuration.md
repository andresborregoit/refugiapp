# Configuracion por ambiente

Refugiapp usa el mismo artefacto compilado en todos los ambientes. Las diferencias se inyectan mediante variables de entorno y secretos externos; nunca se genera un build distinto con credenciales incorporadas.

## Archivos de referencia

| Ambiente    | Archivo versionado         | `NODE_ENV`    | `APP_ENV`     |
| ----------- | -------------------------- | ------------- | ------------- |
| Development | `.env.development.example` | `development` | `development` |
| Staging     | `.env.staging.example`     | `production`  | `staging`     |
| Production  | `.env.production.example`  | `production`  | `production`  |

Los archivos son plantillas y no contienen credenciales utilizables. `DATABASE_URL`, `JWT_SECRET` y las credenciales de Cloudinary deben provenir del gestor de secretos de la plataforma. No se deben versionar archivos `.env` reales.

## Variables comunes

| Variable                     | Proposito                                 | Development            | Staging            | Production                  |
| ---------------------------- | ----------------------------------------- | ---------------------- | ------------------ | --------------------------- |
| `NODE_ENV`                   | Modo del runtime y validaciones estrictas | `development`          | `production`       | `production`                |
| `APP_ENV`                    | Ambiente funcional observable             | `development`          | `staging`          | `production`                |
| `PORT`                       | Puerto HTTP interno                       | `3000`                 | `3000`             | `3000`                      |
| `API_PREFIX`                 | Prefijo global HTTP                       | `api/v1`               | `api/v1`           | `api/v1`                    |
| `LOG_LEVEL`                  | Nivel minimo de logs                      | `debug`                | `log`              | `log`                       |
| `DATABASE_URL`               | Conexion PostgreSQL/Neon                  | Base aislada           | Secreto de staging | Secreto de produccion       |
| `DB_SSL`                     | SSL de PostgreSQL                         | Segun base local       | `true`             | `true`                      |
| `DB_SSL_REJECT_UNAUTHORIZED` | Validacion de certificado                 | Segun proveedor        | Segun proveedor    | Segun proveedor             |
| `DB_POOL_SIZE`               | Maximo de conexiones por replica          | `5`                    | `10`               | `10`, ajustar por capacidad |
| `TYPEORM_SYNCHRONIZE`        | Sincronizacion automatica de schema       | `false`                | `false`            | `false` obligatorio         |
| `TYPEORM_LOGGING`            | SQL de TypeORM                            | Opcional               | `false`            | `false`                     |
| `HEALTH_DB_TIMEOUT_MS`       | Timeout de readiness para PostgreSQL      | `2000`                 | `2000`             | `2000`                      |
| `HEALTH_DEGRADED_LATENCY_MS` | Umbral de latencia degradada              | `500`                  | `750`              | `500`                       |
| `TRUST_PROXY_HOPS`           | Cantidad exacta de proxies confiables     | `0`                    | Segun topologia    | Segun topologia             |
| `RATE_LIMIT_*`               | Cuotas y ventanas HTTP                    | Holgadas               | Intermedias        | Restrictivas                |
| `JWT_SECRET`                 | Firma de tokens                           | Secreto local          | Gestor de secretos | Gestor de secretos          |
| `JWT_EXPIRES_IN`             | Duracion del token                        | `1d`                   | `1d`               | `1d`                        |
| `JWT_ISSUER`                 | Emisor esperado                           | Por ambiente           | Por ambiente       | `refugiapp-api`             |
| `JWT_AUDIENCE`               | Audiencia esperada                        | Por ambiente           | Por ambiente       | `refugiapp-mobile`          |
| `CLOUDINARY_*`               | Almacenamiento externo de media           | Opcional               | Requerido          | Requerido                   |
| `MEDIA_ORPHAN_RETENTION_HOURS` | Antiguedad minima para purgar huerfanos  | `48`                   | `48`               | `48`                        |
| `MEDIA_ORPHAN_PURGE_LIMIT`   | Maximo de huerfanos por ejecucion        | `500`                  | `500`              | `500`                       |
| `INITIAL_ADMIN_*`            | Seed controlado del primer administrador  | Solo cuando se ejecuta | Vacio normalmente  | Vacio normalmente           |

## Reglas operativas

- Usar Node.js `20.20.2`, fijado en `.nvmrc` y en el `Dockerfile`. El minimo compatible declarado es `20.18.1`.
- Promover la misma imagen por digest desde staging hasta produccion. No reconstruir entre ambientes.
- Mantener `TYPEORM_SYNCHRONIZE=false`. Los cambios de schema se aplican solo con migraciones versionadas.
- Configurar `TRUST_PROXY_HOPS` con la topologia real. Un valor incorrecto puede agrupar clientes distintos o confiar en headers no seguros.
- Rotar secretos fuera del repositorio. Un cambio de secreto no requiere recompilar la imagen.
