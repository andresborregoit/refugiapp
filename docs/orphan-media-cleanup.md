# Limpieza de media huerfana

## Objetivo

Evitar archivos abandonados en Cloudinary cuando un asset huerfano nunca se vincula. Un asset huerfano es un registro en `media_assets` con `ownerType` y `ownerId` nulos: se sube primero y se vincula despues al crear un animal, gasto o registro medico. Si el usuario cancela el flujo, el asset queda sin propietario y debe poder eliminarse manualmente o mediante limpieza automatica.

## Politica de propiedad

| Actor | Huerfano propio | Huerfano ajeno | Vinculado ajeno | Vinculado `medical_record` |
| --- | --- | --- | --- | --- |
| `admin` / `shelter_manager` | Permitido | Permitido | Permitido | Permitido |
| `veterinarian` (uploader) | Permitido | Rechazado (403) | Rechazado (403) | Permitido |
| `veterinarian` (no uploader) | Rechazado (403) | Rechazado (403) | Rechazado (403) | Permitido |

- El uploader se identifica por `uploadedByUserId`. Los assets historicos sin uploader solo pueden borrarse por `admin`/`shelter_manager` o por el job.
- `DELETE /media/:id` aplica soft-delete y luego elimina el archivo remoto en Cloudinary de forma best-effort: si la limpieza remota falla, se loguea el error y el registro permanece oculto por `deletedAt`.

## Job de limpieza

El runner CLI elimina los huerfanos con antiguedad mayor a `MEDIA_ORPHAN_RETENTION_HOURS` (default 48h).

```bash
# Vista previa: no modifica nada
npm run media:purge-orphans -- --dry-run

# Ejecucion real con los valores de entorno
npm run media:purge-orphans

# Ejecucion real con parametros explicitos
npm run media:purge-orphans -- --older-than-hours=48 --limit=500
```

Flags disponibles:

| Flag | Proposito | Default |
| --- | --- | --- |
| `--dry-run` | Solo lista candidatos, no muta | `false` |
| `--older-than-hours=` | Antiguedad minima en horas | `MEDIA_ORPHAN_RETENTION_HOURS` (48) |
| `--limit=` | Maximo de huerfanos por ejecucion | `MEDIA_ORPHAN_PURGE_LIMIT` (500) |

### Semantica del resultado

- `candidates`: ids de los assets huerfanos activos mas antiguos que el umbral.
- `deleted`: assets con soft-delete exitoso (aunque la limpieza remota falle).
- `failed`: assets con fallo de soft-delete o de limpieza remota. Un fallo remoto no revierte el soft-delete local.

### Programacion del cron

La API no ejecuta scheduler in-process. Un cron externo debe invocar el runner diariamente, por ejemplo:

```text
0 3 * * *  cd /srv/refugiapp && npm run media:purge-orphans
```

En despliegues containerizados se recomienda un Kubernetes CronJob sobre la misma imagen, ejecutando `npm run media:purge-orphans`. Verificar primero con `--dry-run` tras cada despliegue.

### Consulta respaldada

La seleccion usa el indice parcial `IDX_media_assets_orphan_cleanup`:

```sql
CREATE INDEX "IDX_media_assets_orphan_cleanup"
  ON "media_assets" ("createdAt", "id")
  WHERE "ownerType" IS NULL AND "ownerId" IS NULL AND "deletedAt" IS NULL;
```

El indice excluye soft-deleted para no reprocesar huerfanos ya eliminados.

## Compensacion ante fallo de persistencia

En `POST /media/upload`, si la persistencia en PostgreSQL falla despues de subir a Cloudinary, el caso de uso compensa borrando el recurso remoto. Si la compensacion tambien falla, se loguea el error y se propaga el error original de persistencia para que el cliente pueda reintentar.

## Verificacion

1. Subir un asset huerfano y confirmar que aparece en `GET /media/:id`.
2. Borrarlo como uploader (`DELETE /media/:id`): `204`.
3. Intentar borrar un huerfano ajeno como `veterinarian`: `403`.
4. Ejecutar `npm run media:purge-orphans -- --dry-run` y revisar los candidatos.
5. Envejecer un huerfano de prueba y ejecutar la purga real; verificar que desaparece de las consultas y que su archivo remoto se elimina en Cloudinary.