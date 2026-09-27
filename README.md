# Refugiapp API

Boilerplate backend en NestJS para Refugiapp, una aplicacion de gestion de refugios de animales orientada a administradores, encargados del refugio y veterinarios.

La API esta preparada para ser consumida por un frontend en React Native y queda versionada desde el inicio bajo:

```txt
/api/v1
```

## Objetivo de esta etapa

Este proyecto no implementa todavia una aplicacion completa ni CRUDs finales. El foco es dejar una base profesional, modular y escalable para crecer por dominio.

Implementado:

- NestJS con estructura modular.
- TypeORM con PostgreSQL/Neon.
- IDs principales con UUID.
- JWT y roles preparados.
- Swagger/OpenAPI.
- Validacion global con DTOs.
- Filtro base de errores HTTP.
- Configuracion base de Cloudinary.
- Entidades ORM iniciales para usuarios, animales, eventos historicos, veterinarios, registros medicos, gastos y assets de media.
- Campo opcional `breed` para animales agregado mediante migracion posterior a la inicial.
- Enum clinico `medical_record_type` con `deworming` incluido.
- Login real mediante email, password hasheado y JWT.
- Hashing bcrypt centralizado para passwords.
- Seed explicito e idempotente para el administrador inicial.
- Migracion inicial ejecutable `InitSchema1787781241921`, ubicada en `src/database/migrations/1787781241921-InitSchema.ts`.
- CRUD de perfiles profesionales de veterinarios sin credenciales, con matricula unica, `userId` opcional y desactivacion por `isActive=false`.
- Tests unitarios y e2e iniciales con Jest.
- `AGENTS.md` por modulo para guiar futuras tareas con IA.
- Validacion de transiciones de estado de animales con matriz acotada.
- Evento `status_change` transaccional con metadata de auditoria.
- Creacion y listado de eventos generales por animal con paginacion y filtros.
- Creacion de registros medicos (`POST /medical-records`) con validacion de animal, veterinario opcional, fecha con limites, adjuntos via media y proteccion por roles.
- Subida de media (`POST /media/upload`) con validacion de propietario (o assets huerfanos), mimetype, tamano, autorizacion por roles y compensacion remota si falla la persistencia.
- Vinculacion polimorfica controlada: tickets solo a gastos, fotos de perfil solo a animales y adjuntos clinicos solo a registros medicos, con re-asignacion transaccional.
- Listado de assets por propietario (`GET /media`) con paginacion y baja logica con limpieza remota en Cloudinary.
- Suite E2E de flujos criticos contra PostgreSQL efimero mediante Testcontainers, sin usar Neon ni datos de produccion.
- Pipeline de CI con matriz Node 20+/22, lint, build, tests unitarios, validacion de migraciones y pruebas HTTP con persistencia real.
- Health checks de liveness y readiness (`GET /health`, `GET /health/ready`) con chequeo real de PostgreSQL y estado `degraded`.
- Logs estructurados en JSON con redaccion de datos sensibles.
- Correlation ID por request (`x-request-id`) propagado a logs y respuestas de error.
- Endpoint de panel de control (`GET /dashboard/overview`) con totales por estado y animales recientes, reutilizando `AnimalOrmEntity` sin nuevas tablas, con `DashboardAnimalDto` alineado a la respuesta real (`profilePhotoMediaId` nullable) y contrato Swagger listo para el cliente movil.
- CRUD de tareas de cuidado (`care-tasks`) con estados `pending`/`completed`/`cancelled`, transiciones acotadas, edicion parcial y auditoria por rol.
- Refresh tokens opacos con rotacion atomica (`POST /auth/refresh`), deteccion de reuso y revocacion de familia.
- Backup y recuperacion de PostgreSQL con retencion, checksum, restauracion aislada y prueba automatizada.
- Contrato OpenAPI congelado y versionado en `docs/openapi.json`, exportado de forma determinista con `npm run openapi:export`.
- Matriz de capacidades por rol (`canEditAnimal`, `canReadClinicalRecords`, `canManageUsers`, `canManageExpenses`, `canManageVets`, `canReadAudit`) con fuente de verdad en `src/common/authorization/role-capabilities.ts` y especificacion en `docs/role-capabilities.md`.
- Teardown resiliente de los tests de persistencia: no añade errores secundarios cuando Docker no esta disponible.

Pendiente:

- CRUDs y casos de uso finales por dominio.

## Arquitectura

Cada modulo importante sigue una organizacion inspirada en Clean Architecture:

```txt
src/modules/<module>/
  domain/
    entities/
    enums/
    repositories/
  application/
    services/
  infrastructure/
    persistence/typeorm/
      entities/
      repositories/
  interfaces/
    controllers/
    dto/
  AGENTS.md
```

Responsabilidades:

- `domain`: reglas, entidades de dominio, enums y contratos. No debe depender de NestJS ni TypeORM.
- `application`: servicios/casos de uso que coordinan el dominio.
- `infrastructure`: TypeORM, Cloudinary y adaptadores externos.
- `interfaces`: controllers y DTOs HTTP.
- `common`: guards, decorators, filtros, excepciones, enums globales y base entities.
- `config`: variables de entorno, validacion, TypeORM, JWT y Cloudinary.

## Estructura generada

```txt
src/
  common/
  config/
  database/migrations/
  modules/
    auth/
    users/
    animals/
    dashboard/
    medical-records/
    veterinarians/
    expenses/
    media/
    audit-logs/
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
test/
  app.e2e-spec.ts
```

Modulos iniciales:

- `auth`: JWT, Passport strategy, guard y login real mediante email, password hasheado y JWT.
- `users`: usuarios internos y roles.
- `animals`: ficha general del animal e historial general del refugio.
- `dashboard`: read-model del panel de control con totales por estado y animales recientes.
- `medical-records`: historial clinico/veterinario.
- `veterinarians`: veterinarios responsables.
- `expenses`: gastos asociados a animales y referencia a tickets.
- `media`: metadata de archivos e imagenes en Cloudinary.
- `audit-logs`: auditoria de operaciones sensibles con consulta protegida para `admin`.

## Instalacion

Requisitos:

- Node.js 20.18.1 o superior; `.nvmrc` fija 20.20.2 para builds reproducibles.
- npm.
- Una base PostgreSQL en Neon.
- Docker para ejecutar localmente la suite E2E con PostgreSQL efimero.

Instalar dependencias:

```bash
npm install
```

Crear archivo de entorno:

```powershell
Copy-Item .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

## Configurar PostgreSQL/Neon

1. Crear un proyecto en Neon.
2. Crear o seleccionar la base de datos `neondb`.
3. Copiar el connection string de Neon, preferentemente el pooled connection string.
4. Configurar `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
TYPEORM_SYNCHRONIZE=false
```

Notas:

- `TYPEORM_SYNCHRONIZE=false` es el valor recomendado. Usar migraciones para cambios de schema.
- Neon requiere SSL, por eso `DB_SSL=true`.
- `DB_SSL_REJECT_UNAUTHORIZED=false` evita problemas habituales con certificados en entornos cloud/serverless.
- El nombre de base documentado para este proyecto es `neondb`; debe coincidir con la base indicada en `DATABASE_URL`.

Comandos de migraciones:

```bash
npm run migration:generate -- src/database/migrations/FeatureName
npm run migration:run
npm run migration:show
npm run migration:revert
```

La migracion inicial ya existe y no debe regenerarse:

```txt
src/database/migrations/1787781241921-InitSchema.ts
```

## Backup y recuperacion

La politica de frecuencia, retencion, RPO/RTO, restauracion y respuesta ante incidentes esta documentada en [`docs/postgresql-backup-recovery.md`](docs/postgresql-backup-recovery.md).

```bash
npm run backup:postgres
npm run restore:postgres
npm run backup:verify
```

Los backups deben permanecer cifrados y privados. Nunca se publican como artifacts de CI ni se versionan en Git.

La migracion `1788897600000-AddBreedToAnimals.ts` agrega el campo opcional `breed` a `animals`.

La migracion `1789399460070-AddAuditLogs.ts` crea la tabla append-only `audit_logs` con sus enums, indices y foreign key a `users`.

Para cambios nuevos de schema, modificar primero las entidades ORM, generar una migracion nueva con nombre descriptivo, revisar el SQL generado y versionar codigo y migracion juntos.

## Administrador inicial

Para probar la autenticacion desde el frontend con el usuario local de demostracion,
consultar [Login desde el frontend](docs/frontend-login.md).

El proyecto incluye un seed explicito para crear o recuperar el primer administrador sin duplicar usuarios:

```bash
npm run seed:admin
```

Variables requeridas:

```env
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=replace-with-a-long-random-password
INITIAL_ADMIN_FIRST_NAME=Initial
INITIAL_ADMIN_LAST_NAME=Admin
INITIAL_ADMIN_RESET_PASSWORD=false
INITIAL_ADMIN_SEED_ALLOW_PRODUCTION=false
```

El password siempre se persiste hasheado. Si el usuario con `INITIAL_ADMIN_EMAIL` ya existe, el seed no crea otro registro y asegura que tenga el rol `admin`.

En `NODE_ENV=production`, el seed queda bloqueado salvo que se declare explicitamente:

```env
INITIAL_ADMIN_SEED_ALLOW_PRODUCTION=true
```

Procedimiento de recuperacion:

1. Cargar `INITIAL_ADMIN_EMAIL` con el email del administrador a recuperar.
2. Cargar `INITIAL_ADMIN_PASSWORD` desde el gestor de secretos o una variable de entorno segura.
3. Definir `INITIAL_ADMIN_RESET_PASSWORD=true`.
4. En produccion, definir tambien `INITIAL_ADMIN_SEED_ALLOW_PRODUCTION=true` solo durante esa ejecucion.
5. Ejecutar `npm run seed:admin`.
6. Remover las variables temporales usadas para la recuperacion.

## Configurar JWT

Configurar un secreto largo y privado:

```env
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=1d
JWT_ISSUER=refugiapp-api
JWT_AUDIENCE=refugiapp-mobile
```

Roles iniciales:

- `admin`
- `shelter_manager`
- `veterinarian`

## Configurar Cloudinary

Crear una cuenta/proyecto en Cloudinary y completar:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_SECURE=true
```

El modulo `media` contiene el provider base de Cloudinary, el servicio de subida con validacion de propietario/mimetype/tamano, listado por propietario y baja logica con limpieza remota.

## Configuracion local segura

- Mantener credenciales reales solo en `.env` local o en el gestor de secretos del entorno.
- No copiar connection strings, tokens, secretos JWT ni claves Cloudinary en README, Jira, commits, logs o capturas.
- Usar placeholders en documentacion, por ejemplo `postgresql://<user>:<password>@<host>/neondb?sslmode=require`.
- Si una credencial se expone, revocarla en el proveedor, crear una nueva y actualizar solo el secreto local o del entorno.
- Antes de compartir el repositorio, ejecutar `npm run secrets:scan`.

## Correr el proyecto

Modo desarrollo:

```bash
npm run start:dev
```

Modo produccion:

```bash
npm run build
npm run start:prod
```

Health check:

```txt
GET http://localhost:3000/api/v1/health        # liveness
GET http://localhost:3000/api/v1/health/ready  # readiness (aplicacion + PostgreSQL)
```

El endpoint de liveness responde `200` mientras el proceso este vivo. El de readiness comprueba la conexion a PostgreSQL: responde `200` con estado `ok`, `200` con estado `degraded` cuando la base responde mas lento que `HEALTH_DEGRADED_LATENCY_MS`, o `503` con estado `error` cuando la base no responde. Los umbrales se configuran con `HEALTH_DB_TIMEOUT_MS` y `HEALTH_DEGRADED_LATENCY_MS`.

## Seguridad HTTP y limites

La API aplica headers de seguridad con Helmet y limita solicitudes por IP. Los endpoints generales usan `RATE_LIMIT_GENERAL_LIMIT` dentro de `RATE_LIMIT_GENERAL_TTL_MS`; el login usa su propia cuota mas estricta mediante `RATE_LIMIT_LOGIN_LIMIT` y `RATE_LIMIT_LOGIN_TTL_MS`.

Cuando se supera un limite, la respuesta es `429` con `code=RATE_LIMIT_EXCEEDED` y headers `X-RateLimit-*`/`Retry-After`. CORS sigue habilitado para el frontend. Si la API se despliega detras de un proxy, `TRUST_PROXY_HOPS` debe configurarse con la cantidad exacta de proxies confiables; para ejecucion directa se mantiene en `0`.

## Observabilidad

- Cada request recibe un `x-request-id`: se reutiliza el header entrante o se genera un UUID. El mismo id se devuelve en el header de respuesta y se incluye en `requestId` dentro de las respuestas de error.
- Los logs se emiten en formato JSON con `level`, `pid`, `timestamp`, `context`, `message` y `requestId`. El nivel se controla con `LOG_LEVEL`.
- Antes de escribir un log se redactan recursivamente claves y valores sensibles (`password`, `token`, `secret`, `authorization`, `apiKey`, credenciales de base y Cloudinary) como `[REDACTED]`.

## Swagger/OpenAPI

Con el servidor corriendo:

```txt
http://localhost:3000/api/v1/docs
```

Swagger incluye bearer auth para probar endpoints protegidos.

El contrato OpenAPI congelado esta versionado en `docs/openapi.json` y es la base para generar el cliente del frontend. Se regenera de forma determinista (sin conexion a la base) con:

```bash
npm run openapi:export
```

La configuracion del documento (`title`, `description`, `version`, bearer auth) vive en `src/config/swagger.config.ts`, compartida por `main.ts` y el script de exportacion. Antes de cada merge, el diff de `docs/openapi.json` debe revisarse cuando cambien endpoints o DTOs.

## Capacidades por rol

La matriz definitiva de capacidades por rol esta documentada en `docs/role-capabilities.md`:

- `canEditAnimal`: `admin`, `shelter_manager`.
- `canReadClinicalRecords`: `admin`, `veterinarian`.
- `canManageUsers`: `admin`.
- `canManageExpenses`: `admin`, `shelter_manager`.
- `canManageVets`: `admin`, `shelter_manager`.
- `canReadAudit`: `admin`.

La fuente de verdad en codigo es `ROLE_CAPABILITIES` en `src/common/authorization/role-capabilities.ts`. Los guards (`JwtAuthGuard` + `RolesGuard`) siguen siendo el unico mecanismo de autorizacion.

## Tests

Unitarios:

```bash
npm test
```

Cobertura:

```bash
npm run test:cov
```

E2E:

```bash
npm run test:e2e
```

Las pruebas de contrato HTTP usan dobles de servicios para cubrir respuestas, DTOs y guards de forma rapida. La suite `critical-flows.persistence.e2e-spec.ts` levanta automaticamente un PostgreSQL descartable, ejecuta todas las migraciones y verifica los flujos criticos completos desde HTTP hasta TypeORM. Cloudinary se reemplaza por un adaptador de prueba para evitar trafico y credenciales externas; la metadata de media se persiste realmente en PostgreSQL.

La suite `database-schema.persistence.e2e-spec.ts` valida el contrato real del schema contra PostgreSQL: enums, foreign keys con su politica `ON DELETE`, indices y uniques, constraints `CHECK` (importes y bytes no negativos), columnas comunes (UUID y soft delete) y el comportamiento real de soft delete (`deletedAt`).

Ambas suites comparten `test/utils/persistence-test-setup.ts`, que levanta una base aislada, ejecuta las migraciones y limpia todas las tablas (incluida `audit_logs`) entre tests. La base se crea y elimina en cada ejecucion, por lo que nunca se lee `DATABASE_URL` de desarrollo o produccion; la infraestructura de test rechaza explicitamente bases Neon. Docker debe estar iniciado localmente; en GitHub Actions el workflow `.github/workflows/ci.yml` ejecuta toda la verificacion sin intervencion manual.

La suite `health.e2e-spec.ts` valida los endpoints de liveness y readiness, el estado `degraded` con `200`, el estado `error` con `503` y la propagacion del `x-request-id`.

## Integracion continua

El workflow `.github/workflows/ci.yml` ejecuta en cada `push` y `pull_request`:

- `secrets`: escaneo de archivos versionados en busca de secretos.
- `lint`: ESLint sobre `src` y `test` (matriz Node 20.x y 22.x).
- `build`: compilacion NestJS (matriz Node 20.x y 22.x).
- `openapi`: reexporta `docs/openapi.json` y falla si el contrato versionado cambio sin actualizarse.
- `unit`: tests unitarios de Jest (matriz Node 20.x y 22.x).
- `migration-validate`: ejecuta todas las migraciones sobre un PostgreSQL limpio y luego `migration:show`.
- `e2e`: tests HTTP y de persistencia contra PostgreSQL (matriz Node 20.x y 22.x).
- `verify`: gate final que solo pasa si todos los jobs anteriores pasaron.

Para bloquear merges, configurar en GitHub `Settings -> Branches -> Branch protection rules` la rama principal y marcar `verify` como required status check, con `Require branches to be up to date before merging` activado. De este modo ningun cambio se integra si lint, build, unit, e2e o la validacion de migraciones fallan.

## Despliegue reproducible

El `Dockerfile` multi-stage usa Node.js 20.20.2 fijado por digest, instala dependencias con `npm ci`, compila una vez y ejecuta la API como usuario sin privilegios. La imagen incluye un `HEALTHCHECK` contra `/api/v1/health/ready`.

Las migraciones no se ejecutan al iniciar la API. El pipeline y el procedimiento operativo las ejecutan explicitamente con `npm run migration:run:prod` antes de habilitar nuevas replicas. `TYPEORM_SYNCHRONIZE` permanece desactivado en todos los ambientes.

- Variables por ambiente: `docs/environment-configuration.md`.
- Despliegue, verificacion y rollback: `docs/deployment-runbook.md`.

## Agregar un nuevo modulo

1. Crear `src/modules/<module-name>`.
2. Agregar carpetas `domain`, `application`, `infrastructure`, `interfaces`.
3. Crear entidades de dominio sin decoradores de TypeORM.
4. Crear contratos de repositorio en `domain/repositories`.
5. Crear entidades TypeORM en `infrastructure/persistence/typeorm/entities`.
6. Crear adaptadores TypeORM en `infrastructure/persistence/typeorm/repositories`.
7. Crear services/casos de uso en `application/services`.
8. Crear controllers y DTOs en `interfaces`.
9. Registrar el modulo en `AppModule`.
10. Crear `AGENTS.md` del modulo con reglas y responsabilidades.

## Siguiente etapa recomendada

- Revisar normalizacion de emails a minusculas en todos los flujos de usuarios.
- Implementar CRUD controlado de usuarios y animales.
- Agregar guards de roles en endpoints reales que todavia no los declaran.
