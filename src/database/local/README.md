# Base local de ejemplo

Este proyecto usa PostgreSQL. La base de datos real no se ve como un unico archivo editable: vive dentro del servidor PostgreSQL que tengas instalado localmente o en Neon.

Los archivos visibles para desarrollo local son:

- `.env`: archivo local ignorado por Git. Debe contener la URL real de tu PostgreSQL local o Neon.
- `src/database/local/seed-demo.sql`: inserta datos de ejemplo para mostrar el modelo inicial.

## Como crearla sin Docker

Con PostgreSQL instalado localmente y `psql` disponible en la terminal, crear un usuario, password y base propios. No reutilizar estos placeholders literalmente:

```powershell
psql -U postgres -c "CREATE USER <local_user> WITH PASSWORD '<local_password>';"
psql -U postgres -c "CREATE DATABASE <local_database> OWNER <local_user>;"
```

Luego configurar `.env` sin versionarlo:

```env
DATABASE_URL=postgresql://<local_user>:<local_password>@localhost:5432/<local_database>
DB_SSL=false
TYPEORM_SYNCHRONIZE=false
```

Ejecutar las migraciones:

```powershell
npm.cmd run migration:run
```

Cargar datos demo solo si corresponde:

```powershell
psql "postgresql://<local_user>:<local_password>@localhost:5432/<local_database>" -f src/database/local/seed-demo.sql
```

Levantar el backend:

```powershell
npm.cmd run start:dev
```

Endpoints visibles:

- `http://localhost:3000/api/v1`
- `http://localhost:3000/api/v1/docs`

Nota: mantener `TYPEORM_SYNCHRONIZE=false` y usar migraciones tambien en desarrollo local.
