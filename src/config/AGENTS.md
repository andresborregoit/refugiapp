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
