# Reglas para `animals`

## Responsabilidad
- Gestiona la ficha general del animal dentro del refugio.
- Contiene el historial general no clinico mediante eventos del animal.

## Convenciones
- No guardar datos clinicos detallados aqui; usar `medical-records`.
- No guardar comprobantes de gastos aqui; usar `expenses` y `media`.
- `AnimalHistoryEvent` representa eventos generales: ingreso, traslado, cambio de estado, adopcion o notas.
- Las fotos se referencian por UUID hacia `media_assets`.

## Datos
- Mantener estados del animal en `AnimalStatus`.
- Mantener sexo biologico/desconocido en `AnimalSex`.

## Consultas
- `GET /animals` admite paginacion con `page` minimo 1 y `limit` entre 1 y 100; el default es page 1 y limit 20.
- Los filtros combinables son `status`, `species`, `sex` y busqueda parcial por `name`.
- El listado y la consulta individual excluyen registros con `deletedAt` mediante el comportamiento por defecto de TypeORM.
- El orden estable del listado es `createdAt ASC, id ASC`.
- La consulta y el listado requieren JWT y admiten `admin`, `shelter_manager` y `veterinarian`.
