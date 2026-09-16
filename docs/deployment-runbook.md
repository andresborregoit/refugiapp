# Runbook de despliegue y rollback

## Alcance

Este procedimiento despliega el mismo artefacto en development, staging y production. La plataforma concreta puede ser un servicio de contenedores, Kubernetes o una VM, siempre que permita ejecutar un job de migraciones antes del rollout y consultar readiness.

## Requisitos previos

1. El commit objetivo debe tener el job `Verify all checks passed` en verde.
2. La imagen debe construirse desde el `Dockerfile` y etiquetarse con el SHA completo del commit.
3. La configuracion debe partir del archivo `.env.<ambiente>.example` correspondiente y recibir secretos desde el gestor de la plataforma.
4. Debe existir un backup o punto de restauracion reciente de PostgreSQL, verificado segun [`postgresql-backup-recovery.md`](postgresql-backup-recovery.md), antes de una migracion destructiva.
5. La migracion debe haber sido revisada para confirmar compatibilidad hacia atras durante el rollout gradual.

## Construccion y promocion

```bash
docker build --pull=false --tag registry.example/refugiapp-api:<git-sha> .
docker push registry.example/refugiapp-api:<git-sha>
```

La imagen base esta fijada por version y digest. Registrar el digest de la imagen resultante y promover ese mismo digest entre ambientes; no volver a construir para staging o production.

## Despliegue

1. Seleccionar la imagen por digest y cargar las variables del ambiente.
2. Ejecutar las migraciones como un job unico con la misma imagen que se desplegara:

```bash
docker run --rm --env-file <archivo-seguro-del-ambiente> \
  registry.example/refugiapp-api@<image-digest> \
  npm run migration:run:prod
```

3. Confirmar el estado de migraciones:

```bash
docker run --rm --env-file <archivo-seguro-del-ambiente> \
  registry.example/refugiapp-api@<image-digest> \
  npm run migration:show:prod
```

4. Iniciar o actualizar las replicas de la API sin ejecutar migraciones desde el comando de arranque.
5. Mantener cada replica fuera del balanceador hasta que responda `200` en `GET /api/v1/health/ready`.
6. Confirmar `GET /api/v1/health`, una autenticacion controlada y ausencia de errores nuevos en logs.
7. Completar el rollout gradualmente y observar errores, latencia y conexiones PostgreSQL.

Ejemplo de readiness para Kubernetes:

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

El `Dockerfile` incluye el mismo chequeo como `HEALTHCHECK` para plataformas que consumen el estado de Docker.

## Rollback

1. Detener el rollout y conservar logs, SHA y digest de la imagen fallida.
2. Volver al digest de la ultima imagen estable. La migracion nueva debe ser compatible con esa version durante esta operacion.
3. Verificar readiness antes de devolver trafico y ejecutar los smoke tests.
4. Preferir una migracion correctiva hacia adelante cuando el schema ya recibio datos.
5. Usar `npm run migration:revert:prod` solo si la migracion fue declarada reversible, no hubo escrituras incompatibles y existe aprobacion operativa. TypeORM revierte una migracion por ejecucion.
6. Si hay perdida o corrupcion de datos, aislar escrituras y restaurar el punto de recuperacion siguiendo el procedimiento del proveedor de PostgreSQL.

Nunca habilitar `TYPEORM_SYNCHRONIZE` para resolver un despliegue o rollback.

## Evidencia minima

Registrar en el ticket de despliegue:

- Commit y digest de imagen.
- Ambiente y hora de inicio/fin.
- Resultado de migraciones.
- Resultado de readiness y smoke tests.
- Responsable y, si aplica, motivo y resultado del rollback.
