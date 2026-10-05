# Reglas para `notifications`

## Responsabilidad
- Gestiona suscripciones push por usuario, preferencias y outbox de envíos desduplicado (RFG-127).
- Provee el contrato backend para la subtarea móvil RFG-126.

## Convenciones
- Todo ID principal es UUID. Tablas: `device_subscriptions`, `notification_preferences`, `notification_deliveries`.
- `expoPushToken` en claro solo vive en `device_subscriptions.expoPushToken`; nunca se retorna en DTOs ni se loguea. Las respuestas solo exponen `tokenSuffix` (últimos 6).
- Lookup por `tokenHash` SHA-256; `upsert` reasigna el token al usuario actual y reactiva.
- Clave desduplicación `v1:{kind}:{careTaskId}:{yyyy-mm-dd en tz usuario}:{userId}` con `UNIQUE(dedupKey)`. Reintentos y concurrencia resuelven a `inserted=false`.
- Selección: `care_tasks status=pending AND dueAt NOT NULL`, `overdue: dueAt < now()`, `upcoming: now() <= dueAt <= now()+window`.
- `quietStart/quietEnd` se informan juntos o se omiten; dentro de la ventana el envío se marca `skipped` y se reintenta en el próximo tick.

## Escritura
- `POST /notifications/devices`, `GET /notifications/devices/me`, `DELETE /notifications/devices/:id` requieren JWT y admiten los tres roles; el dispositivo siempre queda asociado al usuario autenticado.
- `GET/PUT /notifications/preferences/me` requieren JWT y admiten los tres roles.
- `GET /notifications/deliveries` requiere JWT y admite solo `admin`; es diagnóstico sin tokens.
- Token Expo inválido: `400 INVALID_PUSH_TOKEN`. Timezone inválida: `400 INVALID_TIMEZONE`. Ventana inválida: `400 INVALID_UPCOMING_WINDOW`. Quiet incompleto: `400 INVALID_QUIET_HOURS`.
- En los DTOs, los campos `string | null` declaran `type: String` en `@ApiProperty`/`@ApiPropertyOptional` para que el OpenAPI emita `type: string` en lugar del artefacto `type: object` que produce la reflexión de la unión.

## Scheduler
- Cron externo ejecuta `npm run notifications:dispatch` (`--dry-run`, `--limit=`, `--request-id=`). No hay scheduler in-process.
- `dryRun` inserta deliveries como `skipped` sin llamar al proveedor.
- Tokens rechazados con `DeviceNotRegistered` se desactivan sin bloquear el lote; exit `1` si `failed>0`.

## Seguridad
- Nunca loguear ni auditar tokens en claro, `DATABASE_URL`, `JWT_SECRET` ni secretos push. `metadata` de auditoría solo lleva ids, `dedupKey`, `kind`, `platform` y contadores.
- Acciones de auditoría: `push.device_register`, `push.device_remove`, `push.preferences_update`, `push.dispatch_completed`, `push.token_invalid` con `resourceType=notification`.
