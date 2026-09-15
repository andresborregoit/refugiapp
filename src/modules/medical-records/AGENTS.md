# Reglas para `medical-records`

## Responsabilidad
- Gestiona historial clinico y veterinario de animales.
- Registra consultas, vacunas, cirugias, tratamientos, desparasitaciones y resultados.

## Convenciones
- Cada registro clinico debe referenciar `animalId`.
- `veterinarianId` es opcional hasta que el flujo de veterinarios este completo.
- Adjuntos clinicos deben guardarse en `media` y referenciarse por UUID.
- No mezclar historial general del refugio con historial clinico.

## Seguridad
- Proteger escritura con roles adecuados cuando se implementen endpoints reales.
