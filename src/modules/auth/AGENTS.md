# Reglas para `auth`

## Responsabilidad
- Maneja autenticacion JWT, estrategias Passport, guards de autenticacion y emision de tokens.
- No debe almacenar usuarios directamente ni conocer detalles de persistencia de usuarios.

## Convenciones
- DTOs HTTP en `interfaces/dto`.
- Estrategias y guards en `infrastructure`.
- Payload JWT minimo: `sub`, `email`, `roles`.
- Validacion de credenciales debe delegar en servicios/repositorios de usuarios cuando se implemente.

## Seguridad
- Nunca retornar hashes de password.
- Usar secretos desde `ConfigService`.
- Mantener expiracion, issuer y audience configurables por entorno.
