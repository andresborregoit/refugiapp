# Reglas para `dashboard`

## Responsabilidad
- Expone un read-model consolidado para el panel de control del refugio.
- `GET /dashboard/overview` devuelve indicadores globales y animales recientes.

## Convenciones
- Solo lectura: no persiste entidades propias ni modifica datos de otros dominios.
- Reutiliza `AnimalOrmEntity` y los enums del dominio `animals` (`AnimalStatus`).
- El repositorio es un contrato en `domain/repositories` e implementado con TypeORM en `infrastructure`.
- `DashboardAnimal` en dominio incluye `profilePhotoMediaId: string | null`.
- Los conteos se agrupan por `AnimalStatus` y siempre incluyen todos los estados (zero-fill).
- El listado de recientes usa `createdAt DESC, id DESC` con limite fijo `DASHBOARD_RECENT_ANIMALS_LIMIT` (5).
- Excluir soft-deleted usando el comportamiento por defecto de TypeORM (sin `withDeleted`).

## Seguridad
- `GET /dashboard/overview` requiere JWT y admite `admin`, `shelter_manager` y `veterinarian`.

## Datos
- No exponer `passwordHash` ni secretos.
- `profilePhotoMediaId` es nullable; serializar `null` explicitamente cuando no exista foto.

## Tests
- Contrato DTO vs respuesta del repositorio (presencia de `profilePhotoMediaId`).
- E2E de `/dashboard/overview` verificando presencia del campo, autorizacion y correlation ID.