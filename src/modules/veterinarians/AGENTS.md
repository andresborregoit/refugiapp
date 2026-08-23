# Reglas para `veterinarians`

## Responsabilidad
- Gestiona veterinarios responsables del seguimiento clinico.
- Puede vincular un veterinario con un usuario de autenticacion mediante `userId`.

## Convenciones
- Mantener datos profesionales aqui: matricula, contacto, estado activo.
- No guardar credenciales aqui; pertenecen a `users`.
- No guardar registros clinicos aqui; pertenecen a `medical-records`.

## Datos
- `licenseNumber` debe ser unico.
- `isActive` permite desactivar sin borrar historial.
