# Notificaciones push — operación backend (RFG-127)

Contrato backend para RFG-126 (Expo, móvil React Native).

## Endpoints `/api/v1`

- `POST /notifications/devices`: alta/rotación del token Expo del usuario autenticado. Body `expoPushToken, platform, timezone, appVersion?`. Idempotente por `tokenHash`; si el token pertenecía a otro usuario se reasigna. Errores `400 INVALID_PUSH_TOKEN`, `400 INVALID_TIMEZONE`.
- `GET /notifications/devices/me`: dispositivos activos propios (sin token en claro, solo `tokenSuffix`).
- `DELETE /notifications/devices/:id`: baja lógica de un dispositivo propio. Llamar al hacer logout.
- `GET /notifications/preferences/me` + `PUT /notifications/preferences/me`: `overdueEnabled, upcomingEnabled, upcomingWindowMinutes (5..1440), quietStart/quietEnd HH:mm juntos o nulos, timezone IANA`.
- `GET /notifications/deliveries`: solo `admin`, diagnóstico del outbox (`dedupKey, status, attemptCount, lastErrorCode`), sin tokens.

Tocar una notificación debe navegar a `careTaskId` incluido en `data` del push.

## Scheduler

Cron externo (no hay scheduler in-process para evitar doble envío multi-réplica):

```bash
# Cada 5 minutos, con dry-run para validar
npm run notifications:dispatch -- --dry-run --limit=200
npm run notifications:dispatch -- --limit=200 --request-id=<uuid>
```

- Selección: `pending AND dueAt NOT NULL`, `overdue: dueAt < now()`, `upcoming: dueAt <= now()+window`.
- Ventana `upcoming` por preferencia de usuario, default `PUSH_UPCOMING_WINDOW_MINUTES=60`.
- `quietStart/quietEnd` en timezone del usuario: dentro de la ventana se marca `skipped`.
- Desduplicación: `UNIQUE(dedupKey)` `v1:{kind}:{careTaskId}:{yyyy-mm-dd}:{userId}`; reintentos y corridas concurrentes no duplican.
- `DeviceNotRegistered` desactiva el token sin frenar el lote; exit `1` si `failed>0` para alertar.
- Destinatarios: `admin` y `shelter_manager` activos con dispositivo activo y preferencia habilitada.

## Configuración

```env
PUSH_PROVIDER=noop        # expo en staging/producción con dispositivos reales
EXPO_PUSH_URL=https://exp.host/--/api/v2/push/send
PUSH_TIMEOUT_MS=8000
PUSH_BATCH_SIZE=100
PUSH_DISPATCH_LIMIT=200
PUSH_UPCOMING_WINDOW_MINUTES=60
PUSH_DRY_RUN=false
```

## Operativa

- Migración `1793000000000-AddNotificationSubscriptions.ts` (reversible; valores de auditoría append-only).
- Auditoría `push.*` con `resourceType=notification`, metadata sin tokens.
- Logs JSON `push.dispatch.*` con `requestId`, contadores y `dedupKey`; nunca tokens ni secretos.
- Validar en dispositivos físicos (simuladores no reciben push); coordinar con RFG-126 el contrato OpenAPI.
