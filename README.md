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
- Enum clinico `medical_record_type` con `deworming` incluido.
- Migracion inicial `InitSchema1787781241921` en `src/database/migrations/1787781241921-InitSchema.ts`.
- Tests unitarios y e2e iniciales con Jest.
- `AGENTS.md` por modulo para guiar futuras tareas con IA.

Pendiente:

- Flujo real de login y emision de JWT.
- Hashing real de passwords.
- Subida real de archivos a Cloudinary.
- CRUDs y casos de uso finales por dominio.
- Campo `breed` para animales. Todavia no existe en la entidad de dominio `Animal`, en `AnimalOrmEntity` ni en la migracion inicial; debe agregarse con una migracion posterior.

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
    medical-records/
    veterinarians/
    expenses/
    media/
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
test/
  app.e2e-spec.ts
```

Modulos iniciales:

- `auth`: JWT, Passport strategy, guard y endpoint base de login pendiente de implementacion real.
- `users`: usuarios internos y roles.
- `animals`: ficha general del animal e historial general del refugio.
- `medical-records`: historial clinico/veterinario.
- `veterinarians`: veterinarios responsables.
- `expenses`: gastos asociados a animales y referencia a tickets.
- `media`: metadata de archivos e imagenes en Cloudinary.

## Instalacion

Requisitos:

- Node.js 20 o superior.
- npm.
- Una base PostgreSQL en Neon.

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

Para cambios nuevos de schema, modificar primero las entidades ORM, generar una migracion nueva con nombre descriptivo, revisar el SQL generado y versionar codigo y migracion juntos.

## Administrador inicial

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

El modulo `media` ya contiene el provider base de Cloudinary y un servicio para construir carpetas de upload. La subida real de archivos se implementara en una etapa posterior.

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
GET http://localhost:3000/api/v1
```

## Swagger/OpenAPI

Con el servidor corriendo:

```txt
http://localhost:3000/api/v1/docs
```

Swagger incluye bearer auth para probar endpoints protegidos cuando se implemente autenticacion real.

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

El e2e inicial prueba el health check sin levantar la conexion real a Neon. Los e2e de funcionalidades deberian usar una base de test dedicada o contenedores.

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

- Implementar hashing de passwords y flujo real de login.
- Implementar CRUD controlado de usuarios y animales.
- Agregar `breed` a animales con cambios de dominio, ORM y migracion.
- Agregar guards de roles en endpoints reales.
- Implementar subida de fotos/tickets a Cloudinary.
- Crear endpoints de historial general y clinico por animal.
- Definir estrategia de tests con base de datos de test.
- Agregar paginacion, filtros y convenciones de respuesta.
