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
