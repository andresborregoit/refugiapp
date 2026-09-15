# Reglas para `src/config`

## Responsabilidad
- Centraliza configuracion de entorno, TypeORM, JWT, Cloudinary y bootstrap de infraestructura.
- Toda variable nueva de entorno debe declararse en `.env.example` y validarse en `validation.schema.ts`.

## Convenciones
- Usar `registerAs` para configuraciones agrupadas.
- No leer `process.env` directamente fuera de archivos de config, salvo scripts CLI justificados.
- No hardcodear secretos ni credenciales.
- Configurar Neon mediante `DATABASE_URL`.

## Base de datos
- Mantener `TYPEORM_SYNCHRONIZE=false` por defecto.
- Agregar migraciones en `src/database/migrations`.
- Neon requiere SSL; mantener `DB_SSL=true` salvo entorno local controlado.

## Rate limiting y seguridad HTTP
- La configuracion de rate limiting vive en `throttle.config.ts` y las opciones del `ThrottlerModule` en `throttler.factory.ts`.
- Los headers de seguridad y el CORS se centralizan en `src/common/security/http-security.ts` y se aplican desde `main.ts`.
- Toda variable nueva (`THROTTLE_*`, `FRONTEND_ORIGINS`, `TRUST_PROXY`) debe declararse en `.env.example` y validarse en `validation.schema.ts`.
