# Reglas para `care-tasks`

## Responsabilidad
- Gestiona tareas de cuidado operativas para animales del refugio.
- Permite crear, listar, consultar, editar, completar y cancelar tareas.

## Convenciones
- Cada tarea debe referenciar `animalId`; el animal debe existir (404).
- La entidad de dominio `CareTask` incluye `title`, `description`, `status`, `dueAt`, `completedAt`, `createdByUserId`, `createdAt` y `updatedAt`.
- `title` se valida en DTO (3..160 caracteres) y se normaliza con trim.
- `description` y `dueAt` aceptan `null` explicito para limpiar el campo.
- Los campos de texto se normalizan con trim; los vacios se almacenan como `null`.

## Estados
- Los estados viven en `CareTaskStatus`: `pending`, `completed`, `cancelled`.
- Las transiciones se validan en `domain/services/care-task-status-transitions.ts`.
- Solo una tarea `pending` puede completarse o cancelarse; cualquier otro estado responde `409 CARE_TASK_NOT_PENDING`.
- `complete` persiste `completedAt` con la fecha del servidor.
- `PATCH /care-tasks/:id` no modifica `status`; edita `title`, `description` y `dueAt`.

## Escritura
- `POST /care-tasks`, `PATCH /care-tasks/:id`, `POST /care-tasks/:id/complete` y `POST /care-tasks/:id/cancel` requieren JWT y admiten solo `admin` y `shelter_manager`.
- El usuario creador se persiste en `createdByUserId` tomado del contexto autenticado (`@CurrentUser()`).
- Cada operacion de escritura registra un evento en `audit_logs` (`care_task.create`, `care_task.update`, `care_task.complete`, `care_task.cancel`) con `resourceType=care_task` y metadata sin secretos.

## Consultas
- `GET /care-tasks` y `GET /care-tasks/:id` requieren JWT y admiten los tres roles autenticados.
- El listado usa paginacion con `page` minimo 1, `limit` entre 1 y 100, default `page=1` y `limit=20`.
- Admite filtros opcionales por `animalId` y `status`.
- Si se filtra por `animalId`, el caso de uso valida que el animal exista (404).
- El orden es cronologico inverso y determinista: `createdAt DESC, id DESC`.
- La consulta y el listado excluyen soft-deleted mediante el comportamiento por defecto de TypeORM.