# Arquitectura de Refugiapp API

## 1. Proposito del documento

Este documento describe la arquitectura implementada en Refugiapp API y las decisiones que deben respetarse al agregar o modificar funcionalidades.

Su objetivo es que cualquier desarrollador o agente pueda entender:

- Como esta organizado el codigo.
- Que responsabilidad tiene cada capa.
- Como se modelan los dominios.
- Como se persisten los datos en PostgreSQL.
- Como se conecta la aplicacion con Neon.
- Que relaciones e invariantes existen.
- Como deben evolucionar las tablas mediante migraciones.

Este documento describe el estado real del proyecto. Las funcionalidades que aun no estan implementadas se identifican expresamente para no confundirlas con decisiones ya aplicadas.

## 2. Contexto tecnologico

| Area | Tecnologia | Decision |
| --- | --- | --- |
| Runtime | Node.js 20+ | Version minima soportada por el proyecto |
| Framework HTTP | NestJS 11 | Modulos, controllers, providers e inyeccion de dependencias |
| Lenguaje | TypeScript | Codigo fuente tipado |
| Persistencia | PostgreSQL | Motor relacional objetivo |
| Proveedor cloud | Neon | Base remota de desarrollo y produccion |
| ORM | TypeORM | Solo en infrastructure y configuracion comun |
| IDs | UUID | Todos los identificadores principales |
| Autenticacion | JWT + Passport | Login real mediante email, password hasheado y JWT |
| Archivos | Cloudinary | PostgreSQL almacena metadata, no binarios |
| Validacion | class-validator + Joi | DTOs HTTP y variables de entorno |
| Testing | Jest + Supertest | Tests unitarios y e2e |

## 3. Principios arquitectonicos

### 3.1 Separacion por dominio

Cada dominio vive dentro de `src/modules/<domain>` y se divide en cuatro capas:

```text
domain/
application/
infrastructure/
interfaces/
```

La dependencia debe apuntar hacia el centro del dominio:

```text
interfaces -> application -> domain
infrastructure -> application/domain
```

El dominio no debe conocer NestJS, TypeORM, Cloudinary, PostgreSQL ni HTTP.

### 3.2 Persistencia aislada

Las entidades de negocio y los contratos de repositorio no deben importar clases ORM. Las clases `*.orm-entity.ts` son modelos exclusivos de persistencia y viven en `infrastructure`.

Los repositorios se declaran como contratos en `domain/repositories` y se implementan con TypeORM en `infrastructure/persistence/typeorm/repositories`.

### 3.3 Controllers delgados

Los controllers solo deben:

1. Recibir y validar la entrada HTTP.
2. Obtener el usuario autenticado cuando corresponda.
3. Invocar un caso de uso o servicio de aplicacion.
4. Transformar el resultado en una respuesta HTTP.

No deben contener reglas de negocio, consultas SQL ni logica de Cloudinary.

### 3.4 Migraciones como fuente de verdad

`TYPEORM_SYNCHRONIZE` debe permanecer desactivado. Todo cambio de schema debe realizarse mediante una migracion versionada.

```env
TYPEORM_SYNCHRONIZE=false
```

Nunca se debe corregir una tabla manualmente en Neon y dejar el codigo sin una migracion equivalente.

## 4. Estructura del proyecto

```text
src/
  common/
    decorators/
    entities/
    enums/
    exceptions/
    filters/
    guards/
    interfaces/
  config/
    app.config.ts
    cloudinary.config.ts
    database.config.ts
    jwt.config.ts
    typeorm.config.ts
    typeorm.datasource.ts
    validation.schema.ts
  database/
    migrations/
  modules/
    auth/
    users/
    animals/
    medical-records/
    veterinarians/
    expenses/
    media/
    audit-logs/
    health/
  app.controller.ts
  app.module.ts
  main.ts
test/
```

Cada modulo de negocio mantiene la siguiente estructura:

```text
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
```

## 5. Responsabilidad de los modulos

### `auth`

Gestiona la autenticacion JWT, la estrategia Passport, los guards y la emision de tokens.

No persiste usuarios directamente. La validacion de credenciales delega en `UsersService` y en el contrato de repositorio de usuarios.

El payload JWT minimo definido es:

```text
sub, email, roles
```

### `users`

Gestiona la identidad y el acceso de usuarios internos del refugio.

Responsabilidades:

- Email de login.
- Hash de password.
- Nombre y apellido.
- Roles.
- Activacion y baja logica.

`passwordHash` pertenece a persistencia y nunca debe exponerse en respuestas HTTP.

### 5.1 Matriz de autorizacion por roles

Los endpoints privados deben combinar `JwtAuthGuard` y `RolesGuard` mediante `@UseGuards`. Los permisos declarativos se indican con `@Roles`; no deben implementarse comprobaciones de roles dentro de los controllers.

`JwtAuthGuard` rechaza solicitudes sin autenticacion valida con `401`. `RolesGuard` rechaza usuarios autenticados sin el permiso requerido con `403`.

| Endpoint | `admin` | `shelter_manager` | `veterinarian` |
| --- | --- | --- | --- |
| `POST /users` | Permitido | Rechazado | Rechazado |
| `POST /users/:id/deactivate` | Permitido | Rechazado | Rechazado |
| `POST /users/:id/activate` | Permitido | Rechazado | Rechazado |
| `GET /users/me` | Permitido | Permitido | Permitido |
| `POST /animals` | Permitido | Permitido | Rechazado |
| `GET /animals` | Permitido | Permitido | Permitido |
| `GET /animals/:id` | Permitido | Permitido | Permitido |
| `PATCH /animals/:id/status` | Permitido | Permitido | Rechazado |
| `POST /animals/:animalId/events` | Permitido | Permitido | Rechazado |
| `GET /animals/:animalId/events` | Permitido | Permitido | Permitido |
| `POST /veterinarians` | Permitido | Permitido | Rechazado |
| `GET /veterinarians` | Permitido | Permitido | Permitido |
| `GET /veterinarians/:id` | Permitido | Permitido | Permitido |
| `PATCH /veterinarians/:id` | Permitido | Permitido | Rechazado |
| `POST /veterinarians/:id/deactivate` | Permitido | Permitido | Rechazado |
| `POST /medical-records` | Permitido | Rechazado | Permitido |
| `PATCH /medical-records/:id` | Permitido | Rechazado | Permitido |
| `DELETE /medical-records/:id` | Permitido | Rechazado | Permitido |
| `POST /medical-records/:id/restore` | Permitido | Rechazado | Rechazado |
| `GET /animals/:animalId/medical-records` | Permitido | Rechazado | Permitido |
| `POST /expenses` | Permitido | Permitido | Rechazado |
| `GET /expenses` | Permitido | Permitido | Permitido |
| `GET /expenses/:id` | Permitido | Permitido | Permitido |
| `DELETE /expenses/:id` | Permitido | Permitido | Rechazado |
| `GET /animals/:animalId/expenses` | Permitido | Permitido | Permitido |
| `POST /media/upload` | Permitido | Permitido | Permitido |
| `GET /media` | Permitido | Permitido | Permitido |
| `GET /media/:id` | Permitido | Permitido | Permitido |
| `DELETE /media/:id` | Permitido | Permitido | Permitido |
| `GET /audit-logs` | Permitido | Rechazado | Rechazado |
| `GET /audit-logs/:id` | Permitido | Rechazado | Rechazado |

En `media`, el rol `veterinarian` puede subir y borrar assets, pero restringido a adjuntos clinicos (`ownerType=medical_record`) o assets huerfanos al subir; los roles `admin` y `shelter_manager` pueden operar cualquier asset.

`POST /auth/login` es publico porque es el punto de entrada para obtener un token. Los modulos sin endpoints HTTP implementados heredaran esta politica cuando sus controllers sean agregados.

### `animals`

Gestiona la ficha general del animal y su historial no clinico.

No debe almacenar diagnosticos ni tratamientos. Esa informacion pertenece a `medical-records`.

La creacion se realiza mediante `POST /animals`. El caso de uso valida nombre, especie, sexo, estado y fecha de ingreso, valida la existencia de la foto de perfil en `media_assets` cuando se informa y persiste en una misma transaccion el animal y un evento automatico de ingreso (`intake`) asociado al usuario creador autenticado. No almacena datos clinicos.

La consulta de animales se realiza mediante `GET /animals` y `GET /animals/:id`. El listado usa paginacion con `page` minimo 1, `limit` entre 1 y 100 y valores por defecto 1 y 20. Admite filtros combinables por `status`, `species`, `sex` y busqueda parcial por `name`.

El orden es estable y determinista: `createdAt ASC` y `id ASC` como desempate. TypeORM excluye por defecto los registros con `deletedAt`; las consultas no deben usar `withDeleted`.

El cambio de estado se realiza mediante `PATCH /animals/:id/status`. El caso de uso valida la transicion contra una matriz acotada de movimientos permitidos y rechaza con `409` las transiciones invalidas o al mismo estado. Cada cambio persiste un evento `status_change` en la misma transaccion, con `metadata {from, to}` y el `createdByUserId` del actor autenticado.

Transiciones permitidas:

```text
admitted           → under_treatment | available_for_adoption | deceased
under_treatment    → admitted | available_for_adoption | deceased
available_for_adoption → under_treatment | adopted | deceased
adopted            → (terminal)
deceased           → (terminal)
```

Los eventos generales se gestionan mediante `POST /animals/:animalId/events` y `GET /animals/:animalId/events`. Los tipos creables manualmente son `general_note`, `behavior_note` y `transfer`. Los tipos `intake`, `status_change` y `adoption` estan reservados al sistema. La fecha del evento (`occurredAt`) es opcional y defaultea al momento del request; se rechazan fechas futuras y anteriores a `intakeDate`. El listado usa paginacion (1..100, default 20), filtro por `eventType` y orden `occurredAt DESC, id DESC`.

Los datos clinicos (diagnosticos, tratamientos, vacunas) pertenecen exclusivamente a `medical-records` y no deben registrarse en eventos generales.

### `medical-records`

Gestiona consultas, vacunas, desparasitaciones, cirugias, tratamientos y otros registros clinicos.

Cada registro debe pertenecer a un animal. El veterinario responsable es opcional.

La creacion se realiza mediante `POST /medical-records`. El caso de uso valida que el animal exista y, cuando se informa `veterinarianId`, que el veterinario exista y este activo (`isActive=true`); si el veterinario esta desactivado responde `409 VETERINARIAN_INACTIVE`. Valida `recordType` contra el enum, `title` (3..160 caracteres) y `occurredAt` como fecha requerida que no puede ser futura ni anterior al `intakeDate` del animal.

Los adjuntos clinicos se gestionan mediante `media_assets` con `ownerType=medical_record`. Cuando se informan `attachmentMediaIds`, el caso de uso valida la existencia de cada asset (404 si no existe) y los vincula al registro creado en la misma transaccion actualizando `ownerType` y `ownerId` en `media_assets`.

La persistencia del registro y la vinculacion de adjuntos ocurren dentro de una misma transaccion. No se persiste el actor que creo el registro (no existe columna `createdByUserId` en `medical_records`).

La consulta de la evolucion clinica se realiza mediante `GET /animals/:animalId/medical-records`. Requiere JWT y admite solo `admin` y `veterinarian`. El caso de uso valida que el animal exista antes de listar y la consulta siempre filtra por `animalId`, con paginacion segura (`page` minimo 1, `limit` entre 1 y 100, default 20), filtros opcionales por `recordType`, `from` y `to`, y orden `occurredAt DESC, id DESC`.

### `veterinarians`

Gestiona el perfil profesional del veterinario: matricula, datos de contacto, notas y estado.

No contiene credenciales. Cuando corresponde, se vincula opcionalmente con `users` mediante `userId`.

La administracion se realiza mediante `POST /veterinarians`, `GET /veterinarians`, `GET /veterinarians/:id`, `PATCH /veterinarians/:id` y `POST /veterinarians/:id/deactivate`. El listado usa paginacion con `page` minimo 1, `limit` entre 1 y 100 y valores por defecto 1 y 20. Admite filtros por `name`, `licenseNumber` e `isActive`; por defecto lista veterinarios activos.

La desactivacion no borra ni aplica soft delete. Solo actualiza `isActive=false` para conservar la vinculacion historica desde `medical_records`.

### `expenses`

Gestiona gastos asociados a animales. Los importes se almacenan en centavos como `integer` para evitar errores de punto flotante.

Los comprobantes se almacenan como metadata de `media-assets` y se referencian mediante `ticketMediaId`.

La creacion se realiza mediante `POST /expenses`. El caso de uso valida que el animal exista y, cuando se informa `ticketMediaId`, que el asset exista en `media_assets`. Persiste `createdByUserId` con el id del usuario autenticado y normaliza `currency` y `description` con trim. `amountCents` se valida como entero no negativo en DTO, dominio y PostgreSQL.

La consulta se realiza mediante `GET /expenses` (listado global) y `GET /animals/:animalId/expenses` (listado por animal). Ambos usan paginacion con `page` minimo 1, `limit` entre 1 y 100 y valores por defecto 1 y 20. El listado global admite filtros por `animalId`, `category` y rango de fechas `from`/`to` sobre `incurredAt`. El listado por animal valida que el animal exista y siempre filtra por `animalId`. El orden es `incurredAt DESC, id DESC`.

La baja logica se realiza mediante `DELETE /expenses/:id` aplicando `deletedAt`. La escritura (creacion y baja) admite solo `admin` y `shelter_manager`; la lectura admite los tres roles autenticados.

### `media`

Gestiona metadata de archivos almacenados en Cloudinary.

PostgreSQL no almacena binarios. La base conserva identificadores, URL segura, formato, tamano, propietario y metadata adicional.

La subida se realiza mediante `POST /media/upload`. El caso de uso valida que `ownerType` y `ownerId` se informen juntos o se omitan; si se informan, valida que el propietario exista (404) contra el repositorio del dominio correspondiente. Si se omiten, el asset se guarda como huerfano y puede vincularse luego. Valida mimetype y tamano (maximo 10MB), sube el archivo a Cloudinary y, si falla la persistencia en PostgreSQL, compensa borrando el recurso remoto.

La vinculacion polimorfica se controla en `domain/services/media-owner-policy.ts`:

- Tickets (`expense_ticket`) solo asociados a gastos.
- Fotos de perfil (`animal`) solo asociadas a animales.
- Adjuntos clinicos (`medical_record`) solo asociados a registros medicos.

Cada vinculo valida en la capa de aplicacion que el asset sea huerfano o del tipo esperado. Un asset huerfano se re-asigna en la misma transaccion que crea la entidad (`expenses`, `animals` o `medical-records`); un asset ya asignado a otra entidad se rechaza con `409` y un tipo incompatible tambien con `409`.

La consulta de assets por propietario se realiza mediante `GET /media?ownerType=&ownerId=`. El caso de uso valida que el propietario exista (404) y pagina con `page` minimo 1, `limit` entre 1 y 100 (default 20) y orden `createdAt DESC, id DESC`, excluyendo soft-deleted.

La baja logica se realiza mediante `DELETE /media/:id` aplicando `deletedAt` y luego intenta eliminar el archivo remoto en Cloudinary. Si la limpieza remota falla, se loguea el error y el registro permanece oculto por `deletedAt`.

Los roles `admin` y `shelter_manager` pueden subir, listar y borrar cualquier asset. El rol `veterinarian` puede subir adjuntos clinicos (o huerfanos) y borrar solo assets de `medical_record`.

### `audit-logs`

Gestiona la auditoria transversal de operaciones sensibles.

Registra quien realizo un cambio relevante, sobre que recurso y cuando, cubriendo usuarios, roles, registros clinicos, gastos, inicios de sesion y denegaciones de acceso. La tabla `audit_logs` es append-only: no existen endpoints de escritura, edicion ni borrado.

La escritura se realiza internamente mediante `AuditLogsService.record` desde los casos de uso de cada dominio, despues de completar la operacion. Cada evento almacena `actorUserId` (nullable), `action`, `resourceType`, `resourceId` (nullable), `occurredAt` y `metadata`.

Acciones registradas:

```text
user.create, user.deactivate, user.activate, user.role_assign
medical_record.create, medical_record.update, medical_record.soft_delete, medical_record.restore
expense.create, expense.soft_delete
auth.login_success, auth.login_failure
access.denied
```

Los `403` emitidos por `RolesGuard` se auditan globalmente mediante `AuditForbiddenFilter`, registrados desde `main.ts`. El filtro nunca interrumpe la respuesta HTTP si la auditoria falla.

Seguridad de datos: `metadata` nunca almacena passwords, tokens ni secretos. La funcion `sanitizeAuditMetadata` redacta de forma recursiva claves sensibles (`password`, `passwordHash`, `token`, `secret`, `apiKey`, `authorization`, `credential`, etc.) reemplazando el valor por `[REDACTED]`.

La consulta se realiza mediante `GET /audit-logs` y `GET /audit-logs/:id`. Requiere JWT y admite solo `admin`. El listado usa paginacion (`page` minimo 1, `limit` entre 1 y 100, default 20), filtros opcionales por `action`, `resourceType`, `resourceId`, `actorUserId` y rango `from`/`to` sobre `occurredAt`, con orden `occurredAt DESC, id DESC`.

Retencion: la constante de dominio `AUDIT_LOG_RETENTION_DAYS` define 730 dias. La purga fisica se ejecuta con `npm run audit:purge`, que invoca `AuditLogsService.purgeExpired`.

### `health`

Expone health checks para orquestadores y balanceadores. Usa `@nestjs/terminus` (version CommonJS) para el decorador `@HealthCheck()` y la documentacion Swagger.

- `GET /health` (liveness): responde `200` mientras el proceso este vivo. No consulta dependencias externas.
- `GET /health/ready` (readiness): comprueba la aplicacion y la conexion a PostgreSQL mediante `SELECT 1`. Responde `200` con estado `ok`, `200` con estado `degraded` cuando la base responde pero supera `HEALTH_DEGRADED_LATENCY_MS`, o `503` con estado `error` cuando la base no responde.

Los estados por componente son `up`, `degraded` y `down`; el estado global es `ok`, `degraded` o `error`. El chequeo de base de datos vive en `infrastructure` porque usa `DataSource`; el agregado vive en `application`. Los endpoints son publicos y no exponen secretos ni URLs de conexion.

### Observabilidad

- `CorrelationIdMiddleware` (`src/common/middleware`) lee o genera `x-request-id`, lo guarda en `AsyncLocalStorage` (`src/common/storage/request-context.ts`) y lo devuelve en el header de respuesta.
- `JsonLoggerService` (`src/common/logger`) emite logs en JSON con `level`, `pid`, `timestamp`, `context`, `message` y `requestId`. Se registra en `main.ts` como logger global de Nest.
- `sanitizeLogValue` redacta recursivamente claves y valores sensibles (`password`, `token`, `secret`, `authorization`, `apiKey`, credenciales de base y Cloudinary) como `[REDACTED]`.
- `HttpLoggingInterceptor` registra cada request con metodo, ruta, `statusCode` y `durationMs`.
- `HttpExceptionFilter` agrega `requestId` a la respuesta de error y loguea `4xx` como `warn` y `5xx` como `error`, sin exponer detalles internos al cliente.
- El nivel de log se controla con `LOG_LEVEL`.

## 6. Modelo de datos

### 6.1 Convenciones comunes

Todas las tablas de dominio heredan conceptualmente las columnas de `BaseOrmEntity`:

| Columna | Tipo PostgreSQL | Regla |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generado por PostgreSQL |
| `createdAt` | `timestamptz` | Fecha de creacion |
| `updatedAt` | `timestamptz` | Fecha de ultima actualizacion |
| `deletedAt` | `timestamptz`, nullable | Baja logica |

La aplicacion debe tratar `deletedAt IS NULL` como registro activo, salvo que un caso de uso solicite explicitamente elementos eliminados.

### 6.2 `users`

Representa una persona con acceso al sistema.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `email` | `varchar(320)` | No | Unico |
| `passwordHash` | `varchar(255)` | No | Nunca se expone |
| `firstName` | `varchar(100)` | No | |
| `lastName` | `varchar(100)` | No | |
| `roles` | `user_role[]` | No | Default `shelter_manager` |
| `isActive` | `boolean` | No | Default `true` |
| columnas comunes | | | `createdAt`, `updatedAt`, `deletedAt` |

Enum `user_role`:

```text
admin
shelter_manager
veterinarian
```

Decision: los roles se almacenan como un array enum porque un usuario puede tener mas de un rol. El enum centralizado en codigo es `UserRole`.

### 6.3 `veterinarians`

Representa el perfil profesional, separado de la identidad de login.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `userId` | `uuid` | Si | FK a `users.id`, unico cuando existe |
| `firstName` | `varchar(100)` | No | |
| `lastName` | `varchar(100)` | No | |
| `licenseNumber` | `varchar(80)` | No | Unico |
| `email` | `varchar(320)` | Si | Contacto profesional |
| `phone` | `varchar(40)` | Si | |
| `notes` | `text` | Si | |
| `isActive` | `boolean` | No | Default `true` |
| columnas comunes | | | |

La relacion `userId` es opcional porque un veterinario puede existir como contacto profesional sin tener acceso al sistema.

No se almacenan passwords ni hashes en este modulo. Las credenciales pertenecen a `users`.

### 6.4 `animals`

Representa la ficha principal del animal.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `name` | `varchar(120)` | No | |
| `species` | `varchar(80)` | No | Ejemplos: `dog`, `cat` |
| `breed` | `varchar(80)` | Si | Raza, cuando se conoce |
| `sex` | `animal_sex` | No | Default `unknown` |
| `status` | `animal_status` | No | Default `admitted` |
| `birthDate` | `date` | Si | Fecha real o estimada |
| `intakeDate` | `date` | No | |
| `profilePhotoMediaId` | `uuid` | Si | FK a `media_assets.id` |
| `notes` | `text` | Si | |
| columnas comunes | | | |

Regla de fechas: si `birthDate` esta presente, no puede ser posterior a `intakeDate`.

Enum `animal_sex`:

```text
female
male
unknown
```

Enum `animal_status`:

```text
admitted
under_treatment
available_for_adoption
adopted
deceased
```

### 6.5 `animal_history_events`

Registra eventos generales del animal, no informacion clinica.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `animalId` | `uuid` | No | FK a `animals.id` |
| `eventType` | `animal_history_event_type` | No | |
| `description` | `text` | No | |
| `occurredAt` | `timestamptz` | No | Fecha del hecho |
| `createdByUserId` | `uuid` | Si | FK a `users.id` |
| `metadata` | `jsonb` | No | Default `{}` |
| columnas comunes | | | |

Enum `animal_history_event_type`:

```text
intake
transfer
status_change
behavior_note
adoption
general_note
```

### 6.6 `medical_records`

Registra informacion clinica del animal.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `animalId` | `uuid` | No | FK a `animals.id` |
| `veterinarianId` | `uuid` | Si | FK a `veterinarians.id` |
| `recordType` | `medical_record_type` | No | |
| `title` | `varchar(160)` | No | |
| `diagnosis` | `text` | Si | |
| `treatment` | `text` | Si | |
| `notes` | `text` | Si | |
| `occurredAt` | `timestamptz` | No | Fecha de atencion |
| columnas comunes | | | |

Enum `medical_record_type`:

```text
consultation
vaccination
deworming
surgery
lab_result
treatment
other
```

Los adjuntos clinicos no son columnas de esta tabla. Se asocian mediante `media_assets` usando `ownerType = medical_record` y `ownerId = medical_records.id`.

### 6.7 `medical_record_changes`

Registra trazabilidad de cambios sensibles sobre registros clinicos.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `medicalRecordId` | `uuid` | No | FK a `medical_records.id` |
| `changedByUserId` | `uuid` | Si | FK a `users.id` |
| `changeType` | `medical_record_change_type` | No | |
| `previousValues` | `jsonb` | No | Default `{}` |
| `changedAt` | `timestamptz` | No | Fecha del cambio |
| columnas comunes | | | `createdAt`, `updatedAt`, `deletedAt` |

Enum `medical_record_change_type`:

```text
update
soft_delete
restore
```

### 6.8 `expenses`

Representa un gasto asociado a un animal.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `animalId` | `uuid` | No | FK a `animals.id` |
| `category` | `expense_category` | No | |
| `amountCents` | `integer` | No | Importe en centavos, `CHECK amountCents >= 0` |
| `currency` | `char(3)` | No | Default `ARS` |
| `description` | `varchar(180)` | No | |
| `ticketMediaId` | `uuid` | Si | FK a `media_assets.id` |
| `createdByUserId` | `uuid` | Si | FK a `users.id` |
| `incurredAt` | `timestamptz` | No | Fecha del gasto |
| columnas comunes | | | |

Enum `expense_category`:

```text
food
medicine
veterinary
supplies
transport
other
```

### 6.9 `media_assets`

Representa un recurso almacenado externamente en Cloudinary.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `ownerType` | `media_owner_type` | Si | Tipo de propietario polimorfico; `null` solo para assets huerfanos |
| `ownerId` | `uuid` | Si | ID del propietario polimorfico; `null` solo para assets huerfanos |
| `resourceType` | `media_resource_type` | No | Default `image` |
| `cloudinaryPublicId` | `varchar(255)` | No | Unico |
| `secureUrl` | `varchar(2048)` | No | URL HTTPS |
| `format` | `varchar(40)` | Si | |
| `bytes` | `integer` | Si | Tamano del recurso, `CHECK bytes IS NULL OR bytes >= 0` |
| `uploadedByUserId` | `uuid` | Si | FK a `users.id` |
| `metadata` | `jsonb` | No | Default `{}` |
| columnas comunes | | | |

Enum `media_owner_type`:

```text
animal
expense_ticket
medical_record
user
veterinarian
```

Enum `media_resource_type`:

```text
image
video
raw
```

### 6.10 `audit_logs`

Registra eventos de auditoria de operaciones sensibles. Es append-only.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `actorUserId` | `uuid` | Si | FK a `users.id` |
| `action` | `audit_action` | No | |
| `resourceType` | `audit_resource_type` | No | |
| `resourceId` | `uuid` | Si | ID del recurso afectado; sin FK por ser polimorfico |
| `occurredAt` | `timestamptz` | No | Timestamp del hecho |
| `metadata` | `jsonb` | No | Default `{}`; sin secretos |
| columnas comunes | | | `createdAt`, `updatedAt`, `deletedAt` (siempre `NULL`) |

Enum `audit_action`:

```text
user.create
user.deactivate
user.activate
user.role_assign
medical_record.create
medical_record.update
medical_record.soft_delete
medical_record.restore
expense.create
expense.soft_delete
auth.login_success
auth.login_failure
access.denied
```

Enum `audit_resource_type`:

```text
user
medical_record
expense
auth_session
authorization
```

## 7. Diagrama entidad-relacion

El siguiente DER representa las foreign keys reales de PostgreSQL. La relacion polimorfica de `media_assets` se muestra separadamente porque `ownerId` no puede tener una foreign key a varias tablas al mismo tiempo.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar passwordHash
        varchar firstName
        varchar lastName
        user_role_array roles
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    VETERINARIANS {
        uuid id PK
        uuid userId FK,UK
        varchar firstName
        varchar lastName
        varchar licenseNumber UK
        varchar email
        varchar phone
        text notes
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    ANIMALS {
        uuid id PK
        varchar name
        varchar species
        varchar breed
        animal_sex sex
        animal_status status
        date birthDate
        date intakeDate
        uuid profilePhotoMediaId FK
        text notes
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    ANIMAL_HISTORY_EVENTS {
        uuid id PK
        uuid animalId FK
        animal_history_event_type eventType
        text description
        timestamptz occurredAt
        uuid createdByUserId FK
        jsonb metadata
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    MEDICAL_RECORDS {
        uuid id PK
        uuid animalId FK
        uuid veterinarianId FK
        medical_record_type recordType
        varchar title
        text diagnosis
        text treatment
        text notes
        timestamptz occurredAt
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    MEDICAL_RECORD_CHANGES {
        uuid id PK
        uuid medicalRecordId FK
        uuid changedByUserId FK
        medical_record_change_type changeType
        jsonb previousValues
        timestamptz changedAt
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    EXPENSES {
        uuid id PK
        uuid animalId FK
        expense_category category
        integer amountCents
        char currency
        varchar description
        uuid ticketMediaId FK
        uuid createdByUserId FK
        timestamptz incurredAt
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    MEDIA_ASSETS {
        uuid id PK
        media_owner_type ownerType
        uuid ownerId
        media_resource_type resourceType
        varchar cloudinaryPublicId UK
        varchar secureUrl
        varchar format
        integer bytes
        uuid uploadedByUserId FK
        jsonb metadata
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actorUserId FK
        audit_action action
        audit_resource_type resourceType
        uuid resourceId
        timestamptz occurredAt
        jsonb metadata
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz deletedAt
    }

    USERS ||--o| VETERINARIANS : "may have professional profile"
    USERS ||--o{ ANIMAL_HISTORY_EVENTS : "creates"
    USERS ||--o{ EXPENSES : "registers"
    USERS ||--o{ MEDIA_ASSETS : "uploads"
    ANIMALS ||--o{ ANIMAL_HISTORY_EVENTS : "has events"
    ANIMALS ||--o{ MEDICAL_RECORDS : "has clinical records"
    ANIMALS ||--o{ EXPENSES : "has expenses"
    MEDIA_ASSETS ||--o{ ANIMALS : "is profile photo"
    MEDIA_ASSETS ||--o{ EXPENSES : "is ticket"
    VETERINARIANS ||--o{ MEDICAL_RECORDS : "is responsible"
    MEDICAL_RECORDS ||--o{ MEDICAL_RECORD_CHANGES : "has changes"
    USERS ||--o{ MEDICAL_RECORD_CHANGES : "changes"
    USERS ||--o{ AUDIT_LOGS : "performs"
```

### Relacion polimorfica de media

Ademas de las relaciones directas del DER, `media_assets` puede apuntar a:

```text
(ownerType = animal, ownerId = animals.id)
(ownerType = expense_ticket, ownerId = expenses.id)
(ownerType = medical_record, ownerId = medical_records.id)
(ownerType = user, ownerId = users.id)
(ownerType = veterinarian, ownerId = veterinarians.id)
(ownerType = null, ownerId = null)  // asset huerfano, se vincula despues
```

Esta relacion se valida en el servicio de aplicacion. No debe confiarse unicamente en `ownerType` recibido desde HTTP.

## 8. Foreign keys y politica de borrado

Las relaciones implementadas en la migracion inicial son:

| Tabla | Columna | Referencia | `ON DELETE` |
| --- | --- | --- | --- |
| `veterinarians` | `userId` | `users.id` | `SET NULL` |
| `animal_history_events` | `animalId` | `animals.id` | `RESTRICT` |
| `animal_history_events` | `createdByUserId` | `users.id` | `SET NULL` |
| `medical_records` | `animalId` | `animals.id` | `RESTRICT` |
| `medical_records` | `veterinarianId` | `veterinarians.id` | `SET NULL` |
| `medical_record_changes` | `medicalRecordId` | `medical_records.id` | `RESTRICT` |
| `medical_record_changes` | `changedByUserId` | `users.id` | `SET NULL` |
| `expenses` | `animalId` | `animals.id` | `RESTRICT` |
| `expenses` | `ticketMediaId` | `media_assets.id` | `SET NULL` |
| `expenses` | `createdByUserId` | `users.id` | `SET NULL` |
| `animals` | `profilePhotoMediaId` | `media_assets.id` | `SET NULL` |
| `media_assets` | `uploadedByUserId` | `users.id` | `SET NULL` |
| `audit_logs` | `actorUserId` | `users.id` | `SET NULL` |

La politica evita perder historial clinico, eventos o gastos por borrar accidentalmente un animal. La baja normal debe realizarse mediante `deletedAt`.

## 9. Indices y unicidad

La migracion inicial crea:

- Indice unico en `users.email`.
- Indice unico en `veterinarians.licenseNumber`.
- Indice unico en `veterinarians.userId`.
- Indice en `animals.status`.
- Indice en `animal_history_events.animalId`.
- Indice en `animal_history_events.occurredAt`.
- Indice en `medical_records.animalId`.
- Indice en `medical_records.occurredAt`.
- Indice en `medical_record_changes.medicalRecordId`.
- Indice en `medical_record_changes.changedAt`.
- Indice en `expenses.animalId`.
- Indice en `expenses.incurredAt`.
- Indice compuesto en `media_assets.ownerType, ownerId`.
- Indice unico en `media_assets.cloudinaryPublicId`.
- Indice en `audit_logs.action`.
- Indice en `audit_logs.occurredAt`.
- Indice en `audit_logs.actorUserId`.
- Indice compuesto en `audit_logs.resourceType, resourceId`.

Los indices nuevos deben justificarse por consultas reales o por una restriccion de integridad. No agregar indices indiscriminadamente.

## 10. PostgreSQL y Neon

La aplicacion usa `DATABASE_URL` como unica fuente de conexion.

Configuracion esperada:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_SIZE=10
TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=false
```

Neon crea una base remota. La aplicacion no necesita una instalacion local de PostgreSQL para funcionar.

El nombre actual de la base conectada es `neondb`. La rama, host y base seleccionados en la consola de Neon deben coincidir con la URL configurada en `.env`.

### Conexion de aplicacion

`src/config/typeorm.config.ts` configura:

- Driver `postgres`.
- URL desde `database.url`.
- Carga automatica de entidades.
- SSL habilitado por defecto.
- Pool configurable.
- Migraciones en `src/database/migrations`.

### Conexion de CLI

`src/config/typeorm.datasource.ts` se usa por los comandos de TypeORM. Tiene `synchronize: false` de forma fija para evitar cambios automaticos durante migraciones.

## 11. Flujo de migraciones

Scripts disponibles:

```bash
npm run migration:generate -- src/database/migrations/FeatureName
npm run migration:run
npm run migration:show
npm run migration:revert
```

Flujo obligatorio:

1. Modificar la entidad ORM y, si corresponde, la entidad de dominio.
2. Generar una migracion con un nombre descriptivo.
3. Revisar el SQL generado manualmente.
4. Confirmar que no haya `DROP` inesperados.
5. Ejecutar la migracion en development.
6. Verificar tablas, indices, enums y foreign keys.
7. Ejecutar build, lint y tests.
8. Versionar codigo y migracion juntos.

La migracion inicial ejecutada es:

```text
src/database/migrations/1787781241921-InitSchema.ts
Clase: InitSchema1787781241921
```

La migracion `1787000000000-EnableUuidOsspExtension.ts` se ordena antes de la inicial y habilita de forma idempotente `uuid-ossp`, requerido por los defaults `uuid_generate_v4()` al crear un schema vacio. Su `down` conserva la extension porque otras tablas o schemas de la misma base pueden depender de ella.

La migracion `1789300000000-AllowOrphanMediaAssets.ts` permite assets huerfanos haciendo nullable `ownerType` y `ownerId` en `media_assets`.

La migracion `1789399460070-AddAuditLogs.ts` crea los enums `audit_action` y `audit_resource_type`, la tabla `audit_logs` (append-only) y sus indices y foreign key a `users`.

No se deben editar migraciones que ya fueron ejecutadas en un entorno compartido. Los cambios posteriores deben agregarse en una nueva migracion.

## 12. Seguridad de datos

- Nunca guardar passwords en texto plano.
- Aplicar hashing bcrypt antes de persistir `passwordHash`.
- Usar la politica centralizada de passwords: longitud minima de 12 caracteres y bcrypt cost factor 12.
- Comparar passwords solo mediante el helper seguro de hashing; no comparar strings de password ni hashes manualmente.
- Nunca incluir `passwordHash` en DTOs de respuesta.
- No imprimir `DATABASE_URL`, `JWT_SECRET` ni secretos de Cloudinary en logs.
- No copiar secretos reales en documentacion, issues de Jira, comentarios, descripciones de PR ni ejemplos versionados.
- Mantener secretos solo en `.env` local o en el gestor de secretos del proveedor.
- Validar roles mediante `UserRole` y guards reutilizables.
- Proteger escritura de datos clinicos y financieros con roles adecuados.
- Validar existencia y pertenencia de `ownerId` para assets polimorficos.

## 13. Datos monetarios y archivos

### Dinero

Los importes se almacenan como enteros:

```text
amountCents = 1250
currency = ARS
```

Esto representa ARS 12,50 si la moneda utiliza dos decimales. La conversion y el formateo pertenecen a la capa de presentacion, no a PostgreSQL.

La validacion `amountCents >= 0` se aplica en DTO, dominio y PostgreSQL mediante `CHECK`. Los gastos negativos no estan permitidos.

### Cloudinary

PostgreSQL conserva metadata. Cloudinary conserva el archivo.

El flujo esperado es:

1. Validar usuario y propietario (o permitir asset huerfano).
2. Subir archivo a Cloudinary mediante `media`.
3. Obtener `public_id`, URL, formato y tamano.
4. Persistir `MediaAsset`.
5. Vincular el asset con la entidad correspondiente, validando compatibilidad y re-asignando `ownerType`/`ownerId` en la misma transaccion cuando la entidad se crea.

Si falla la persistencia despues de subir el archivo, el caso de uso debe contemplar compensacion o limpieza del recurso remoto.

La baja de un asset aplica `deletedAt` y luego intenta eliminar el archivo remoto; si la limpieza remota falla, se loguea el error.

## 14. Estado implementado y pendientes conocidos

### Implementado

- Arquitectura modular por dominio.
- Entidades de dominio y ORM separadas.
- UUID para primary keys.
- Soft delete comun.
- Enums PostgreSQL.
- Tipo clinico `deworming` en el enum `medical_record_type`.
- Campo opcional `breed` en animales mediante migracion posterior a la inicial.
- Checks de integridad para `expenses.amountCents >= 0` y `media_assets.bytes IS NULL OR bytes >= 0` mediante migracion posterior a la inicial.
- Relaciones ORM principales.
- Foreign keys de la migracion inicial.
- Neon configurado mediante `DATABASE_URL`.
- SSL para PostgreSQL.
- `synchronize=false`.
- Migracion inicial ejecutada en Neon.
- Metadata de Cloudinary separada de los binarios.
- JWT y roles preparados.
- Login real mediante email, password hasheado y JWT.
- Creacion de animales (`POST /animals`) con evento automatico de ingreso transaccional, validacion de foto de perfil contra `media_assets` y escritura protegida por roles.
- Listado y consulta de animales con paginacion, filtros, orden estable y exclusion de soft-delete.
- Cambio de estado de animales con validacion de transiciones, evento `status_change` transaccional con metadata y proteccion por roles.
- Creacion y listado de eventos generales por animal con paginacion, filtro por tipo, orden cronologico inverso y proteccion por roles.
- CRUD de perfiles profesionales de veterinarios, con matricula unica, `userId` opcional, escritura protegida por roles y desactivacion por `isActive=false`.
- Creacion de registros medicos (`POST /medical-records`) con validacion de animal, veterinario opcional (activo), fecha con limites, adjuntos vinculados transaccionalmente via `media_assets` y proteccion por roles.
- Consulta de evolucion clinica por animal (`GET /animals/:animalId/medical-records`) con filtros por tipo y rango de fechas, paginacion segura, orden cronologico inverso y proteccion por roles.
- Consulta global de registros medicos (`GET /medical-records`) y consulta por id (`GET /medical-records/:id`) con proteccion por roles y `404` para recursos inexistentes.
- Actualizacion parcial de registros medicos (`PATCH /medical-records/:id`) con validacion de campos, veterinario opcional (activo), fecha con limites, proteccion por roles y trazabilidad mediante `medical_record_changes`.
- Baja logica de registros medicos (`DELETE /medical-records/:id`) con proteccion por roles y trazabilidad mediante `medical_record_changes`.
- Restauracion de registros medicos eliminados (`POST /medical-records/:id/restore`) protegida solo para `admin` con trazabilidad.
- Seed explicito e idempotente para el primer administrador.
- Hashing bcrypt centralizado para passwords.
- Creacion de gastos (`POST /expenses`) con validacion de animal, comprobante opcional contra `media_assets`, `createdByUserId` del actor autenticado, importes en centavos no negativos y escritura protegida por roles.
- Listado global de gastos (`GET /expenses`) con paginacion, filtros por animal, categoria y rango de fechas, y orden cronologico inverso.
- Listado de gastos por animal (`GET /animals/:animalId/expenses`) con paginacion, filtros y proteccion por roles.
- Baja logica de gastos (`DELETE /expenses/:id`) con proteccion por roles.
- Subida de media (`POST /media/upload`) con validacion de propietario (o assets huerfanos), mimetype, tamano, autorizacion por roles y compensacion remota si falla la persistencia.
- Vinculacion polimorfica controlada: tickets solo a gastos, fotos de perfil solo a animales y adjuntos clinicos solo a registros medicos, con re-asignacion transaccional y `409 INCOMPATIBLE_OWNER_TYPE` / `409 MEDIA_ALREADY_OWNED`.
- Listado de assets por propietario (`GET /media`) con validacion de existencia del propietario, paginacion y exclusion de soft-deleted.
- Baja logica de media (`DELETE /media/:id`) con limpieza remota en Cloudinary y permisos diferenciados para `veterinarian`.
- Auditoria transversal de operaciones sensibles (`audit_logs`, append-only) con actor, accion, recurso y timestamp.
- Registro de eventos de usuarios (`user.create`, `user.deactivate`, `user.activate`, `user.role_assign`), registros clinicos (`create/update/soft_delete/restore`), gastos (`create/soft_delete`), logins (`auth.login_success`, `auth.login_failure`) y denegaciones de acceso (`access.denied`).
- Sanitizacion recursiva de `metadata` que redacta passwords, tokens y secretos antes de persistir.
- Consulta de auditoria protegida para `admin` (`GET /audit-logs`, `GET /audit-logs/:id`) con paginacion y filtros.
- Retencion configurable (`AUDIT_LOG_RETENTION_DAYS`) y purga fisica mediante `npm run audit:purge`.
- Build, lint y tests unitarios configurados.
- Health checks de liveness y readiness (`GET /health`, `GET /health/ready`) con chequeo real de PostgreSQL, estado `degraded` y `503` cuando la base no responde.
- Logs estructurados en JSON con redaccion de datos sensibles y correlation ID por request (`x-request-id`) propagado a logs y respuestas de error.
- Suite E2E de flujos criticos desde HTTP hasta PostgreSQL real y descartable mediante Testcontainers; Cloudinary se sustituye solo en el limite externo.
- Suite de contrato de schema (`database-schema.persistence.e2e-spec.ts`) que valida contra PostgreSQL real enums, foreign keys con `ON DELETE`, indices/uniques, constraints `CHECK`, columnas comunes y soft delete, compartiendo el helper `test/utils/persistence-test-setup.ts` (base aislada, migraciones automaticas y limpieza de tablas, incluida `audit_logs`, entre tests).
- CI en GitHub Actions con instalacion reproducible, escaneo de secretos, build, lint, tests unitarios, validacion de migraciones y E2E en matriz Node 20+/22. El job `verify` actua como gate de merge.

### Pendiente

- Implementar subida real de archivos.
- Implementar casos de uso completos por dominio.
- Revisar normalizacion de emails a minusculas.

Los pendientes no deben considerarse implementados hasta que exista codigo, migracion y test cuando corresponda.

## 15. Reglas para agentes

Antes de modificar el proyecto, un agente debe:

1. Leer este documento.
2. Leer el `AGENTS.md` del modulo afectado.
3. Identificar si el cambio pertenece a dominio, aplicacion, infraestructura o interfaces.
4. Evitar importar TypeORM en `domain`.
5. Mantener los controllers delgados.
6. Crear migracion cuando cambie el schema.
7. No usar `synchronize` para resolver cambios.
8. Agregar o actualizar tests para comportamiento real.
9. Ejecutar al menos build, lint y tests antes de finalizar.
10. Informar claramente cualquier decision que requiera modificar el modelo de datos.

## 16. Comandos de verificacion

```bash
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e
npm run migration:show
```

`npm run test:e2e` requiere un runtime Docker disponible. La propia suite crea y elimina un PostgreSQL efimero llamado `refugiapp_test`; no usa Neon ni la variable `DATABASE_URL` del entorno del desarrollador.

Para iniciar la API:

```bash
npm run start:dev
```

Endpoints base:

```text
GET  http://localhost:3000/api/v1
GET  http://localhost:3000/api/v1/health
GET  http://localhost:3000/api/v1/health/ready
Docs http://localhost:3000/api/v1/docs
```
