# Reglas para `src/common`

## Responsabilidad
- Contiene piezas transversales compartidas por varios modulos.
- Puede incluir enums globales, decoradores, guards, filtros, excepciones e interfaces comunes.
- Contiene helpers transversales de seguridad que no pertenecen a un dominio concreto.
- Contiene la infraestructura transversal de observabilidad: middleware de correlation ID, `AsyncLocalStorage`, logger JSON, sanitizador de logs e interceptores de acceso.

## Convenciones
- No agregar logica de negocio especifica de animales, gastos, veterinarios o usuarios.
- Los guards y decoradores deben ser reutilizables y no depender de controllers concretos.
- Las excepciones comunes deben expresar errores tecnicos o de aplicacion general.
- Los helpers de hashing no deben contener logica HTTP ni depender de TypeORM.
- `BaseOrmEntity` solo debe contener columnas comunes de persistencia.

## Observabilidad
- El correlation ID se lee de `x-request-id` o se genera, se guarda en `AsyncLocalStorage` y se devuelve en el header de respuesta.
- `JsonLoggerService` es el logger global; no usar `console.log` ni serializar objetos directamente en los logs.
- Todo valor logueado pasa por `sanitizeLogValue`; nunca loguear passwords, tokens ni credenciales.

## Seguridad
- Mantener `UserRole` como fuente unica para roles globales.
- Los guards deben asumir que `request.user` viene de una estrategia de autenticacion previa.
- Usar `JwtAuthGuard` para autenticacion y `RolesGuard` con `@Roles` para autorizacion declarativa; no duplicar comprobaciones de roles en controllers.
