# Refugiapp: catálogo de pantallas y prompts de diseño

## Alcance verificado

Este catálogo se basa en `architecture.md`, `docs/openapi.json`, los controllers, DTOs, enums y permisos actuales del backend. Cada prompt solicita una sola pantalla de 390 × 844 px, realizable en React Native y coherente con el sistema visual elegido.

Pantallas ya diseñadas:

1. Dashboard.
2. Listado de animales.
3. Detalle del animal con la pestaña Resumen.
4. Alta de animal.

Pantallas o estados que faltan: los 23 prompts siguientes.

## Reglas visuales comunes

Todos los prompts conservan este sistema: fondo chocolate rojizo `#35231D`, tarjetas marrón arcilla `#50382E`, texto marfil `#FAF4E9`, texto secundario arena `#CCBEB1`, lima oliva `#B9DB62` para acciones y estados positivos, naranja tierra `#E5A14B` para advertencias o próximos, coral `#D96C5F` para errores o vencidos, azul mineral `#75A7B8` para información clínica y gris piedra `#8D8580` para estados inactivos. Títulos en Newsreader Semibold y contenido operativo en DM Sans. Los colores semánticos se reservan para iconos, bordes y etiquetas; nunca para grandes superficies.

---

## 1. Inicio de sesión

Backend: `POST /api/v1/auth/login`. Público.

```text
Diseña una única pantalla móvil de inicio de sesión para “Refugiapp”, 390 × 844 px. Mantén una estética orgánica, protectora, cálida y profesional: fondo #35231D, tarjetas #50382E, texto #FAF4E9 y #CCBEB1, acción principal #B9DB62, errores #D96C5F, Newsreader Semibold para títulos y DM Sans para controles. Muestra una composición editorial con el título “Refugiapp”, el mensaje “Cuidar también es organizar”, una fotografía real y discreta de un animal rescatado y un formulario con “Correo electrónico” y “Contraseña”, opción para mostrar la contraseña y botón “Ingresar”. Incluye un pequeño estado seguro “Acceso para personal autorizado”. Representa el formulario completo y habilitado, sin recuperación de contraseña, registro público, redes sociales ni selector de rol, porque esas funciones no existen en el backend. Prevé estados de validación, credenciales incorrectas, carga y sin conexión, pero no los muestres simultáneamente. Áreas táctiles mínimas de 44 px, teclado seguro, contraste alto, sin navegación inferior, sin marco de teléfono, sin gradientes brillantes, glassmorphism, 3D ni textos en inglés. Crear solamente esta pantalla.
```

## 2. Menú “Más”

Backend relacionado: `GET /api/v1/users/me`. Las opciones cambian según capacidades.

```text
Diseña una única pantalla móvil “Más” para Refugiapp, 390 × 844 px, con fondo #35231D, tarjetas #50382E, texto #FAF4E9/#CCBEB1, lima #B9DB62, naranja #E5A14B, coral #D96C5F, azul #75A7B8 y gris #8D8580; Newsreader Semibold y DM Sans. Encabezado “Más” y una tarjeta de perfil con avatar, “Andrés Borrego”, correo y etiqueta de rol “Administrador”. Organiza accesos en filas grandes: “Mi perfil”, “Veterinarios”, “Gastos”, “Historia clínica”, “Auditoría” y “Crear usuario”. Muestra únicamente opciones autorizadas: Auditoría y Crear usuario solo para admin; Veterinarios para admin y shelter_manager; Historia clínica para admin y veterinarian. Añade una sección “Aplicación” con “Conectividad” y “Acerca de”, y al final “Cerrar sesión” como acción local discreta, no destructiva visualmente. Navegación inferior fija con Inicio, Animales, Cuidados y Más; Más seleccionado en lima. No incluir notificaciones, configuración de contraseñas ni listado de usuarios. Prevé carga del perfil, error y sin conexión. Crear una sola pantalla profesional y accesible.
```

## 3. Mi perfil

Backend: `GET /api/v1/users/me`. Solo lectura.

```text
Diseña una única pantalla móvil “Mi perfil” para Refugiapp, 390 × 844 px, conservando la estética orgánica terrosa: #35231D, #50382E, #FAF4E9, #CCBEB1, acentos #B9DB62 y #75A7B8; Newsreader Semibold y DM Sans. Incluye botón volver, título “Mi perfil”, avatar con iniciales y nombre completo. Presenta en tarjetas de solo lectura: correo electrónico, nombre, apellido, roles asignados, estado “Activo”, fecha de creación y última actualización. Usa una etiqueta lima con icono y texto para Activo. Añade una sección “Permisos” que traduzca las capacidades del rol a lenguaje humano sin mostrar nombres técnicos. No incluyas editar perfil, cambiar contraseña, fotografía editable ni desactivar cuenta porque no existen endpoints para ello. Añade botón secundario “Cerrar sesión” como operación local. Contempla skeleton, error, sesión vencida y sin conexión, sin mostrarlos juntos. No navegación inferior si se abre desde Más; composición desplazable y accesible. Crear solamente esta pantalla.
```

## 4. Editar ficha del animal

Backend: `GET /api/v1/animals/:id`, `PATCH /api/v1/animals/:id`, carga opcional con `POST /api/v1/media/upload`. Roles: admin y shelter_manager.

```text
Diseña una única pantalla móvil “Editar animal” para Refugiapp, 390 × 844 px, siguiendo la identidad orgánica en #35231D y tarjetas #50382E, textos #FAF4E9/#CCBEB1, acción #B9DB62, información #75A7B8, error #D96C5F, Newsreader Semibold y DM Sans. Formulario desplazable precargado para Luna con fotografía editable, Nombre, Especie, Raza opcional, Sexo, Fecha de ingreso y Fecha de nacimiento opcional. Incluye cambiar o quitar foto. No muestres Estado: se modifica mediante un flujo separado. Tampoco agregues notas, peso, microchip o esterilización. Barra inferior fija con “Descartar” y botón lima “Guardar cambios”. Señala campos modificados de manera sutil y contempla confirmación al salir con cambios sin guardar. La fecha de nacimiento debe ser anterior o igual a la fecha de ingreso. Prevé carga inicial, validación, error de guardado, conflicto, sin conexión y éxito, pero representa solo el formulario listo. Solo una pantalla, sin navegación global, sin modal abierto y viable en React Native.
```

## 5. Cambiar estado del animal

Backend: `PATCH /api/v1/animals/:id/status`. Roles: admin y shelter_manager.

```text
Diseña un único estado de interfaz móvil para cambiar el estado de Luna en Refugiapp, 390 × 844 px. Muestra la ficha del animal atenuada detrás y un bottom sheet orgánico accesible en #50382E; fondo general #35231D, texto #FAF4E9/#CCBEB1, lima #B9DB62, naranja #E5A14B, coral #D96C5F, azul #75A7B8 y gris #8D8580; Newsreader Semibold y DM Sans. Título “Cambiar estado”, estado actual “En tratamiento” y opciones permitidas solamente: “Ingresado”, “Disponible” y “Fallecido”. No muestres “Adoptado” porque desde En tratamiento no es una transición válida. Cada opción debe tener icono, texto y color, no color solamente. Añade campo opcional “Fecha y hora del cambio” y botones “Cancelar” y “Confirmar cambio”. Para Fallecido utiliza un paso visual de cautela, sin dramatismo. No inventes motivo obligatorio. Prevé conflicto 409 si el estado cambió en otro dispositivo. Crear una sola composición con el sheet abierto, sin pantallas adicionales.
```

## 6. Historial general del animal

Backend: `GET /api/v1/animals/:animalId/events`. Todos los roles autenticados leen; creación solo admin y shelter_manager.

```text
Diseña una única pantalla móvil del detalle de Luna con la pestaña “Historial” seleccionada, 390 × 844 px. Usa fondo #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1 y acentos semánticos #B9DB62, #E5A14B, #D96C5F, #75A7B8, #8D8580; Newsreader Semibold y DM Sans. Conserva una cabecera compacta con foto, Luna y “En tratamiento”; debajo muestra las pestañas Resumen, Historial, Cuidados, Clínica, Gastos y Archivos. Historial debe presentar una línea temporal paginada con Ingreso, Cambio de estado, Traslado, Nota de comportamiento, Adopción y Nota general, cada evento con descripción, fecha/hora e icono. Filtro por tipo y scroll infinito. Botón “Agregar evento” solo para admin y shelter_manager; ocultarlo para veterinarian. No mezcles diagnósticos ni tratamientos. Incluye estados skeleton, vacío “Todavía no hay eventos registrados”, error parcial y sin conexión. Navegación inferior fija con Animales seleccionado. Crear únicamente esta pantalla.
```

## 7. Agregar evento general

Backend: `POST /api/v1/animals/:animalId/events`. Roles: admin y shelter_manager.

```text
Diseña una única pantalla móvil “Agregar evento” para Luna, 390 × 844 px, con estética orgánica Refugiapp: #35231D, #50382E, #FAF4E9, #CCBEB1, acción #B9DB62, advertencia #E5A14B y error #D96C5F; Newsreader Semibold y DM Sans. Incluye cabecera con volver, miniatura de Luna y texto “Evento general”. Formulario con selector obligatorio “Tipo de evento” limitado a Nota general, Nota de comportamiento y Traslado; área de texto “Descripción *” con contador hasta 1000 caracteres; y “Fecha y hora” opcional con valor actual por defecto. Explica discretamente que la fecha no puede ser futura ni anterior al ingreso. Barra fija con “Cancelar” y “Guardar evento”. No ofrezcas Ingreso, Cambio de estado ni Adopción, porque son eventos reservados al sistema. No incluyas contenido clínico ni adjuntos. Prevé validación, carga, error y sin conexión. Crear solamente esta pantalla, sin modal abierto ni navegación inferior.
```

## 8. Listado de cuidados

Backend: `GET /api/v1/care-tasks`, enriquecido en frontend con datos del animal. Todos leen; creación solo admin y shelter_manager.

```text
Diseña una única pantalla móvil “Cuidados” para Refugiapp, 390 × 844 px, con estética orgánica terrosa: fondo #35231D, tarjetas #50382E, texto #FAF4E9/#CCBEB1, lima #B9DB62 para completadas, naranja #E5A14B para pendientes próximas, coral #D96C5F para pendientes vencidas, gris #8D8580 para canceladas; Newsreader Semibold y DM Sans. Incluye título, contador, filtros por estado Pendientes/Completadas/Canceladas y selector de animal. Lista vertical paginada con título de tarea, nombre y avatar del animal, descripción breve, vencimiento y estado. El atraso se deriva comparando dueAt con la hora actual, no es un estado del backend. Botón flotante “+” solo para admin y shelter_manager. No muestres prioridad, tipo de tarea, responsable ni profesional asignado: esos campos no existen. Navegación inferior fija con Cuidados seleccionado. Incluye scroll infinito, skeleton, vacío, error parcial y banner sin conexión. Crear únicamente esta pantalla.
```

## 9. Detalle de tarea de cuidado

Backend: `GET /api/v1/care-tasks/:id`, completar, cancelar y editar según rol.

```text
Diseña una única pantalla móvil “Detalle del cuidado” para Refugiapp, 390 × 844 px, con #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1 y acentos #B9DB62/#E5A14B/#D96C5F/#8D8580; Newsreader Semibold y DM Sans. Muestra la tarea “Control veterinario”, animal Luna con acceso a su ficha, descripción, estado Pendiente, fecha de vencimiento, fecha de creación y última actualización. Si está vencida, usa un borde coral y texto “Vencida”, aclarando visualmente que sigue Pendiente. Para admin y shelter_manager muestra acciones “Editar”, “Completar tarea” y “Cancelar tarea”; para veterinarian vista de solo lectura. Completar y cancelar deben pedir confirmación en un estado posterior, no mostrar dos modales. Una tarea completada o cancelada no debe mostrar acciones de transición. No inventes prioridad, categoría ni responsable. Prevé loading, 404, conflicto 409, error y sin conexión. Crear solo esta pantalla.
```

## 10. Crear o editar tarea

Backend: `POST /api/v1/care-tasks`, `PATCH /api/v1/care-tasks/:id`. Roles: admin y shelter_manager.

```text
Diseña una única pantalla móvil de formulario “Nueva tarea” para Refugiapp, 390 × 844 px. Mantén #35231D, #50382E, #FAF4E9, #CCBEB1, botón #B9DB62, fechas próximas #E5A14B y errores #D96C5F; Newsreader Semibold y DM Sans. Incluye selector obligatorio de Animal con búsqueda, campo “Título *” de 3 a 160 caracteres, “Descripción (opcional)” multilínea y “Fecha y hora de vencimiento (opcional)”. Indica que el estado se crea automáticamente como Pendiente. Barra inferior fija con Cancelar y “Crear tarea”. Define que la variante Editar reutiliza el formulario, pero no permite cambiar animal ni estado y sí permite limpiar descripción o vencimiento. No añadas tipo, prioridad, recurrencia, responsable, veterinario ni recordatorios. Prevé búsqueda vacía de animales, validación, guardado, error, sin conexión y prevención de doble envío. Crear una sola pantalla con el formulario en estado normal.
```

## 11. Listado de historia clínica

Backend: `GET /api/v1/medical-records` o `GET /api/v1/animals/:animalId/medical-records`. Roles: admin y veterinarian.

```text
Diseña una única pantalla móvil “Historia clínica” para Refugiapp, 390 × 844 px, con estética orgánica y clínica: fondo #35231D, tarjetas #50382E, texto #FAF4E9/#CCBEB1, azul #75A7B8 como acento principal, lima #B9DB62 para acciones positivas, naranja #E5A14B y coral #D96C5F solo para alertas; Newsreader Semibold y DM Sans. Muestra una lista cronológica paginada de registros con animal, tipo, título, fecha y veterinario cuando exista. Filtros por tipo: Consulta, Vacunación, Desparasitación, Cirugía, Resultado de laboratorio, Tratamiento y Otro; rango de fechas y selector de animal en la variante global. Botón “+” para admin y veterinarian. Permite que el mismo diseño funcione dentro de la pestaña Clínica de Luna ocultando el selector de animal. No visible para shelter_manager. Incluye skeleton, vacío, error parcial y sin conexión. No expongas diagnósticos completos en la lista. Crear únicamente esta pantalla.
```

## 12. Detalle de registro clínico

Backend: `GET /api/v1/medical-records/:id`, medios asociados con `GET /api/v1/media`. Roles: admin y veterinarian.

```text
Diseña una única pantalla móvil “Registro clínico” para Refugiapp, 390 × 844 px. Usa #35231D, #50382E, #FAF4E9, #CCBEB1 y azul mineral #75A7B8 como identidad clínica, con #B9DB62 para acciones; Newsreader Semibold y DM Sans. Cabecera con animal Luna, tipo “Consulta”, título “Control general”, fecha y profesional “Dra. Sofía”. Secciones orgánicas para Diagnóstico, Tratamiento, Notas y Adjuntos; cuando un valor no exista, mostrar “Sin información registrada”. Adjuntos con miniaturas y apertura segura. Acciones “Editar” y “Eliminar” para admin y veterinarian; “Restaurar” únicamente para admin cuando el registro esté eliminado y sea accesible por un flujo administrativo. Eliminar requiere confirmación posterior. No mostrar shelter_manager. Prevé carga independiente de adjuntos, error parcial, 404 y sin conexión. Crear una sola pantalla, sin mostrar formularios ni modal abierto.
```

## 13. Crear o editar registro clínico

Backend: `POST /api/v1/medical-records`, `PATCH /api/v1/medical-records/:id`, carga de adjuntos con `POST /api/v1/media/upload`. Roles: admin y veterinarian.

```text
Diseña una única pantalla móvil “Nuevo registro clínico” para Refugiapp, 390 × 844 px, con #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1, azul #75A7B8 para lo clínico, lima #B9DB62 para guardar y coral #D96C5F para errores; Newsreader Semibold y DM Sans. Formulario desplazable con Animal obligatorio, Veterinario opcional, Tipo obligatorio, Título de 3 a 160 caracteres, Fecha y hora obligatoria, Diagnóstico opcional, Tratamiento opcional, Notas opcionales y Adjuntos hasta 10 archivos. Tipos exactos: Consulta, Vacunación, Desparasitación, Cirugía, Resultado de laboratorio, Tratamiento y Otro. La fecha no puede ser futura ni anterior al ingreso del animal. Barra fija con Cancelar y “Guardar registro”. La variante Editar reutiliza campos, permite desvincular veterinario y limpiar textos, pero no gestiona nuevos adjuntos mediante PATCH: los medios deben tratarse por su flujo propio. No visible para shelter_manager. Prevé carga, validación, veterinario inactivo, error y sin conexión. Una sola pantalla.
```

## 14. Listado de gastos

Backend: `GET /api/v1/expenses` o `GET /api/v1/animals/:animalId/expenses`. Todos leen; gestión solo admin y shelter_manager.

```text
Diseña una única pantalla móvil “Gastos” para Refugiapp, 390 × 844 px, con fondo #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1 y acentos discretos #B9DB62, #E5A14B, #75A7B8 y #8D8580; Newsreader Semibold y DM Sans. Presenta un resumen neutral del total visible sin usar verde como significado de dinero. Lista paginada con importe y moneda, categoría, descripción, animal y fecha. Filtros por animal, categoría y rango de fechas. Categorías exactas: Alimentación, Medicación, Veterinaria, Insumos, Transporte y Otro. Botón “+” solo para admin y shelter_manager; veterinarian puede leer sin acciones. El mismo diseño debe adaptarse a la pestaña Gastos de Luna ocultando el filtro de animal. Incluye skeleton, vacío, error y sin conexión. No inventes proveedor, método de pago ni estado de aprobación. Navegación inferior coherente si se abre desde Más. Crear una sola pantalla.
```

## 15. Detalle de gasto

Backend: `GET /api/v1/expenses/:id`, comprobante mediante `GET /api/v1/media/:id`. Todos leen; eliminación admin y shelter_manager.

```text
Diseña una única pantalla móvil “Detalle del gasto” para Refugiapp, 390 × 844 px, usando #35231D, #50382E, #FAF4E9/#CCBEB1 y acentos terrosos; Newsreader Semibold y DM Sans. Muestra importe “ARS 48.500” como dato principal neutral, categoría “Veterinaria”, descripción, fecha del gasto, animal Luna con acceso a su ficha, fecha de registro y persona creadora solo si se dispone del dato. Incluye tarjeta “Comprobante” con miniatura o estado “Sin comprobante”. Para admin y shelter_manager muestra “Eliminar gasto” como acción coral secundaria con confirmación posterior; veterinarian solo lectura. No incluyas editar porque el backend no ofrece PATCH. Prevé carga separada del comprobante, archivo no disponible, 404, error y sin conexión. No inventes proveedor, impuestos ni forma de pago. Crear únicamente esta pantalla.
```

## 16. Registrar gasto

Backend: `POST /api/v1/expenses`, comprobante opcional con `POST /api/v1/media/upload`. Roles: admin y shelter_manager.

```text
Diseña una única pantalla móvil “Registrar gasto” para Refugiapp, 390 × 844 px, con #35231D, #50382E, textos #FAF4E9/#CCBEB1, acción #B9DB62, información #75A7B8 y errores #D96C5F; Newsreader Semibold y DM Sans. Formulario con selector obligatorio de Animal, Categoría, Importe, moneda de tres letras preseleccionada “ARS”, Descripción de hasta 180 caracteres, Fecha y hora del gasto y Comprobante opcional con carga o fotografía. Categorías: Alimentación, Medicación, Veterinaria, Insumos, Transporte y Otro. El importe debe mostrarse en unidades para humanos y convertirse a centavos al enviar. Barra fija con Cancelar y “Registrar gasto”. No añadas proveedor, método de pago, cuotas, impuestos ni aprobación. Prevé validación, carga del comprobante, reintento, prevención de duplicados y sin conexión. Crear una sola pantalla sin navegación inferior ni modal abierto.
```

## 17. Archivos del animal

Backend: `GET /api/v1/media?ownerType=animal&ownerId=:id`, carga y eliminación según rol.

```text
Diseña una única pantalla móvil del detalle de Luna con la pestaña “Archivos” seleccionada, 390 × 844 px. Mantén #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1, acento informativo #75A7B8, acción #B9DB62 y eliminación #D96C5F; Newsreader Semibold y DM Sans. Incluye cabecera compacta de Luna, pestañas del detalle y una cuadrícula de archivos con miniatura, formato y tamaño cuando estén disponibles. Permite vista previa de imágenes y documentos mediante una acción posterior. Botón “Agregar archivo” para admin y shelter_manager. Veterinarian solo puede gestionar adjuntos clínicos en el contexto de un registro médico, por lo que no debe ver carga general en esta pestaña. Eliminación con menú contextual y confirmación, respetando permisos. Diferencia visualmente foto de perfil y adjuntos generales. Incluye progreso de carga, skeleton, vacío “No hay archivos adjuntos”, error parcial y sin conexión. No mezcles comprobantes ni documentos clínicos sin permiso. Crear una sola pantalla.
```

## 18. Listado de veterinarios

Backend: `GET /api/v1/veterinarians`. Todos leen; gestión admin y shelter_manager.

```text
Diseña una única pantalla móvil “Veterinarios” para Refugiapp, 390 × 844 px, con estética orgánica profesional en #35231D, #50382E, #FAF4E9/#CCBEB1, azul #75A7B8 y lima #B9DB62; Newsreader Semibold y DM Sans. Incluye búsqueda por nombre, filtro Activos/Inactivos y búsqueda por matrícula. Lista paginada con avatar de iniciales, nombre completo, matrícula, correo o teléfono cuando exista y etiqueta Activo/Inactivo. Botón flotante “+” solo para admin y shelter_manager; veterinarian puede consultar. No muestres especialidad, agenda, turnos ni cantidad de casos porque no existen. Navegación de regreso a Más. Estados de carga, vacío, error y sin conexión. Crear únicamente esta pantalla, con controles táctiles amplios y colores acompañados por texto e iconos.
```

## 19. Detalle del veterinario

Backend: `GET /api/v1/veterinarians/:id`; edición y desactivación según rol.

```text
Diseña una única pantalla móvil “Perfil veterinario” para Refugiapp, 390 × 844 px, con #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1, azul #75A7B8, lima #B9DB62 y gris #8D8580; Newsreader Semibold y DM Sans. Muestra iniciales, nombre completo, matrícula, estado activo, correo, teléfono, notas y vínculo con usuario interno cuando exista. Para admin y shelter_manager incluye acciones “Editar perfil” y “Desactivar”; veterinarian solo lectura. La desactivación debe explicarse como conservación del historial clínico y confirmarse en un paso posterior. No ofrezcas reactivar porque no existe endpoint. No incluyas especialidad, disponibilidad, agenda ni estadísticas. Prevé carga, 404, error y sin conexión. Crear solamente esta pantalla.
```

## 20. Crear o editar veterinario

Backend: `POST /api/v1/veterinarians`, `PATCH /api/v1/veterinarians/:id`. Roles: admin y shelter_manager.

```text
Diseña una única pantalla móvil “Nuevo veterinario” para Refugiapp, 390 × 844 px, con #35231D, #50382E, #FAF4E9/#CCBEB1, acción #B9DB62, información #75A7B8 y error #D96C5F; Newsreader Semibold y DM Sans. Formulario con Nombre, Apellido y Matrícula obligatorios; Correo, Teléfono, Notas y vínculo opcional con usuario interno. Explica que vincular una cuenta permite relacionar identidad de acceso y perfil profesional. Barra inferior con Cancelar y “Crear perfil”. La variante Editar reutiliza la pantalla y permite limpiar correo, teléfono, notas o vínculo. No incluyas especialidad, horarios, honorarios, fotografía ni contraseña. Prevé validación de correo, matrícula duplicada si corresponde, usuario ya vinculado, carga, error y sin conexión. Crear una sola pantalla sin navegación inferior.
```

## 21. Crear usuario interno

Backend: `POST /api/v1/users`. Solo admin.

```text
Diseña una única pantalla móvil “Crear usuario” para Refugiapp, 390 × 844 px, con fondo #35231D, tarjetas #50382E, textos #FAF4E9/#CCBEB1, acción #B9DB62, información #75A7B8 y errores #D96C5F; Newsreader Semibold y DM Sans. Formulario con Nombre, Apellido, Correo, Contraseña y Roles. Roles seleccionables: Administrador, Responsable del refugio y Veterinario, con descripciones breves de capacidades. Permite selección múltiple, oculta o muestra contraseña y presenta requisitos de longitud sin revelar reglas internas innecesarias. Barra fija con Cancelar y “Crear usuario”. Añade advertencia discreta al asignar Administrador. No diseñes listado, búsqueda, edición, restablecimiento de contraseña ni selección de usuario existente: esos endpoints no existen. Prevé correo duplicado, validación, carga, éxito y sin conexión. Crear únicamente esta pantalla, accesible solo desde Más para admin.
```

## 22. Registro de auditoría

Backend: `GET /api/v1/audit-logs`. Solo admin.

```text
Diseña una única pantalla móvil “Auditoría” para Refugiapp, 390 × 844 px, estética orgánica pero más técnica: #35231D, tarjetas #50382E, texto #FAF4E9/#CCBEB1, azul #75A7B8 para información, coral #D96C5F para accesos denegados y gris #8D8580 para datos técnicos; Newsreader Semibold y DM Sans. Lista cronológica paginada con acción traducida a español, tipo de recurso, fecha/hora, actor identificado por UUID abreviado cuando no haya datos de perfil y recurso abreviado. Filtros por acción, recurso, actor, identificador y rango de fechas. Incluye eventos de usuarios, registros clínicos, gastos, tareas, autenticación y accesos denegados. No muestres secretos, tokens, hashes ni metadata sensible. No inventes nombres de actores: el backend devuelve actorUserId. Incluye skeleton, vacío, error y sin conexión. Solo admin; acceso desde Más. Crear una sola pantalla.
```

## 23. Detalle de auditoría

Backend: `GET /api/v1/audit-logs/:id`. Solo admin.

```text
Diseña una única pantalla móvil “Detalle de auditoría” para Refugiapp, 390 × 844 px, con #35231D, #50382E, #FAF4E9/#CCBEB1, azul #75A7B8, coral #D96C5F y gris #8D8580; Newsreader Semibold y DM Sans. Presenta la acción traducida, fecha y hora, tipo de recurso, UUID del recurso, UUID del actor y fecha de creación. Añade una tarjeta “Metadatos” que muestre pares clave-valor en formato legible y permita copiar identificadores, manteniendo el JSON técnico detrás de una sección expandible. Si actor o recurso son nulos, mostrar “No informado”. No expongas tokens, contraseñas, hashes ni credenciales y no inventes nombres. No debe haber acciones de edición o eliminación. Incluye volver, copiar ID, carga, 404, error y sin conexión. Crear únicamente esta pantalla para admin, sin navegación inferior.
```

---

## Funciones que no deben diseñarse todavía como flujo completo

- Centro de notificaciones: no existe endpoint de notificaciones.
- Listado o administración integral de usuarios: existen crear, activar y desactivar, pero no `GET /users` ni `GET /users/:id`.
- Recuperación o cambio de contraseña: no hay endpoints.
- Logout remoto: no hay endpoint; solo puede limpiarse la sesión local.
- Asignación de tareas, prioridad, tipo o recurrencia: no existen esos campos.
- Agenda o disponibilidad de veterinarios: no existe ese dominio.
- Adopciones como entidad: solo existe el estado `adopted` y el evento del sistema.
- Edición de gastos: no existe `PATCH /expenses/:id`.
- Reactivación de veterinarios: no existe endpoint.
- Búsqueda global y notificaciones del dashboard: no están respaldadas por la API.

## Orden recomendado de ejecución

1. Login, Más y Mi perfil.
2. Editar animal, cambio de estado, historial y evento.
3. Cuidados: listado, detalle y formulario.
4. Clínica: listado, detalle y formulario.
5. Gastos: listado, detalle y formulario.
6. Archivos del animal.
7. Veterinarios: listado, detalle y formulario.
8. Crear usuario.
9. Auditoría: listado y detalle.
