# Reglas para `media`

## Responsabilidad
- Gestiona metadata de archivos e imagenes almacenados en Cloudinary.
- Centraliza carpetas, public IDs, URLs seguras y relacion con entidades duenias.
- Permite assets huerfanos (sin propietario) que se vinculan luego a una entidad.

## Convenciones
- No almacenar binarios en PostgreSQL.
- Cloudinary debe configurarse solo desde `ConfigService`.
- `ownerType` y `ownerId` determinan a que entidad pertenece el asset; son opcionales y deben informarse juntos o omitirse. Si se omiten, el asset queda huerfano.
- `bytes` es opcional, pero cuando existe debe ser mayor o igual a 0 en DTO, dominio y PostgreSQL.
- Fotos de animales, tickets de gastos y adjuntos clinicos deben pasar por este modulo.
- La compatibilidad de vinculacion se define en `domain/services/media-owner-policy.ts`: un asset huerfano puede vincularse a cualquier entidad; un asset ya asignado no puede re-vincularse (`409 MEDIA_ALREADY_OWNED`) y solo acepta el owner type esperado (`409 INCOMPATIBLE_OWNER_TYPE`).

## Escritura
- `POST /media/upload` requiere JWT y admite `admin`, `shelter_manager` y `veterinarian`.
- Si se informa `ownerType`/`ownerId`, el propietario debe existir (404). Si se omiten, el asset se guarda como huerfano.
- `admin` y `shelter_manager` pueden subir para cualquier owner type u huerfano. `veterinarian` solo puede subir assets de `medical_record` u huerfanos (403 en otro caso).
- La subida valida mimetype (jpeg, png, webp, pdf, mp4) y tamano maximo de 10MB.
- Si falla la persistencia en PostgreSQL despues de subir a Cloudinary, el caso de uso compensa borrando el recurso remoto. Si la compensacion tambien falla, se loguea y se propaga el error original de persistencia.

## Vinculacion
- `expenses` vincula `ticketMediaId` con `ownerType=expense_ticket`, `animals` vincula `profilePhotoMediaId` con `ownerType=animal` y `medical-records` vincula `attachmentMediaIds` con `ownerType=medical_record`.
- Cada vinculo valida la compatibilidad en el servicio de aplicacion (409) y re-asigna el asset en la misma transaccion que crea la entidad.
- Un asset ya vinculado a otra entidad no puede re-vincularse.

## Consultas
- `GET /media?ownerType=&ownerId=&page=&limit=` lista assets por propietario; requiere JWT y admite los tres roles autenticados.
- La consulta valida que el propietario exista (404) antes de listar.
- Paginacion con `page` minimo 1, `limit` entre 1 y 100, default `page=1` y `limit=20`. Orden `createdAt DESC, id DESC`. Excluye soft-deleted.
- `GET /media/:id` requiere JWT y admite los tres roles; responde 404 si el asset no existe.

## Baja logica
- `DELETE /media/:id` requiere JWT y admite los tres roles autenticados.
- `admin` y `shelter_manager` pueden borrar cualquier asset.
- Un asset huerfano (`ownerType`/`ownerId` nulos) puede ser borrado por el usuario que lo subio (`uploadedByUserId`), sin importar su rol. Esto cubre el flujo subir -> cancelar.
- Un `veterinarian` que no es el uploader solo puede borrar assets de `medical_record`; un huerfano ajeno o un asset vinculado a otra entidad responde `403`.
- Aplica soft-delete mediante `deletedAt` y luego intenta eliminar el archivo remoto en Cloudinary. Si la limpieza remota falla, se loguea el error y el registro permanece oculto por `deletedAt`.
- Swagger documenta la politica de propiedad y la retencion de huerfanos en `POST /media/upload` y `DELETE /media/:id`.

## Limpieza automatica de huerfanos
- `MediaService.purgeExpiredOrphans` elimina (soft-delete + Cloudinary) los assets huerfanos con antiguedad mayor a `MEDIA_ORPHAN_RETENTION_HOURS` (default 48).
- La query usa `findOrphanedOlderThan` (`ownerType` y `ownerId` nulos, `createdAt` anterior al umbral), orden `createdAt ASC, id ASC` y limite `MEDIA_ORPHAN_PURGE_LIMIT` (default 500).
- El runner CLI es `npm run media:purge-orphans`; acepta `--dry-run`, `--older-than-hours=` y `--limit=`. El cron externo debe invocarlo (no hay scheduler in-process).
- `dryRun` solo devuelve candidatos y no muta nada. En ejecucion real, `deleted` cuenta filas con soft-delete exitoso y `failed` cuenta assets con fallo de soft-delete o de limpieza remota; un fallo remoto no revierte el soft-delete.
- El indice parcial `IDX_media_assets_orphan_cleanup` respalda esta consulta.

## Seguridad
- No exponer `CLOUDINARY_API_SECRET`.
- La existencia del propietario se consulta mediante `OwnerExistsChecker` contra los repositorios de cada dominio.
- Las subidas firmadas y reglas de acceso avanzadas se implementaran en una etapa posterior.