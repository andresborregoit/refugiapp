# Reglas del proyecto Refugiapp API

## Idioma
- El codigo, nombres de clases, metodos, variables, commits tecnicos y errores internos deben estar en ingles.
- La documentacion para humanos debe estar en espanol.

## Arquitectura
- Leer `architecture.md` antes de modificar estructura, entidades, relaciones o persistencia.
- La API vive bajo el prefijo global `/api/v1`.
- Cada dominio debe organizarse en `domain`, `application`, `infrastructure` e `interfaces`.
- `domain` no debe importar NestJS, TypeORM, Cloudinary ni detalles HTTP.
- `application` contiene casos de uso y coordinacion de servicios del dominio.
- `infrastructure` contiene TypeORM, Cloudinary, integraciones externas y adaptadores.
- `interfaces` contiene controllers, DTOs y contratos HTTP.
- Los repositorios se definen como contratos en `domain/repositories` y se implementan en `infrastructure`.

## Datos
- Todos los IDs principales deben ser UUID.
- PostgreSQL/Neon es la base de datos objetivo.
- TypeORM debe permanecer aislado en infrastructure y common entities.
- No activar `TYPEORM_SYNCHRONIZE=true` en produccion. Usar migraciones.

## Seguridad
- La autenticacion objetivo es JWT.
- Roles iniciales: `admin`, `shelter_manager`, `veterinarian`.
- No exponer `passwordHash`, secretos JWT, credenciales Neon ni credenciales Cloudinary.

## Convenciones
- Mantener controllers delgados: validan entrada HTTP y delegan.
- No implementar CRUD completo sin una tarea explicita.
- Agregar tests cuando se agregue comportamiento real.
- Actualizar el `AGENTS.md` del modulo si cambian responsabilidades o convenciones.
