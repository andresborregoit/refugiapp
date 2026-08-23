# Reglas para `src/common`

## Responsabilidad
- Contiene piezas transversales compartidas por varios modulos.
- Puede incluir enums globales, decoradores, guards, filtros, excepciones e interfaces comunes.

## Convenciones
- No agregar logica de negocio especifica de animales, gastos, veterinarios o usuarios.
- Los guards y decoradores deben ser reutilizables y no depender de controllers concretos.
- Las excepciones comunes deben expresar errores tecnicos o de aplicacion general.
- `BaseOrmEntity` solo debe contener columnas comunes de persistencia.

## Seguridad
- Mantener `UserRole` como fuente unica para roles globales.
- Los guards deben asumir que `request.user` viene de una estrategia de autenticacion previa.
