# Reglas para `species`

## Responsabilidad
- Expone el catalogo versionado de especies y razas para los formularios de animales del frontend.
- Es un modulo de solo lectura: no persiste escrituras propias ni modifica datos de otros dominios.

## Convenciones
- El `slug` es la clave estable en ingles (`dog`, `cat`, `labrador-retriever`) y la usa el frontend para keyeo y fallback local; el `id` UUID es interno.
- `labelEs` es la etiqueta en español y solo se usa para display, nunca como clave.
- Las respuestas usan envelope `{ items: [...] }` y exponen unicamente `id`, `slug` y `labelEs` (en breeds tambien `speciesId`); no exponer `isActive`, `sortOrder` ni timestamps.
- Mantener el mapeo dominio a DTO en el controller (controllers delgados que transforman a respuesta HTTP).

## Consultas
- `GET /species` lista especies activas (`isActive=true`) sin paginacion, con orden `sortOrder ASC, id ASC`.
- `GET /species/:id/breeds` lista razas activas de la especie por UUID, con orden `labelEs ASC, id ASC`.
- Ambos endpoints requieren JWT (`JwtAuthGuard`, `RolesGuard`) y admiten `admin`, `shelter_manager` y `veterinarian`.
- Si la especie no existe o esta inactiva, `GET /species/:id/breeds` responde `404 RESOURCE_NOT_FOUND`.
- TypeORM excluye soft-deleted por defecto; las consultas siempre filtran `isActive=true`.

## Datos
- La fuente de verdad del seed inicial es la migracion `1792000000000-AddSpeciesCatalog` (idempotente con `ON CONFLICT DO NOTHING`): `dog/Perro`, `cat/Gato`, `rabbit/Conejo`, `bird/Ave`, `other/Otro` y razas comunes por especie con `other/Otra`.
- `breeds.speciesId` tiene `ON DELETE RESTRICT`: no se puede borrar una especie con razas.

## Alcance
- No tocar `animals.species`/`animals.breed`: siguen siendo texto libre. La validacion estricta de `POST/PATCH /animals` contra el catalogo queda fuera de este alcance (S11).