# Base local de ejemplo

Este proyecto usa PostgreSQL. La base de datos real no se ve como un unico archivo editable: vive dentro del servidor PostgreSQL que tengas instalado localmente o en Neon.

Los archivos visibles para desarrollo local son:

- `.env`: apunta el backend a `postgresql://refugiapp:refugiapp@localhost:5432/refugiapp_bd`.
- `src/database/local/seed-demo.sql`: inserta datos de ejemplo para mostrar el modelo inicial.

## Como crearla sin Docker

Con PostgreSQL instalado localmente y `psql` disponible en la terminal:

```powershell
psql -U postgres -c "CREATE USER refugiapp WITH PASSWORD 'refugiapp';"
psql -U postgres -c "CREATE DATABASE refugiapp_bd OWNER refugiapp;"
```

Luego levantar la API una vez para que TypeORM cree las tablas en modo desarrollo:

```powershell
npm.cmd run start:dev
```

Con el backend ya conectado al menos una vez, cortar el proceso y cargar datos demo:

```powershell
psql "postgresql://refugiapp:refugiapp@localhost:5432/refugiapp_bd" -f src/database/local/seed-demo.sql
```

Despues volver a levantar:

```powershell
npm.cmd run start:dev
```

Endpoints visibles:

- `http://localhost:3000/api/v1`
- `http://localhost:3000/api/v1/docs`

Nota: `TYPEORM_SYNCHRONIZE=true` esta pensado solo para esta demo local. En produccion debe quedar en `false` y usarse migraciones.
