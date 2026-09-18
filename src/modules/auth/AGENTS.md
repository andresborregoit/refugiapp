# Reglas para `auth`

## Responsabilidad
- Maneja autenticacion JWT, estrategias Passport, guards de autenticacion y emision de tokens.
- Emite y rota refresh tokens opacos con deteccion de reuso.
- No debe almacenar usuarios directamente ni conocer detalles de persistencia de usuarios.

## Convenciones
- DTOs HTTP en `interfaces/dto`.
- Estrategias y guards en `infrastructure`.
- Payload JWT minimo: `sub`, `email`, `roles`.
- La validacion de credenciales delega en `UsersService` y en el contrato de repositorio de usuarios.

## Refresh tokens
- `POST /auth/login` emite `accessToken` y un `refreshToken` opaco de 48 bytes aleatorios.
- Solo se persiste el hash SHA-256 del refresh token (`tokenHash`, unico) junto con `userId`, `familyId`, `expiresAt`, `revokedAt` y `replacedById`.
- `POST /auth/refresh` rota el token: revoca el actual y emite un sucesor en la misma familia dentro de una transaccion con `SELECT ... FOR UPDATE`.
- La rotacion y la deteccion de reuso viven en `TypeOrmRefreshTokenRepository.rotate`.
- Un token revocado presentado fuera de la ventana de gracia (`JWT_REFRESH_REUSE_GRACE_MS`) se interpreta como reuso real y revoca toda la familia (`401 REFRESH_REUSE_DETECTED`).
- Un token revocado presentado dentro de la ventana de gracia se interpreta como renovacion concurrente legitima (`401 REFRESH_TOKEN_CONCURRENT_USE`) y no revoca la familia, garantizando que dos refresh simultaneos dejen un unico token valido.
- Un token vencido responde `401 REFRESH_TOKEN_EXPIRED`; un token inexistente responde `401 INVALID_REFRESH_TOKEN`.
- El refresh valida que el usuario siga existiendo y activo antes de emitir tokens nuevos.
- El login registra `auth.login_success`/`auth.login_failure`; el refresh registra `auth.refresh_success`/`auth.refresh_failure` en `audit_logs`.
- El metadata de auditoria del refresh solo incluye `email` y el motivo; nunca tokens ni hashes.

## Seguridad
- Nunca retornar hashes de password ni hashes de refresh tokens.
- Usar secretos desde `ConfigService`.
- Mantener expiracion, issuer y audience configurables por entorno.
- El TTL del refresh token se configura con `JWT_REFRESH_TOKEN_TTL_MS` (default 7 dias).