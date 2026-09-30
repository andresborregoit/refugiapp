# Reglas para `veterinarians`

## Responsabilidad
- Gestiona veterinarios responsables del seguimiento clinico.
- Puede vincular un veterinario con un usuario de autenticacion mediante `userId`.
- `POST /veterinarians` puede crear un usuario con rol `veterinarian` y vincularlo en la misma transaccion (`createUser`), o reutilizar un usuario existente no vinculado por email.

## Convenciones
- Mantener datos profesionales aqui: matricula, contacto, estado activo.
- No guardar credenciales aqui; pertenecen a `users`.
- No guardar registros clinicos aqui; pertenecen a `medical-records`.
- La alta conjunta (vet + usuario) es atomica: `createWithUser` ejecuta la insercion del usuario y del veterinario dentro de una misma transaccion en `infrastructure`. Si falla el segundo paso, se revierte todo; no quedan usuarios huerfanos.
- `userId` y `createUser` son mutuamente excluyentes en `POST /veterinarians`; enviar ambos responde `400 VET_USER_PAYLOAD_CONFLICT`.
- Cuando `createUser.email` ya existe en un usuario activo no vinculado, se reutiliza ese usuario, se le agrega el rol `veterinarian` (si falta) y se vincula; no se duplica la cuenta.
- `createUser` requiere password (minimo 12 caracteres) y email, ya sea anidado o el `email` del perfil del veterinario; si falta ambos responde `400 VET_CREATE_USER_EMAIL_REQUIRED`.
- Las respuestas (`VeterinarianResponseDto`) incluyen el objeto `user` vinculado sin `passwordHash`; las consultas hacen `leftJoin` para evitar N+1.

## Datos
- `licenseNumber` debe ser unico (`409 LICENSE_NUMBER_ALREADY_EXISTS`).
- `email` del usuario auto-creado debe ser unico (`409 EMAIL_ALREADY_EXISTS`).
- `userId` no puede apuntar a un usuario ya vinculado (`409 USER_ALREADY_LINKED_TO_VETERINARIAN`).
- `isActive` permite desactivar sin borrar historial.

## Seguridad
- Escritura (`POST`, `PATCH`, `POST /:id/deactivate`) solo para `admin` y `shelter_manager`; lectura para los tres roles.
- El usuario auto-creado siempre recibe el rol `veterinarian`, nunca `admin` ni `shelter_manager`.
- Los eventos de auditoria registrados desde el servicio son `user.create` (usuario nuevo) y `user.role_assign` (rol agregado a usuario reutilizado); `metadata` solo lleva `email` y `roles`, nunca passwords ni hashes.