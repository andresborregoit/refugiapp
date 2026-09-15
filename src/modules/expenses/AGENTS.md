# Reglas para `expenses`

## Responsabilidad
- Gestiona gastos asociados a animales.
- Permite vincular comprobantes/tickets mediante assets del modulo `media`.

## Convenciones
- Guardar importes como `amountCents` para evitar errores de punto flotante.
- `amountCents` debe ser mayor o igual a 0 en DTO, dominio y PostgreSQL.
- Cada gasto debe referenciar `animalId`.
- Comprobantes deben subirse con `media` y referenciarse por `ticketMediaId`.
- No guardar binarios ni URLs externas directamente fuera del modelo de media.
- La entidad de dominio `Expense` incluye `description`, `ticketMediaId`, `createdByUserId`, `createdAt` y `updatedAt`.

## Escritura
- `POST /expenses` requiere JWT y admite solo `admin` y `shelter_manager`.
- El caso de uso valida que el animal exista (404) y que el comprobante exista en `media_assets` cuando se informa `ticketMediaId` (404 si no existe).
- `amountCents` es un entero no negativo; la moneda es un codigo de 3 caracteres y `description` se limita a 180 caracteres.
- El usuario creador se persiste en `createdByUserId` tomado del contexto autenticado (`@CurrentUser()`).
- `currency` y `description` se normalizan con trim en el caso de uso.

## Baja logica
- `DELETE /expenses/:id` requiere JWT y admite solo `admin` y `shelter_manager`.
- Aplica soft-delete mediante `deletedAt`; no se permite borrado fisico desde HTTP.
- El caso de uso recibe el `actorId` autenticado y registra `expense.create` y `expense.soft_delete` en `audit_logs`.

## Consultas
- `GET /expenses` requiere JWT y admite los tres roles autenticados.
- `GET /animals/:animalId/expenses` requiere JWT y admite los tres roles autenticados; valida que el animal exista (404) y siempre filtra por `animalId`.
- Los listados usan paginacion con `page` minimo 1, `limit` entre 1 y 100, default `page=1` y `limit=20`.
- El listado global admite filtros opcionales por `animalId`, `category` y rango de fechas `from`/`to` sobre `incurredAt`.
- El orden es cronologico inverso y determinista: `incurredAt DESC, id DESC`.
- Si `from` es posterior a `to`, el caso de uso responde 400 `INVALID_DATE_RANGE`.

## Datos
- Mantener categorias en `ExpenseCategory`.
- Moneda default actual: `ARS`; cambiar solo si el producto lo requiere.