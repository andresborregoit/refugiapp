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
| Autenticacion | JWT + Passport | Preparado para login real |
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

No persiste usuarios directamente. La validacion de credenciales debe delegar en `UsersService` y en el contrato de repositorio de usuarios.

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

### `animals`

Gestiona la ficha general del animal y su historial no clinico.

No debe almacenar diagnosticos ni tratamientos. Esa informacion pertenece a `medical-records`.

### `medical-records`

Gestiona consultas, vacunas, desparasitaciones, cirugias, tratamientos y otros registros clinicos.

Cada registro debe pertenecer a un animal. El veterinario responsable es opcional.

### `veterinarians`

Gestiona el perfil profesional del veterinario: matricula, datos de contacto, notas y estado.

No contiene credenciales. Cuando corresponde, se vincula opcionalmente con `users` mediante `userId`.

### `expenses`

Gestiona gastos asociados a animales. Los importes se almacenan en centavos como `integer` para evitar errores de punto flotante.

Los comprobantes se almacenan como metadata de `media-assets` y se referencian mediante `ticketMediaId`.

### `media`

Gestiona metadata de archivos almacenados en Cloudinary.

PostgreSQL no almacena binarios. La base conserva identificadores, URL segura, formato, tamano, propietario y metadata adicional.

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

### 6.4 `animals`

Representa la ficha principal del animal.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `name` | `varchar(120)` | No | |
| `species` | `varchar(80)` | No | Ejemplos: `dog`, `cat` |
| `sex` | `animal_sex` | No | Default `unknown` |
| `status` | `animal_status` | No | Default `admitted` |
| `birthDate` | `date` | Si | Fecha real o estimada |
| `intakeDate` | `date` | No | |
| `profilePhotoMediaId` | `uuid` | Si | FK a `media_assets.id` |
| `notes` | `text` | Si | |
| columnas comunes | | | |

Nota: `breed` es un campo pendiente. No figura en la entidad de dominio `Animal`, en `AnimalOrmEntity` ni en la migracion inicial ejecutada. Debe agregarse al modelo de dominio, al ORM y a PostgreSQL mediante una migracion posterior antes de usarlo en produccion.

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

### 6.7 `expenses`

Representa un gasto asociado a un animal.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `animalId` | `uuid` | No | FK a `animals.id` |
| `category` | `expense_category` | No | |
| `amountCents` | `integer` | No | Importe en centavos |
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

### 6.8 `media_assets`

Representa un recurso almacenado externamente en Cloudinary.

| Columna | Tipo | Null | Restricciones |
| --- | --- | --- | --- |
| `id` | `uuid` | No | PK |
| `ownerType` | `media_owner_type` | No | Tipo de propietario |
| `ownerId` | `uuid` | No | ID del propietario polimorfico |
| `resourceType` | `media_resource_type` | No | Default `image` |
| `cloudinaryPublicId` | `varchar(255)` | No | Unico |
| `secureUrl` | `varchar(2048)` | No | URL HTTPS |
| `format` | `varchar(40)` | Si | |
| `bytes` | `integer` | Si | Tamano del recurso |
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
```

### Relacion polimorfica de media

Ademas de las relaciones directas del DER, `media_assets` puede apuntar a:

```text
(ownerType = animal, ownerId = animals.id)
(ownerType = expense_ticket, ownerId = expenses.id)
(ownerType = medical_record, ownerId = medical_records.id)
(ownerType = user, ownerId = users.id)
(ownerType = veterinarian, ownerId = veterinarians.id)
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
| `expenses` | `animalId` | `animals.id` | `RESTRICT` |
| `expenses` | `ticketMediaId` | `media_assets.id` | `SET NULL` |
| `expenses` | `createdByUserId` | `users.id` | `SET NULL` |
| `animals` | `profilePhotoMediaId` | `media_assets.id` | `SET NULL` |
| `media_assets` | `uploadedByUserId` | `users.id` | `SET NULL` |

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
- Indice en `expenses.animalId`.
- Indice en `expenses.incurredAt`.
- Indice compuesto en `media_assets.ownerType, ownerId`.
- Indice unico en `media_assets.cloudinaryPublicId`.

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
InitSchema1787781241921
```

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

La validacion `amountCents >= 0` debe agregarse en DTO, dominio y en una futura migracion como `CHECK` si el negocio no permite gastos negativos.

### Cloudinary

PostgreSQL conserva metadata. Cloudinary conserva el archivo.

El flujo esperado es:

1. Validar usuario y propietario.
2. Subir archivo a Cloudinary mediante `media`.
3. Obtener `public_id`, URL, formato y tamano.
4. Persistir `MediaAsset`.
5. Asociar el asset con la entidad correspondiente.

Si falla la persistencia despues de subir el archivo, el caso de uso debe contemplar compensacion o limpieza del recurso remoto.

## 14. Estado implementado y pendientes conocidos

### Implementado

- Arquitectura modular por dominio.
- Entidades de dominio y ORM separadas.
- UUID para primary keys.
- Soft delete comun.
- Enums PostgreSQL.
- Tipo clinico `deworming` en el enum `medical_record_type`.
- Relaciones ORM principales.
- Foreign keys de la migracion inicial.
- Neon configurado mediante `DATABASE_URL`.
- SSL para PostgreSQL.
- `synchronize=false`.
- Migracion inicial ejecutada en Neon.
- Metadata de Cloudinary separada de los binarios.
- JWT y roles preparados.
- Seed explicito e idempotente para el primer administrador.
- Hashing bcrypt centralizado para passwords.
- Build, lint y tests unitarios configurados.

### Pendiente

- Agregar `breed` a la entidad de dominio `Animal`, a `AnimalOrmEntity` y crear una migracion.
- Agregar checks de `amountCents` y `bytes`.
- Integrar el hashing centralizado en el futuro flujo real de alta/login de usuarios.
- Completar login real y emision de JWT.
- Implementar subida real de archivos.
- Implementar casos de uso completos por dominio.
- Crear tests de integracion con PostgreSQL.
- Definir politicas definitivas de roles por endpoint.
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
npm run migration:show
```

Para iniciar la API:

```bash
npm run start:dev
```

Endpoints base:

```text
GET  http://localhost:3000/api/v1
Docs http://localhost:3000/api/v1/docs
```
