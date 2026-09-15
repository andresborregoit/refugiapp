# Reglas para `users`

## Responsabilidad
- Gestiona usuarios internos del refugio y sus roles de acceso.
- Sirve como fuente de identidad para administradores, encargados y veterinarios con login.

## Convenciones
- La entidad de dominio `User` no debe depender de TypeORM.
- `UserOrmEntity` vive en infrastructure y puede contener `passwordHash`.
- Roles permitidos salen de `UserRole` en `src/common`.
- No mezclar perfil veterinario clinico con usuario de autenticacion; vincular por `userId` cuando aplique.

## Seguridad
- No exponer `passwordHash` en DTOs de respuesta.
- Usar el helper centralizado de hashing antes de persistir passwords.
- Los endpoints de creacion, activacion y desactivacion de usuarios requieren `admin` mediante `JwtAuthGuard`, `RolesGuard` y `@Roles(UserRole.ADMIN)`.
- `GET /users/me` requiere autenticacion JWT, pero admite los roles `admin`, `shelter_manager` y `veterinarian`.
- `createUser`, `deactivateUser` y `activateUser` reciben el `actorId` autenticado y registran eventos en `audit_logs` (`user.create`, `user.deactivate`, `user.activate`, `user.role_assign`).
- Los eventos de auditoria nunca incluyen `passwordHash` ni passwords; `metadata` solo lleva `email` y `roles`.
