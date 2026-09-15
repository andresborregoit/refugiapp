# Reglas para `expenses`

## Responsabilidad
- Gestiona gastos asociados a animales.
- Permite vincular comprobantes/tickets mediante assets del modulo `media`.

## Convenciones
- Guardar importes como `amountCents` para evitar errores de punto flotante.
- Cada gasto debe referenciar `animalId`.
- Comprobantes deben subirse con `media` y referenciarse por `ticketMediaId`.
- No guardar binarios ni URLs externas directamente fuera del modelo de media.

## Datos
- Mantener categorias en `ExpenseCategory`.
- Moneda default actual: `ARS`; cambiar solo si el producto lo requiere.
