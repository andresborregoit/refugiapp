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
- La escritura del hash por cambio de contraseña se expone al caso de uso de `auth`; `users` no valida tokens de recuperacion ni envia notificaciones.
- Los endpoints de creacion, activacion y desactivacion de usuarios requieren `admin` mediante `JwtAuthGuard`, `RolesGuard` y `@Roles(UserRole.ADMIN)`.
- `GET /users/me` requiere autenticacion JWT y admite los roles `admin`, `shelter_manager` y `veterinarian` mediante `JwtAuthGuard`, `RolesGuard` y `@Roles`.
- `GET /users/me` devuelve el perfil completo (`UserResponseDto`) consultando el repositorio por el `id` del JWT, no replica el payload; responde `404 RESOURCE_NOT_FOUND` si el usuario no existe.
- `GET /users` devuelve una pagina determinista de usuarios solo para `admin`, incluye cuentas activas e inactivas mediante `withDeleted`, ordena por `createdAt DESC` e `id ASC`, y nunca expone `passwordHash`.
- `createUser`, `deactivateUser` y `activateUser` reciben el `actorId` autenticado y registran eventos en `audit_logs` (`user.create`, `user.deactivate`, `user.activate`, `user.role_assign`).
- Los eventos de auditoria nunca incluyen `passwordHash` ni passwords; `metadata` solo lleva `email` y `roles`.

## Relacion con `veterinarians`
- El modulo `veterinarians` puede crear un usuario con rol `veterinarian` (alta conjunta atomica) o reutilizar un usuario existente no vinculado y otorgarle ese rol. No duplicar emails: `users.email` es unico y el repositorio de veterinarios mapea la violacion de unicidad a `409 EMAIL_ALREADY_EXISTS`.
- `VeterinarianResponseDto` referencia `UserResponseDto` para exponer el perfil vinculado sin `passwordHash`; mantener ese contrato al modificar `UserResponseDto`.
