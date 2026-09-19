# Matriz de capacidades por rol

Este documento define la matriz definitiva de capacidades por rol para Refugiapp API. Es la referencia que debe usar el frontend para decidir que acciones mostrar a cada usuario y la fuente de verdad humana que acompaña a `ROLE_CAPABILITIES` en `src/common/authorization/role-capabilities.ts`.

La autorizacion de cada endpoint se sigue resolviendo con `JwtAuthGuard` + `RolesGuard` y `@Roles`. Esta matriz **no** reemplaza los guards: es la especificacion documentada de lo que esos guards permiten, derivada de `architecture.md` seccion 5.1.

## Roles

- `admin`
- `shelter_manager`
- `veterinarian`

## Capacidades

| Capacidad | `admin` | `shelter_manager` | `veterinarian` | Operaciones representativas |
| --- | --- | --- | --- | --- |
| `canEditAnimal` | Si | Si | No | Crear animales, cambiar su estado, registrar eventos generales y gestionar tareas de cuidado |
| `canReadClinicalRecords` | Si | No | Si | Leer y gestionar registros clinicos (consultas, vacunas, tratamientos, cirugias) |
| `canManageUsers` | Si | No | No | Crear, activar y desactivar usuarios internos y asignar roles |
| `canManageExpenses` | Si | Si | No | Crear y dar de baja gastos asociados a animales |
| `canManageVets` | Si | Si | No | Crear, editar y desactivar perfiles de veterinarios |
| `canReadAudit` | Si | No | No | Consultar el historial de auditoria (append-only) |

## Derivacion desde los endpoints

### `canEditAnimal` (`admin`, `shelter_manager`)

Agrupa las escrituras sobre la ficha del animal, su historial general y las tareas de cuidado:

- `POST /animals`
- `PATCH /animals/:id/status`
- `POST /animals/:animalId/events`
- `POST /care-tasks`
- `PATCH /care-tasks/:id`
- `POST /care-tasks/:id/complete`
- `POST /care-tasks/:id/cancel`

Las lecturas (`GET /animals`, `GET /animals/:id`, `GET /animals/:animalId/events`, `GET /care-tasks`, `GET /care-tasks/:id`) estan disponibles para los tres roles autenticados.

### `canReadClinicalRecords` (`admin`, `veterinarian`)

Agrupa el acceso a los registros clinicos:

- `GET /animals/:animalId/medical-records`
- `POST /medical-records`
- `PATCH /medical-records/:id`
- `DELETE /medical-records/:id`

Nota: `POST /medical-records/:id/restore` esta reservado a `admin`; `shelter_manager` no tiene acceso a registros clinicos.

### `canManageUsers` (`admin`)

Solo `admin` gestiona usuarios internos y roles:

- `POST /users`
- `POST /users/:id/deactivate`
- `POST /users/:id/activate`

`GET /users/me` esta disponible para los tres roles.

### `canManageExpenses` (`admin`, `shelter_manager`)

Escrituras sobre gastos:

- `POST /expenses`
- `DELETE /expenses/:id`

Las lecturas (`GET /expenses`, `GET /expenses/:id`, `GET /animals/:animalId/expenses`) estan disponibles para los tres roles.

### `canManageVets` (`admin`, `shelter_manager`)

Escrituras sobre perfiles de veterinarios:

- `POST /veterinarians`
- `PATCH /veterinarians/:id`
- `POST /veterinarians/:id/deactivate`

Las lecturas (`GET /veterinarians`, `GET /veterinarians/:id`) estan disponibles para los tres roles.

### `canReadAudit` (`admin`)

- `GET /audit-logs`
- `GET /audit-logs/:id`

## Notas transversales

- `POST /auth/login` y `POST /auth/refresh` son publicos (autenticacion), no forman parte de la matriz.
- En `media`, el rol `veterinarian` puede subir y borrar assets restringidos a adjuntos clinicos (`ownerType=medical_record`) o assets huerfanos propios; `admin` y `shelter_manager` operan cualquier asset. Esta politica esta documentada en `architecture.md` seccion 5.1 y en el modulo `media`.
- La constante `ROLE_CAPABILITIES` no se usa para autorizacion: los guards siguen siendo la unica via de enforcement. Cualquier cambio en los guards debe reflejarse aqui para que el contrato no quede desincronizado.

## Regeneracion del contrato

El contrato OpenAPI versionado se regenera con:

```bash
npm run openapi:export
```

y debe revisarse en el diff del PR cuando cambien endpoints o DTOs. Ver `docs/openapi.json`.