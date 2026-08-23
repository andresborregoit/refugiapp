# Reglas para `media`

## Responsabilidad
- Gestiona metadata de archivos e imagenes almacenados en Cloudinary.
- Centraliza carpetas, public IDs, URLs seguras y relacion con entidades duenias.

## Convenciones
- No almacenar binarios en PostgreSQL.
- Cloudinary debe configurarse solo desde `ConfigService`.
- `ownerType` y `ownerId` determinan a que entidad pertenece el asset.
- Fotos de animales, tickets de gastos y adjuntos clinicos deben pasar por este modulo.

## Seguridad
- No exponer `CLOUDINARY_API_SECRET`.
- Las subidas firmadas y reglas de acceso se implementaran en una etapa posterior.
