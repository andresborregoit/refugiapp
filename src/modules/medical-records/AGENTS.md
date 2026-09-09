# Reglas para `medical-records`

## Responsabilidad
- Gestiona historial clinico y veterinario de animales.
- Registra consultas, vacunas, cirugias, tratamientos, desparasitaciones y resultados.

## Convenciones
- Cada registro clinico debe referenciar `animalId`.
- `veterinarianId` es opcional; cuando se informa, el veterinario debe existir y estar activo.
- Adjuntos clinicos se vinculan a `media_assets` con `ownerType=medical_record` y `ownerId=record.id`.
- No mezclar historial general del refugio con historial clinico.
- La entidad de dominio `MedicalRecord` incluye `diagnosis`, `treatment`, `notes` y `createdAt`.

## Escritura
- `POST /medical-records` requiere JWT y admite solo `admin` y `veterinarian`.
- El caso de uso valida que el animal exista (404), que el veterinario exista (404) y este activo (409 `VETERINARIAN_INACTIVE`).
- Valida `recordType` contra el enum `MedicalRecordType`, `title` (3..160 caracteres) y `occurredAt` requerida.
- `occurredAt` no puede ser futura (`OCCURRED_AT_IN_FUTURE`) ni anterior al `intakeDate` del animal (`OCCURRED_AT_BEFORE_INTAKE`).
- `attachmentMediaIds` es opcional; cada ID se valida contra `media_assets` (404 si no existe).
- La persistencia del registro y la vinculacion de adjuntos ocurren en una misma transaccion.
- No se persiste el actor que creo el registro (no existe columna `createdByUserId` en `medical_records`).
- Los campos de texto (`title`, `diagnosis`, `treatment`, `notes`) se normalizan con trim; los vacios se almacenan como `null`.

## Consultas
- `GET /animals/:animalId/medical-records` requiere JWT y admite solo `admin` y `veterinarian`.
- La consulta valida que el animal exista antes de listar; si no existe responde `404`.
- El listado siempre filtra por `animalId` y no debe exponer registros de otros animales.
- Admite paginacion con `page` minimo 1, `limit` entre 1 y 100, default `page=1` y `limit=20`.
- Admite filtros opcionales por `recordType`, `from` y `to` sobre `occurredAt`.
- El orden es cronologico inverso y determinista: `occurredAt DESC, id DESC`.
- `GET /medical-records` y `GET /medical-records/:id` no estan implementados aun.
