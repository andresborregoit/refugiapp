# Reglas para `adoptions`

## Responsabilidad
- Gestiona fichas de adoptantes, solicitudes por animal y el historial de adopciones.
- No modifica estados del animal fuera de la aprobacion transaccional de una solicitud pendiente.

## Seguridad y permisos
- `admin` y `shelter_manager` pueden crear adoptantes, registrar/listar solicitudes y aprobar adopciones.
- Los tres roles pueden consultar el historial de adopciones; el historial no expone datos de contacto.
- Solo `admin` y `shelter_manager` pueden consultar la ficha completa del adoptante.

## Invariantes
- Solo se admiten solicitudes para animales en `available_for_adoption`.
- Solo puede existir una solicitud `pending` por pareja animal/adoptante.
- Aprobar una solicitud bloquea solicitud y animal, crea la adopcion, marca solicitudes competidoras como `rejected`, cambia el animal a `adopted` y crea un evento `status_change` en una transaccion.
- `adoptedAt` no puede ser futuro ni anterior a `submittedAt`.
- Los controllers permanecen delgados y TypeORM vive exclusivamente en `infrastructure`.
