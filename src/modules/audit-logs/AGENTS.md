# Reglas para `audit-logs`

## Responsabilidad
- Registra quien realizo cambios sensibles, sobre que recurso y cuando.
- Provee consulta protegida de la bitacora de auditoria para `admin`.
- Audita usuarios, roles, registros clinicos, gastos, logins y denegaciones de acceso.
- La tabla `audit_logs` es append-only; no existen endpoints de escritura, borrado ni edicion.

## Convenciones
- El dominio es puro: no importa NestJS ni TypeORM.
- Cada evento guarda: `actorUserId` (nullable), `action`, `resourceType`, `resourceId` (nullable), `occurredAt` y `metadata`.
- Los eventos se emiten desde los casos de uso (application) mediante `AuditLogsService.record` despues de la operacion exitosa.
- No registrar lecturas (`GET`) en este MVP; solo escrituras sensibles y eventos de acceso.
- Las acciones y tipos de recurso se mantienen en los enums `AuditAction` y `AuditResourceType`.
- `AuditForbiddenFilter` audita los `403` a nivel global y nunca rompe la respuesta HTTP.

## Seguridad
- Nunca almacenar passwords, tokens, secretos ni credenciales en `metadata`.
- `sanitizeAuditMetadata` redacta claves sensibles (password, token, secret, apiKey, authorization, etc.) antes de persistir.
- `GET /audit-logs` y `GET /audit-logs/:id` requieren JWT y admiten solo `admin`.
- La consulta de auditoria no expone `passwordHash` ni secretos; los tests verifican su ausencia.

## Retencion
- `AUDIT_LOG_RETENTION_DAYS` (730 dias) define el periodo de retencion.
- La purga se ejecuta con `npm run audit:purge` (borrado fisico de entradas viejas).
- `audit_logs` es inmutable: `deletedAt` nunca se setea via HTTP.

## Consultas
- Listado con paginacion (`page` minimo 1, `limit` entre 1 y 100, default 20).
- Filtros opcionales: `action`, `resourceType`, `resourceId`, `actorUserId` y rango `from`/`to` sobre `occurredAt`.
- Orden determinista: `occurredAt DESC, id DESC`.
- `from` posterior a `to` responde 400 `INVALID_DATE_RANGE`.