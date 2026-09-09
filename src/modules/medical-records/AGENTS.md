# Reglas para `medical-records`

## Responsabilidad
- Gestiona historial clinico y veterinario de animales.
- Registra consultas, vacunas, cirugias, tratamientos, desparasitaciones y resultados.
- Conserva trazabilidad de cambios sensibles mediante `medical_record_changes`.

## Convenciones
- Cada registro clinico debe referenciar `animalId`.
- `veterinarianId` es opcional; cuando se informa, el veterinario debe existir y estar activo.
- Adjuntos clinicos se vinculan a `media_assets` con `ownerType=medical_record` y `ownerId=record.id`.
- No mezclar historial general del refugio con historial clinico.
- La entidad de dominio `MedicalRecord` incluye `diagnosis`, `treatment`, `notes`, `createdAt`, `updatedAt` y `deletedAt`.
- Cada cambio (update, soft-delete, restore) persiste un registro en `medical_record_changes` dentro de la misma transaccion.

## Escritura
- `POST /medical-records` requiere JWT y admite solo `admin` y `veterinarian`.
- El caso de uso valida que el animal exista (404), que el veterinario exista (404) y este activo (409 `VETERINARIAN_INACTIVE`).
- Valida `recordType` contra el enum `MedicalRecordType`, `title` (3..160 caracteres) y `occurredAt` requerida.
- `occurredAt` no puede ser futura (`OCCURRED_AT_IN_FUTURE`) ni anterior al `intakeDate` del animal (`OCCURRED_AT_BEFORE_INTAKE`).
- `attachmentMediaIds` es opcional; cada ID se valida contra `media_assets` (404 si no existe).
- La persistencia del registro y la vinculacion de adjuntos ocurren en una misma transaccion.
- No se persiste el actor que creo el registro (no existe columna `createdByUserId` en `medical_records`).
- Los campos de texto (`title`, `diagnosis`, `treatment`, `notes`) se normalizan con trim; los vacios se almacenan como `null`.

## Actualizacion
- `PATCH /medical-records/:id` requiere JWT y admite solo `admin` y `veterinarian`.
- Todos los campos del DTO son opcionales (PATCH parcial); solo se actualizan los campos enviados.
- Si `veterinarianId` se informa, el veterinario debe existir y estar activo (409 `VETERINARIAN_INACTIVE`); si es `null`, se desvincula el veterinario.
- Si `occurredAt` se informa, se valida contra `intakeDate` y fecha actual.
- El caso de uso calcula `previousValues` (solo campos que cambian) y persiste un `MedicalRecordChange` con `changeType=update` en la misma transaccion.
- No se permite editar registros eliminados (404).

## Baja logica
- `DELETE /medical-records/:id` requiere JWT y admite solo `admin` y `veterinarian`.
- Aplica soft-delete mediante `deletedAt`; no se permite borrado fisico desde HTTP.
- El caso de uso persiste un `MedicalRecordChange` con `changeType=soft_delete` y snapshot de todos los campos en `previousValues`.
- No se permite eliminar un registro ya eliminado (404).

## Restauracion
- `POST /medical-records/:id/restore` requiere JWT y admite solo `admin`.
- Restaura un registro eliminado limpiando `deletedAt`.
- Si el registro no tiene `deletedAt`, responde 409 `RECORD_NOT_DELETED`.
- El caso de uso persiste un `MedicalRecordChange` con `changeType=restore` en la misma transaccion.

## Trazabilidad
- La tabla `medical_record_changes` registra cada cambio sensible: actualizacion, baja logica y restauracion.
- Cada cambio almacena: `medicalRecordId`, `changedByUserId`, `changeType`, `previousValues` (jsonb) y `changedAt`.
- Los registros eliminados no aparecen en consultas normales; solo se acceden mediante `findByIdWithDeleted`.

## Consultas
- `GET /animals/:animalId/medical-records` requiere JWT y admite solo `admin` y `veterinarian`.
- La consulta valida que el animal exista antes de listar; si no existe responde `404`.
- El listado siempre filtra por `animalId` y no debe exponer registros de otros animales.
- Admite paginacion con `page` minimo 1, `limit` entre 1 y 100, default `page=1` y `limit=20`.
- Admite filtros opcionales por `recordType`, `from` y `to` sobre `occurredAt`.
- El orden es cronologico inverso y determinista: `occurredAt DESC, id DESC`.
- `GET /medical-records` y `GET /medical-records/:id` no estan implementados aun.
