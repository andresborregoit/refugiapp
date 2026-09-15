# Reglas para `auth`

## Responsabilidad
- Maneja autenticacion JWT, estrategias Passport, guards de autenticacion y emision de tokens.
- No debe almacenar usuarios directamente ni conocer detalles de persistencia de usuarios.

## Convenciones
- DTOs HTTP en `interfaces/dto`.
- Estrategias y guards en `infrastructure`.
- Payload JWT minimo: `sub`, `email`, `roles`.
- La validacion de credenciales delega en `UsersService` y en el contrato de repositorio de usuarios.

## Seguridad
- Nunca retornar hashes de password.
- Usar secretos desde `ConfigService`.
- Mantener expiracion, issuer y audience configurables por entorno.
- El login registra `auth.login_success` y `auth.login_failure` en `audit_logs`; el metadata solo incluye `email` y el motivo, nunca el password ni el token.

## Rate limiting
- `POST /auth/login` se marca con `@LoginEndpoint()` para aplicar el limite estricto configurable (`THROTTLE_LOGIN_LIMIT`), independiente del limite general.
- No loguear credenciales ni tokens al rechazar por throttle.
