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
| `--older-than-hours=` | Antiguedad minima en horas (1..720) | `MEDIA_ORPHAN_RETENTION_HOURS` (48) |
| `--limit=` | Maximo de huerfanos por ejecucion (1..10000) | `MEDIA_ORPHAN_PURGE_LIMIT` (500) |
| `--request-id=` | Correlation ID de la ejecucion (se genera un UUID si se omite) | UUID generado |

Un flag numerico provisto pero invalido (no numerico, menor a 1 o fuera de rango) hace fallar la ejecucion con exit code `1` y un log JSON de error; no cae silenciosamente al default.

### Semantica del resultado

- `candidates`: ids de los assets huerfanos activos mas antiguos que el umbral.
- `deleted`: assets con soft-delete exitoso (aunque la limpieza remota falle).
- `failed`: assets con fallo de soft-delete o de limpieza remota. Un fallo remoto no revierte el soft-delete local.
- `skipped`: assets que entre la seleccion y el borrado dejaron de ser huerfanos (se vincularon) o ya estaban soft-deleted. El borrado es condicional y atomico (`ownerType IS NULL AND ownerId IS NULL`), por lo que un asset recien vinculado nunca se elimina por esta via.

### Logs estructurados

El runner y el caso de uso emiten logs JSON con `requestId` (el mismo `--request-id` de la ejecucion). Eventos emitidos:

```text
media.orphan_purge.start        inicio del runner (dry-run, horas, limite)
media.orphan_purge.started      inicio del caso de uso (candidatos, umbral)
media.orphan_purge.completed    resumen final (deleted, failed, skipped, durationMs)
media.orphan_purge.skipped      asset saltado por race (warning)
media.orphan_purge.cloudinary_failed  fallo de limpieza remota por asset
media.orphan_purge.failed       fallo de soft-delete por asset o de validacion
media.orphan_purge.fatal        error no recuperable
```

Ningun log incluye secretos, URLs de Cloudinary ni contenido binario.

### Exit codes

| Exit code | Significado |
| --- | --- |
| `0` | `dry-run`, o ejecucion real sin fallos (`failed = 0`) |
| `1` | `failed > 0`, argumentos invalidos o error no recuperable |

El cron debe alertar cuando el exit code sea `1`.

### Programacion del cron

La API no ejecuta scheduler in-process. Un cron externo debe invocar el runner diariamente, por ejemplo:

```text
0 3 * * *  cd /srv/refugiapp && npm run media:purge-orphans
```

En despliegues containerizados se recomienda un Kubernetes CronJob sobre la misma imagen. Usar `concurrencyPolicy: Forbid` para evitar doble ejecucion y verificar primero con `--dry-run` tras cada despliegue:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: refugiapp-media-orphan-purge
spec:
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: purge
              image: <registry>/refugiapp-api:<digest>
              command: ["npm", "run", "media:purge-orphans", "--", "--dry-run"]
```

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
6. Verificar los exit codes: `0` cuando `failed=0`, `1` si hubo fallos o argumentos invalidos.