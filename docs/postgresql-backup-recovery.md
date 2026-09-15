# Backup y recuperacion de PostgreSQL

## Objetivos iniciales

| Ambiente    | Estrategia                               | Frecuencia                             | Retencion                                             | RPO        | RTO         |
| ----------- | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------- | ---------- | ----------- |
| Development | Dump logico privado                      | Semanal                                | 7 dias                                                | 7 dias     | 1 dia habil |
| Staging     | Dump logico privado                      | Diario, 02:00 UTC                      | 14 dias                                               | 24 horas   | 8 horas     |
| Production  | PITR del proveedor y dump logico privado | PITR continuo y dump diario, 02:00 UTC | PITR 7 dias, diarios 35 dias, ultimo mensual 12 meses | 15 minutos | 4 horas     |

El RPO de 15 minutos de production exige que la recuperacion a un punto en el tiempo del proveedor este habilitada y supervisada. Si esa capacidad no esta disponible, el RPO efectivo pasa a ser 24 horas y debe registrarse como riesgo operativo.

## Almacenamiento y seguridad

- Guardar dumps en un bucket privado separado del runtime, con cifrado administrado por KMS, versionado y bloqueo de acceso publico.
- Aplicar una identidad exclusiva de backup con permisos de escritura y una identidad de restauracion con lectura temporal aprobada.
- No incluir URLs de conexion, passwords, tokens ni secretos en nombres, metadata, logs o tickets.
- El comando rechaza `BACKUP_VISIBILITY` distinto de `private`, crea archivos con permiso `0600` y genera un checksum SHA-256.
- No publicar dumps como artifacts de CI. Aunque no contengan credenciales de conexion, contienen informacion clinica, financiera y operativa sensible.
- Auditar trimestralmente permisos, cifrado, retencion y eventos de descarga.

## Crear un backup

El host o job debe tener `pg_dump`, `pg_restore` y `psql` de la misma version mayor que el servidor. Los comandos rechazan combinaciones de versiones mayores diferentes para evitar dumps que no puedan restaurarse limpiamente.

```bash
export DATABASE_URL='<conexion-desde-el-gestor-de-secretos>'
export APP_ENV='production'
export BACKUP_DIR='/var/lib/refugiapp-backups'
export BACKUP_RETENTION_DAYS='35'
export BACKUP_VISIBILITY='private'
npm run backup:postgres
```

Subir el `.dump` y su `.sha256` al almacenamiento privado. Eliminar la copia local despues de confirmar carga, checksum, cifrado y politica de ciclo de vida.

## Restaurar

1. Declarar un incidente o una prueba programada y asignar responsables.
2. Seleccionar el backup por fecha, checksum y ambiente. Descargarlo a un host aislado.
3. Crear una base vacia cuyo nombre incluya `restore`, `recovery` o `test`.
4. Configurar la URL destino y confirmar literalmente el nombre de esa base:

```bash
export BACKUP_FILE='/ruta/refugiapp-production-AAAAMMDDTHHMMSSZ.dump'
export RESTORE_DATABASE_URL='<conexion-a-refugiapp_recovery>'
export RESTORE_CONFIRMATION='refugiapp_recovery'
npm run restore:postgres
```

5. Verificar migraciones, cantidades por tablas criticas, relaciones, fechas extremas y una muestra funcional de registros clinicos, gastos y auditoria.
6. Arrancar una API aislada contra la base restaurada y validar `/api/v1/health/ready` y smoke tests.
7. Para recuperar production, preferir promover la base recuperada y cambiar la conexion. Una restauracion sobre una base no aislada requiere `ALLOW_IN_PLACE_RESTORE=true`, aprobacion del Incident Commander y ventana de mantenimiento.
8. Revocar accesos temporales y eliminar copias locales de forma segura.

## Pruebas de recuperacion

- Ejecutar mensualmente una restauracion automatizada en una base aislada.
- Ejecutar trimestralmente un simulacro supervisado con validacion funcional y medicion real de RPO/RTO.
- El CI ejecuta `npm run backup:verify`: crea datos de prueba para las areas clinica, financiera y operativa, genera un dump, valida permisos y ausencia de secretos canarios, restaura en otra base y compara datos y migraciones.
- Registrar fecha, backup usado, duracion, resultado, RPO/RTO observado y acciones correctivas.

## Responsables e incidente

| Rol                    | Responsabilidad                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Incident Commander     | Declara severidad, coordina decisiones, aprueba recuperacion y comunica estado       |
| Platform on-call       | Detiene escrituras si corresponde, ejecuta backup/restauracion y conserva evidencias |
| Database Owner         | Selecciona el punto de recuperacion, valida integridad y autoriza el cambio de base  |
| Security/Privacy       | Revisa exposicion, accesos al backup y obligaciones de notificacion                  |
| Product/Clinical Owner | Valida informacion clinica, financiera y operativa recuperada                        |

Ante un incidente:

1. Abrir un canal y registro de incidente; anotar deteccion, alcance y ultima escritura confiable.
2. Contener el dano: suspender jobs o escrituras sin destruir la base afectada.
3. Determinar el punto objetivo segun RPO y elegir PITR o dump logico.
4. Restaurar siempre primero en aislamiento y completar las verificaciones.
5. Aprobar el cambio, habilitar trafico gradualmente y vigilar errores y consistencia.
6. Comunicar recuperacion, RPO/RTO real y posible perdida de datos.
7. Realizar revision post-incidente en cinco dias habiles y asignar acciones con responsable y fecha.
