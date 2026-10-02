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
- Los endpoints de creacion, edicion, activacion y desactivacion de usuarios requieren `admin` mediante `JwtAuthGuard`, `RolesGuard` y `@Roles(UserRole.ADMIN)`.
- `GET /users/me` requiere autenticacion JWT y admite los roles `admin`, `shelter_manager` y `veterinarian` mediante `JwtAuthGuard`, `RolesGuard` y `@Roles`.
- `GET /users/me` devuelve el perfil completo (`UserResponseDto`) consultando el repositorio por el `id` del JWT, no replica el payload; responde `404 RESOURCE_NOT_FOUND` si el usuario no existe.
- `GET /users` devuelve una pagina determinista de usuarios solo para `admin`, incluye cuentas activas e inactivas mediante `withDeleted`, ordena por `createdAt DESC` e `id ASC`, y nunca expone `passwordHash`.
- `PATCH /users/:id` edita parcialmente nombre, apellido, email y roles solo para `admin`. Solo actualiza los campos enviados (`undefined` no se convierte en `null`); un payload vacio responde `400 EMPTY_UPDATE_PAYLOAD`. El email se normaliza a minusculas y el conflicto responde `409 EMAIL_ALREADY_EXISTS`.
- Quitar el rol `admin` esta protegido: si el objetivo es el ultimo admin activo responde `409 LAST_ADMIN_FORBIDDEN`, y un admin tampoco puede quitarse su propio rol `admin` (`409 LAST_ADMIN_FORBIDDEN`).
- `createUser`, `deactivateUser`, `activateUser` y `updateUser` reciben el `actorId` autenticado y registran eventos en `audit_logs` (`user.create`, `user.deactivate`, `user.activate`, `user.role_assign`). `updateUser` solo audita `user.role_assign` cuando los roles cambian (con `previousRoles` y `roles`); los cambios de solo perfil no generan eventos porque no existe `user.update` en el enum de auditoria.
- Los eventos de auditoria nunca incluyen `passwordHash` ni passwords; `metadata` solo lleva `email` y `roles`.

## Relacion con `veterinarians`
- El modulo `veterinarians` puede crear un usuario con rol `veterinarian` (alta conjunta atomica) o reutilizar un usuario existente no vinculado y otorgarle ese rol. No duplicar emails: `users.email` es unico y el repositorio de veterinarios mapea la violacion de unicidad a `409 EMAIL_ALREADY_EXISTS`.
- `VeterinarianResponseDto` referencia `UserResponseDto` para exponer el perfil vinculado sin `passwordHash`; mantener ese contrato al modificar `UserResponseDto`.
