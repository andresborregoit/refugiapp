# Login desde el frontend

## Credenciales locales de demostracion

Estas credenciales son solo para desarrollo local:

```text
Email: admin@example.com
Password: refugio12345
Rol: admin
```

El usuario se crea o actualiza con `npm run seed:admin`. La contrasena se guarda
como un hash bcrypt en PostgreSQL y nunca en texto plano.

No usar estas credenciales en staging ni en produccion.

## URL base

Con la configuracion local actual, la API esta disponible en:

```text
http://localhost:3000/api/v1
```

Swagger esta disponible en:

```text
http://localhost:3000/api/v1/docs
```

## Iniciar sesion

Enviar una solicitud `POST /auth/login`:

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "refugio12345"
}
```

La respuesta contiene un JWT de acceso y un refresh token opaco:

```json
{
  "accessToken": "<jwt-de-acceso>",
  "tokenType": "Bearer",
  "expiresIn": "1d",
  "refreshToken": "<token-opaco>"
}
```

Si el email o la contrasena no son validos, la API responde `401 Unauthorized`.

## Consumir endpoints protegidos

Enviar el `accessToken` en el header `Authorization`:

```http
GET http://localhost:3000/api/v1/users/me
Authorization: Bearer <jwt-de-acceso>
```

Ejemplo con `fetch`:

```ts
const response = await fetch('http://localhost:3000/api/v1/users/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

## Renovar la sesion

Cuando expire el token de acceso, enviar el refresh token vigente a
`POST /auth/refresh`:

```http
POST http://localhost:3000/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<token-opaco>"
}
```

La API devuelve un nuevo `accessToken` y rota el `refreshToken`. El frontend debe
reemplazar ambos valores anteriores de forma atomica. Cada refresh token es de un
solo uso; reutilizar uno viejo puede invalidar la familia completa de la sesion.

En desarrollo local, el refresh token dura 30 dias mediante
`JWT_REFRESH_TOKEN_TTL_MS=2592000000`.

## Cerrar la sesion en el frontend

La API actual no publica un endpoint `POST /auth/logout`. Para cerrar la sesion,
el frontend debe eliminar de su estado y almacenamiento el `accessToken` y el
`refreshToken`. El refresh token persistido en el backend expirara segun su TTL.

## Almacenamiento recomendado

Mantener el access token en memoria reduce su exposicion. En aplicaciones moviles,
guardar el refresh token en el almacenamiento seguro del sistema operativo. En un
frontend web, evitar `localStorage` cuando sea posible y no registrar tokens en la
consola ni en herramientas de observabilidad.
