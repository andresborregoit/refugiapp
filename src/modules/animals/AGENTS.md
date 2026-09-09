# Reglas para `animals`

## Responsabilidad
- Gestiona la ficha general del animal dentro del refugio.
- Contiene el historial general no clinico mediante eventos del animal.

## Convenciones
- No guardar datos clinicos detallados aqui; usar `medical-records`.
- No guardar comprobantes de gastos aqui; usar `expenses` y `media`.
- `AnimalHistoryEvent` representa eventos generales: ingreso, traslado, cambio de estado, adopcion o notas.
- Las fotos se referencian por UUID hacia `media_assets`.

## Datos
- Mantener estados del animal en `AnimalStatus`.
- Mantener sexo biologico/desconocido en `AnimalSex`.

## Consultas
- `GET /animals` admite paginacion con `page` minimo 1 y `limit` entre 1 y 100; el default es page 1 y limit 20.
- Los filtros combinables son `status`, `species`, `sex` y busqueda parcial por `name`.
- El listado y la consulta individual excluyen registros con `deletedAt` mediante el comportamiento por defecto de TypeORM.
- El orden estable del listado es `createdAt ASC, id ASC`.
- La consulta y el listado requieren JWT y admiten `admin`, `shelter_manager` y `veterinarian`.

## Escritura
- `POST /animals` requiere JWT y admite solo `admin` y `shelter_manager`.
- El caso de uso valida nombre, especie, sexo, estado y fecha de ingreso; los defaults son `sex = unknown` y `status = admitted`.
- Si se informa `profilePhotoMediaId`, el caso de uso verifica que el asset exista en `media`; si no existe responde `404`.
- La creacion persiste el animal y un evento automatico `intake` en una misma transaccion; el evento usa `occurredAt = intakeDate` y `createdByUserId` del usuario autenticado.
- La descripcion del evento de ingreso es la constante de dominio `INTAKE_EVENT_DESCRIPTION`; no duplicarla en otros lugares.

## Estados
- Las transiciones de `AnimalStatus` se validan contra una matriz acotada definida en `domain/services/animal-status-transitions.ts`.
- Transiciones permitidas: admitted→{under_treatment, available_for_adoption, deceased}; under_treatment→{admitted, available_for_adoption, deceased}; available_for_adoption→{under_treatment, adopted, deceased}; adopted y deceased son terminales.
- Mismo estado y transiciones desde terminales se rechazan con `409`.
- `PATCH /animals/:id/status` requiere JWT y admite solo `admin` y `shelter_manager`.
- Cada cambio persiste un evento `status_change` en la misma transaccion, con `description` generada por `buildStatusChangeEventDescription`, `metadata {from, to}` y `createdByUserId` del actor.
- La fecha del evento (`occurredAt`) es opcional; si no se envia, se usa now del servidor. Se rechazan fechas futuras (`OCCURRED_AT_IN_FUTURE`) y anteriores a `intakeDate` (`OCCURRED_AT_BEFORE_INTAKE`).
- Las excepciones de dominio se mapean a `BadRequestException` en la capa de aplicacion.

## Historial
- `POST /animals/:animalId/events` crea eventos generales; requiere JWT y admite solo `admin` y `shelter_manager`.
- `GET /animals/:animalId/events` lista eventos; requiere JWT y admite los 3 roles autenticados.
- Tipos creables manualmente: `general_note`, `behavior_note`, `transfer`. Los tipos `intake`, `status_change` y `adoption` estan reservados al sistema.
- El listado usa paginacion (page minimo 1, limit 1..100, default 20), filtro opcional por `eventType` y orden `occurredAt DESC, id DESC`.
- `AnimalHistoryEvent` en dominio incluye `createdByUserId` y `metadata`; el repositorio de eventos es un contrato separado de `AnimalRepository`.
- Los datos clinicos pertenecen a `medical-records`, no a eventos generales.
