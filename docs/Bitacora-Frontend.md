# Bitacora de Trabajo - Frontend Evaluacion Tecnica

Fecha base: 2026-03-19  
Proyecto: EvaluacionTecnicaFrontend (Angular + NgRx)

## Politica de bitacora

- Este archivo se actualiza en cada bloque de cambios relevantes.
- Se registran hallazgos, decisiones, cambios tecnicos y validaciones.

## Registro cronologico

### 2026-03-19 - Bloque 1 - Inicializacion

- Se creo proyecto Angular 21 con routing y SCSS en la raiz del workspace.
- Se instalaron dependencias NgRx: store, effects y devtools.

### 2026-03-19 - Bloque 2 - Arquitectura de autenticacion

- Se configuro store global en `app.config.ts`.
- Se implemento estado auth con acciones, reducer, selectors y effects.
- Se implemento `AuthApiService` para consumir login de backend.
- Se implemento `TokenStorageService` para sesion persistente.

### 2026-03-19 - Bloque 3 - Vistas y seguridad

- Se crearon pantallas Login y Dashboard.
- Se configuraron guards: auth, guest y permission.
- Se protegio Dashboard con permiso `tests.manage`.
- Se aplico diseno tipo card inspirado en el formato solicitado.

### 2026-03-19 - Bloque 4 - Incidente pantalla en blanco

- Hallazgo reportado al ejecutar `ng serve -o`:
  - Error runtime en `auth.effects.ts`: `Cannot read properties of undefined (reading 'pipe')`.
- Causa raiz:
  - Inicializacion de `createEffect` antes de resolver inyecciones por constructor en inicializadores de clase.
- Accion correctiva:
  - Se cambio `AuthEffects` para usar `inject(...)` en propiedades privadas inicializadas antes de los efectos.

### 2026-03-19 - Bloque 5 - Correccion consolidada

- Se detecto archivo `auth.effects.ts` truncado por una edicion parcial.
- Se reescribio por completo `AuthEffects` con sintaxis valida y dependencias via `inject(...)`.
- Se mantiene la restauracion de sesion (`ROOT_EFFECTS_INIT`), login, logout y navegacion post-login.
- Estado: correccion aplicada; validacion de build en ejecucion.

### 2026-03-19 - Bloque 6 - Error CORS en Login

- Hallazgo reportado:
  - Login falla en navegador por CORS, mientras en Postman funciona.
- Causa raiz:
  - Frontend llamaba a `http://localhost:5009/api` directamente desde `http://localhost:4200`.
  - El navegador bloquea por politica CORS entre origenes distintos.
- Accion correctiva aplicada:
  - Se cambio `API_BASE_URL` a ruta relativa `/api`.
  - Se creo `proxy.conf.json` para redirigir `/api` a `http://localhost:5009`.
  - Se configuro `angular.json` para usar `proxyConfig` en `serve:development`.
- Resultado esperado:
  - `ng serve` envia peticiones al mismo origen (`localhost:4200`) y Angular proxy reenvia a backend sin bloqueo CORS en desarrollo.

### 2026-03-19 - Bloque 7 - Ajuste de mapeo para respuesta real de Login

- Hallazgo reportado con evidencia de respuesta:
  - El backend responde login con estructura envolvente: `success`, `message`, `data`.
  - Los datos de sesion (`token`, `roles`, `permisos`) vienen dentro de `data`.
- Causa raiz funcional:
  - El frontend intentaba leer `token` y otros campos en la raiz del response.
  - Resultado: sesion incompleta en cliente aun con HTTP 200.
- Accion correctiva aplicada:
  - Se agrego `unwrapPayload` en `AuthApiService` para leer `data` cuando exista.
  - Se adapto lectura de claims JWT para soportar claves URI de .NET (`nameidentifier`, `name`, `role`).
- Resultado esperado:
  - Login exitoso con token, usuario, roles y permisos correctos cargados en estado NgRx.

### 2026-03-19 - Bloque 8 - Estabilizacion de proxy en desarrollo

- Hallazgo operativo:
  - Existia una instancia previa de `ng serve` usando puerto 4200.
  - Al iniciar otra instancia, Angular ofrecio puerto alterno, generando confusion con pruebas de login.
- Accion correctiva aplicada:
  - Se forzo script `start` a usar siempre `--proxy-config proxy.conf.json`.
  - Se agrego `serve.options.proxyConfig` en `angular.json` como respaldo.
- Resultado esperado:
  - Cualquier arranque con `npm start` toma proxy de forma consistente para `/api`.

### 2026-03-19 - Bloque 9 - Verificacion operativa de Login por proxy

- Hallazgo tecnico confirmado:
  - En puerto 4200 habia una instancia vieja de Angular ejecutada con `ng serve -o`.
  - Esa instancia no estaba alineada al flujo estabilizado de arranque con proxy forzado.
- Accion aplicada:
  - Se termino el proceso Node que escuchaba en 4200.
  - Se levanto de nuevo frontend con `npm start -- --port 4200 -o`.
- Evidencia de validacion:
  - Se ejecuto POST local a `http://localhost:4200/api/auth/login` desde terminal.
  - Respuesta obtenida: `200 OK` con `success: true` y `data.token` presente.
- Conclusión:
  - El endpoint de login por proxy funciona correctamente.
  - Si vuelve a aparecer 404, revisar primero que no exista otra instancia vieja de `ng serve` ocupando 4200.

### 2026-03-19 - Bloque 10 - Layout principal y Login estilo referencia

- Objetivo aplicado:
  - Adaptar el frontend Angular al estilo de referencia compartido (sidebar + login split layout).
- Cambios implementados:
  - Se creo configuracion de permisos y lista de menu lateral con rutas tipo `/main/...`.
  - Se creo `MainLayoutComponent` con sidenav colapsable, logo desde `/img/brand_icon_halftone-02.png`, header y salida de sesion.
  - Se refactorizaron rutas para usar layout principal con hijos protegidos por permisos:
    - dashboard
    - products
    - branch
    - outbound
    - outbound-list
  - Se creo `ModulePageComponent` reutilizable para modulos iniciales.
  - Se rediseño `LoginPageComponent` con estructura visual en dos paneles y validacion de dominio autorizado.
  - Se actualizaron redirecciones post-login y guest guard a `/main/dashboard`.
- Estado:
  - Implementacion completada, pendiente validacion de build y ejecucion visual.

### 2026-03-19 - Bloque 11 - Ajuste final por contexto de evaluacion tecnica

- Solicitud atendida:
  - Se confirmo que los logos estan en carpeta `public`.
  - Se pidio que el Dashboard reflejara la tarea real de evaluacion tecnica y no un ejemplo generico.
- Cambios aplicados:
  - Se corrigieron rutas de logo a:
    - `/brand_icon_halftone-02.png`
    - `/brand_icon_halftone-03.png`
  - Se redefinio menu lateral y permisos al dominio real:
    - Usuarios
    - Pruebas Tecnicas
    - Asignaciones
    - Intentos de Candidato
    - Analisis IA
  - Se refactorizaron rutas hijas en `/main/...` alineadas a esos modulos.
  - Se rediseño Dashboard como centro de control funcional con:
    - tarjetas de modulos visibles por permiso
    - listado de permisos de sesion
    - mapa rapido de endpoints backend clave
- Estado:
  - Cambios implementados y listos para validacion de compilacion.

### 2026-03-19 - Bloque 12 - Correccion de plantilla Dashboard

- Hallazgo durante validacion:
  - Angular interpreto segmentos con llaves en texto de endpoints como expresiones ICU.
- Accion aplicada:
  - Se escaparon llaves en endpoints del dashboard con entidades HTML (`&#123;` y `&#125;`).
- Resultado esperado:
  - Dashboard compila correctamente y mantiene la referencia visual de endpoints parametrizados.

### 2026-03-19 - Bloque 13 - Material Icons + Paleta dinamica

- Solicitud atendida:
  - Migrar iconografia a Material Icons.
  - Usar paleta centralizada de colores de forma dinamica.
- Cambios aplicados:
  - Se agrego fuente `Material Symbols Rounded` en `index.html`.
  - Sidebar y secciones de dashboard/login fueron migradas a iconos Material.
  - Se definio paleta en `core/theme/palette.ts`.
  - Se implemento `ThemeService` para volcar la paleta a variables CSS (`--color-*`) en runtime.
  - `App` aplica el tema al iniciar.
  - Se refactorizaron estilos de `styles.scss`, `main-layout` y `login` para consumir variables de paleta en lugar de colores hardcodeados.
- Resultado esperado:
  - Tema consistente y configurable desde una sola fuente.
  - Iconografia uniforme en toda la interfaz.

### 2026-03-19 - Bloque 14 - Permisos read:* y CRUD de Usuarios

- Hallazgo funcional:
  - El backend ahora retorna permisos en formato granular (`read:users`, `update:users`, etc.)
  - Tambien puede incluir valores invalidos como `:`.
- Accion aplicada en seguridad/permisos:
  - Se creo `permission.utils.ts` con:
    - sanitizacion de permisos invalidos
    - compatibilidad entre formato nuevo (`read:*`) y legado (`*.manage`)
    - helper `hasPermission` para guard/menu/selectores
  - Se actualizo guard de permisos y selector para usar helper comun.
  - Se ajustaron permisos de rutas/menu/dashboard al nuevo formato `read:*`.
- Accion aplicada en modulo Usuarios:
  - Se creo `UsersService` con operaciones:
    - listar usuarios
    - crear usuario (`UsuarioCreateDto`)
    - actualizar usuario
    - eliminar usuario
  - Se creo pantalla `UsersCrudPageComponent` con:
    - formulario Create/Edit
    - tabla de usuarios
    - acciones Edit/Delete
  - La ruta `/main/users` ahora apunta al CRUD real en lugar de pagina placeholder.
- Estado:
  - Implementacion completada, pendiente validacion de compilacion y pruebas funcionales contra backend.

### 2026-03-19 - Bloque 15 - Selector dinamico de Roles en Crear Usuario

- Solicitud atendida:
  - En formulario de usuario, el campo Roles ahora despliega lista desde endpoint de roles.
- Cambios aplicados:
  - `UsersService` incorpora `getRoles()` consumiendo `GET /api/entity/rol`.
  - Se agrego mapeo robusto para rol (`id`, `name`) y lectura de roles tanto string[] como objetos.
  - En `UsersCrudPageComponent`:
    - se carga catalogo de roles al iniciar
    - se reemplaza input de texto por `select` multiple
    - se envian roles seleccionados como array al crear/editar
  - Se agrego estado visual de carga de roles y estilos del selector.
- Resultado esperado:
  - Seleccion de roles controlada por catalogo backend.
  - Eliminacion de errores por escritura manual de roles en texto libre.

### 2026-03-19 - Bloque 16 - Correccion de Unauthorized en requests protegidas

- Hallazgo reportado:
  - Login exitoso con token, pero endpoints protegidos responden `401 Unauthorized`.
- Causa raiz:
  - El frontend almacenaba token en localStorage pero no lo adjuntaba en cabecera `Authorization`.
- Accion aplicada:
  - Se creo `auth.interceptor.ts`.
  - El interceptor agrega `Authorization: Bearer <token>` a requests `/api/*` (excepto login).
  - Se registro interceptor en `app.config.ts` con `provideHttpClient(withInterceptors(...))`.
- Resultado esperado:
  - Llamados protegidos (usuarios/roles y demas modulos) autenticados correctamente con JWT.

### 2026-03-19 - Bloque 17 - Roles como combobox multi-seleccion

- Solicitud atendida:
  - El campo Roles en crear/editar usuario debe ser tipo combobox y permitir uno o varios.
- Cambios aplicados:
  - Se reemplazo el selector plano por combobox custom con:
    - trigger de apertura/cierre
    - busqueda por texto
    - lista con checkboxes
    - seleccion multiple de roles
  - El valor del formulario se mantiene como `string[]` para enviar al backend.
  - Se agregaron estilos para panel desplegable y estados visuales.
- Resultado esperado:
  - UX tipo combobox, controlada y escalable para catalogos de roles grandes.

### 2026-03-19 - Bloque 18 - Correccion boton Crear Usuario

- Hallazgo reportado:
  - El boton de crear usuario parecia no funcionar.
- Causa raiz identificada:
  - Endpoint `POST /api/auth/users` valida campo `Password` (minimo 8), no `passwordHash`.
  - El frontend enviaba `passwordHash`, causando `400 Bad Request`.
- Correccion aplicada:
  - Se cambio payload de usuario para enviar `password`.
  - En edit, si password viene vacio, no se envia en el payload de update.
  - Se mejoro manejo de errores para mostrar mensaje real del backend.
- Resultado esperado:
  - Crear usuario funciona enviando contrato correcto.
  - En caso de error, se muestra validacion especifica en UI.

### 2026-03-19 - Bloque 19 - Ajuste de accion explicita en boton Crear Usuario

- Hallazgo reportado:
  - Percepcion de que el click no ejecutaba accion en el boton principal.
- Accion aplicada:
  - Boton principal paso a `type="button"` con `(click)="onSubmit()"` explicito.
  - Se agrego `formMessage` para mostrar feedback inmediato cuando formulario es invalido.
  - Se muestra confirmacion visual de exito al crear/actualizar usuario.
- Resultado esperado:
  - El click siempre dispara flujo de submit de forma explicita.
  - El usuario ve claramente si falta un campo o si la operacion fue exitosa.

### 2026-03-19 - Bloque 20 - Ajustes UX solicitados (loading, login y combobox)

- Hallazgos reportados:
  - Request `POST /api/auth/users` retorna `201 Created` pero boton quedaba en estado de carga.
  - Se pidio quitar restriccion de dominio de correo en login.
  - Combobox de roles no se cerraba al hacer click fuera.
- Cambios aplicados:
  - `UsersService` create/update ya no depende de mapear body de respuesta (admite `201` sin cuerpo).
  - Submit de usuarios ahora limpia `errorMessage` al iniciar y fuerza salida de estado `saving` en `next/error`.
  - Login removio validacion de dominio autorizado (`farsiman.com` / `dt.local`).
  - Combobox de roles ahora se cierra al click fuera usando `HostListener(document:click)` + `ViewChild` del contenedor.
  - Se uso `ng-container` en el boton para controlar etiqueta `Guardando...`.
- Resultado esperado:
  - Boton no queda pegado en loading tras crear.
  - Login acepta cualquier email valido.
  - Combobox de roles cierra correctamente al perder foco por click externo.

### 2026-03-19 - Bloque 21 - Estandarizacion de templates con ng-container/ng-template

- Solicitud atendida:
  - Uso de `ng-container` y `ng-template` en los templates del frontend.
- Cambios aplicados:
  - Refactor de vistas principales para usar bloques condicionales con `ng-container`/`ng-template`.
  - Ajustes realizados en:
    - shell app
    - layout principal
    - login
    - dashboard
    - usuarios CRUD
    - modulo generico
- Resultado esperado:
  - Estructura de plantillas mas uniforme y mantenible en todo el proyecto.

### 2026-03-19 - Bloque 22 - Redireccion dinamica por permisos (usuario Candidato)

- Hallazgo reportado:
  - Usuario con rol `Candidato` no podia avanzar tras login.
- Causa raiz:
  - Flujo post-login forzaba `/main/dashboard`, pero ese perfil no tiene `read:tests`.
- Accion aplicada:
  - Se creo `HomeRedirectPageComponent` (`/main/home`) que decide destino segun permisos.
  - Login success y guest guard ahora redirigen a `/main/home`.
  - `permissionGuard` al denegar una ruta ahora envia a `/main/home` para resolver ruta permitida.
- Resultado esperado:
  - Usuarios candidatos ingresan automaticamente a modulo permitido (`/main/attempts` o `/main/ai-analysis`).

### 2026-03-19 - Bloque 23 - Dashboard minimo segun solicitud

- Solicitud atendida:
  - Mostrar unicamente nombre completo y hora de inicio en Dashboard.
- Cambios aplicados:
  - Se elimino contenido adicional (modulos, permisos y mapa de endpoints).
  - Dashboard ahora renderiza solo:
    - Nombre completo
    - Hora de inicio de sesion (hora local)
- Resultado esperado:
  - Pantalla de dashboard limpia y minima, alineada a requerimiento.

### 2026-03-19 - Bloque 24 - Dashboard en formato grande con logo

- Solicitud atendida:
  - Mostrar datos del dashboard en formato grande y con un logo.
- Cambios aplicados:
  - Se integro logo `/brand_icon_halftone-03.png` en el card principal.
  - Se incremento tipografia de titulo, nombre y hora para visual de alto impacto.
  - Se centro contenido en layout para presentacion tipo hero.
- Resultado esperado:
  - Dashboard minimalista pero visualmente protagonista, con nombre y hora claramente visibles.

### 2026-03-19 - Bloque 25 - Card fullscreen en Dashboard

- Solicitud atendida:
  - Que la card del dashboard abarque toda la pantalla disponible.
- Cambios aplicados:
  - `dashboard-layout` ahora usa alto completo del viewport util.
  - `summary-card` expandida a 100% de ancho y 100% de alto.
  - Contenido centrado vertical y horizontalmente para mantener legibilidad.
- Resultado esperado:
  - Card principal ocupa todo el espacio del area de contenido del dashboard.

### 2026-03-19 - Bloque 26 - Pantalla Crear Prueba Tecnica + constructor de preguntas

- Solicitud atendida:
  - Construir pantalla de Pruebas Tecnicas enfocada en creacion de prueba.
  - Incluir guardado de preguntas y soporte de temporizador por pregunta en frontend.
- Cambios aplicados:
  - Se creo `TestCreatePageComponent` con formulario de prueba tecnica:
    - titulo
    - descripcion
    - duracion total
    - puntaje de aprobacion
    - activa/inactiva
  - Se agrego constructor dinamico de preguntas (FormArray):
    - tipo de pregunta (texto / opcion multiple)
    - enunciado
    - opciones (en multilinea para opcion multiple)
    - orden
    - puntaje maximo
    - temporizador por pregunta (segundos)
  - Se creo `TestsService` para:
    - crear prueba (`POST /api/entity/pruebatecnica`)
    - crear preguntas (`POST /api/entity/preguntatecnica`)
    - guardado secuencial: primero prueba, luego preguntas.
  - Se conecto ruta `/main/tests` al nuevo componente.
- Estado:
  - Implementado y listo para validacion funcional contra contratos finales de backend.

### 2026-03-19 - Bloque 27 - Alineacion al contrato final backend (sin aliases)

- Solicitud atendida:
  - Ajustar frontend al resumen final de backend para pruebas/preguntas.
- Cambios aplicados en frontend:
  - `POST /api/entity/pruebatecnica` ahora envia contrato directo:
    - `titulo`
    - `descripcion`
    - `duracionMinutos`
    - `puntajeAprobacion`
    - `isPublished`
  - `POST /api/entity/preguntatecnica` ahora envia contrato directo:
    - `testId`
    - `tipoPregunta`
    - `enunciado`
    - `opcionesJson`
    - `temporizadorSegundos`
    - `orden`
    - `puntajeMaximo`
  - Enum de tipo de pregunta alineado:
    - `1 = Abierta`
    - `2 = OpcionMultiple`
    - `3 = Codigo`
  - `opcionesJson` para opcion multiple se construye en formato canonical de objetos:
    - `text`
    - `value`
    - `correct`
  - Reglas frontend alineadas por tipo:
    - Opcion multiple requiere opciones
    - Abierta/Codigo envian `opcionesJson = null`
  - `temporizadorSegundos` se trata como opcional y se valida minimo 15 si se envia.

- Resumen para backend (por este cambio de front):
  - Front ya no depende de aliases para pruebas/preguntas.
  - Front asume que `opcionesJson` canonical se acepta en create/update de `preguntatecnica`.
  - Front asume que `isPublished` esta habilitado en `pruebatecnica`.
  - Front espera respuestas 4xx con mensajes de validacion legibles para mostrar en UI.

### 2026-03-19 - Bloque 28 - Correccion visual en tipo Opcion Multiple

- Hallazgo reportado:
  - Al seleccionar tipo `Opcion multiple`, no se desplegaba el campo de opciones.
- Causa raiz:
  - Comparacion estricta entre valor del select y numero, con valor recibido como string en algunos navegadores/ciclos de render.
- Correccion aplicada:
  - Select actualizado con `ngValue` numerico.
  - Condicion visual movida a helper `isMultipleChoice(i)` con normalizacion `Number(...)`.
- Resultado esperado:
  - Al cambiar a `Opcion multiple`, aparece inmediatamente el textarea de opciones.

### 2026-03-19 - Bloque 29 - CRUD de Pruebas Tecnicas + asignacion automatica a Candidatos

- Solicitud atendida:
  - Poder ver donde se crean las pruebas y gestionar CRUD.
  - Al crear prueba, asignarla automaticamente a usuarios rol `Candidato`.
- Cambios aplicados en frontend:
  - `TestsService` extendido con:
    - listado de pruebas (`GET /api/entity/pruebatecnica`)
    - update de prueba (`PUT /api/entity/pruebatecnica/{id}`)
    - delete de prueba (`DELETE /api/entity/pruebatecnica/{id}`)
    - lectura de candidatos (`GET /api/entity/usuario` + filtro por rol Candidato)
    - asignacion automatica por endpoint dedicado (`POST /api/tests/{id}/assignments`) con fallback a `POST /api/entity/asignacion`
  - Pantalla de pruebas ahora incluye:
    - formulario create/edit
    - tabla de listado de pruebas
    - acciones editar/eliminar
  - Flujo de creacion ahora:
    - crea prueba
    - crea preguntas
    - intenta asignar a todos los candidatos
    - muestra mensaje de exito parcial o total.

- Resumen para backend (por este cambio de front):
  - Front intenta usar primero `POST /api/tests/{id}/assignments` con arreglo de ids de candidato.
  - Si falla, usa fallback `POST /api/entity/asignacion`.
  - Front filtra candidatos desde `GET /api/entity/usuario` leyendo campo `roles`.

### 2026-03-19 - Bloque 30 - Alineacion a contrato batch de asignaciones (detalle de resultado)

- Entrada de backend recibida:
  - Endpoint principal activo: `POST /api/tests/{id}/assignments`.
  - Campo oficial: `candidateUserIds`.
  - Respuesta con detalle: `createdAssignmentIds`, `skippedCandidateUserIds`, `notFoundCandidateUserIds`.
- Cambios aplicados en frontend:
  - Se elimino envio de aliases en request batch y se usa campo oficial.
  - Se parsea respuesta detallada de asignaciones batch para feedback preciso.
  - Mensaje de exito ahora muestra resumen: creadas / omitidas / no encontradas.
  - Se mantiene fallback temporal `POST /api/entity/asignacion` para contingencia.
- Resultado esperado:
  - Front aprovecha contrato oficial actual y reduce suposiciones en asignacion automatica.

### 2026-03-19 - Bloque 31 - Correccion carga inicial de listado de pruebas

- Hallazgo reportado:
  - `GET /api/entity/pruebatecnica` responde correctamente, pero la tabla no se renderizaba hasta interactuar con el formulario.
- Causa raiz:
  - Componente con `OnPush` + subscripciones imperativas sin `markForCheck` en callbacks.
- Correccion aplicada:
  - Se agrego `ChangeDetectorRef.markForCheck()` en callbacks de carga/creacion/edicion/eliminacion.
  - Se agrego fallback de mapeo `activo` -> `isPublished` en listado de pruebas.
- Resultado esperado:
  - La lista se pinta inmediatamente al entrar a la pantalla, sin necesidad de editar el formulario.

### 2026-03-19 - Bloque 32 - Edicion de preguntas dentro de Edicion de Prueba

- Solicitud atendida:
  - Poder editar preguntas de una evaluacion ya creada.
- Cambios aplicados en frontend:
  - Modo `Editar prueba` ahora carga preguntas existentes desde backend.
  - Se habilita CRUD de preguntas en esa vista:
    - editar preguntas existentes
    - agregar nuevas preguntas
    - eliminar preguntas existentes
  - Al guardar en modo edicion:
    - actualiza prueba tecnica
    - upsert de preguntas (update/create)
    - elimina preguntas marcadas para borrar
- Resumen para backend (por este cambio de front):
  - Front consume `GET /api/entity/preguntatecnica` y filtra por `testId`.
  - Front requiere `PUT /api/entity/preguntatecnica/{id}` para editar pregunta.
  - Front requiere `DELETE /api/entity/preguntatecnica/{id}` para eliminar pregunta.
  - Front espera campos de pregunta en listado con soporte para:
    - `id`
    - `testId`
    - `tipoPregunta`
    - `enunciado`
    - `opcionesJson`
    - `orden`
    - `puntajeMaximo`
    - `temporizadorSegundos`

### 2026-03-19 - Bloque 33 - Pantalla de Candidato para resolver prueba (Intentos)

- Solicitud atendida:
  - Construir pantalla operativa del candidato para hacer la prueba.
- Cambios aplicados en frontend:
  - Se creo `CandidateAttemptPageComponent` y se conecto a ruta `/main/attempts`.
  - Funcionalidad incluida:
    - listado de asignaciones del candidato
    - iniciar intento
    - cargar preguntas por prueba
    - responder (abierta/codigo y opcion multiple)
    - temporizador por pregunta con avance automatico al expirar
    - guardar respuesta por pregunta
    - enviar intento final
  - Se creo `CandidateAttemptService` con endpoint principal + fallback:
    - start: `POST /api/candidate/attempts/{assignmentId}/start` (fallback `POST /api/entity/intento`)
    - save answer: `POST /api/candidate/attempts/{attemptId}/answers` (fallback `POST /api/entity/respuesta`)
    - submit: `POST /api/candidate/attempts/{attemptId}/submit` (fallback `PUT /api/entity/intento/{id}`)

- Resumen para backend (por este cambio de front):
  - Front consume listado de asignaciones desde `GET /api/entity/asignacion` filtrando por `candidateUserId`.
  - Front espera en asignacion al menos:
    - `id`/`asignacionId`
    - `testId`/`pruebaTecnicaId`
    - `candidateUserId`/`usuarioCandidatoId`
  - Front ya utiliza endpoint principal de intentos/respuestas/submit con fallback temporal para contingencia.

### 2026-03-19 - Bloque 34 - Pantalla de Asignaciones (prueba -> candidato)

- Solicitud atendida:
  - Crear pantalla donde se asigne una evaluacion a un usuario.
- Cambios aplicados en frontend:
  - Se creo `AssignmentsPageComponent` con:
    - formulario de asignacion (prueba + candidato + ventana opcional)
    - listado de asignaciones existentes
  - Se creo `AssignmentsService` con:
    - `GET /api/entity/pruebatecnica` (opciones de prueba)
    - `GET /api/entity/usuario` (opciones de candidato por rol)
    - `GET /api/entity/asignacion` (tabla de asignaciones)
    - `POST /api/tests/{id}/assignments` (principal)
    - fallback `POST /api/entity/asignacion` (contingencia)
  - Ruta `/main/assignments` conectada al nuevo componente.

- Resumen para backend (por este cambio de front):
  - Front envia contrato batch oficial con:
    - `candidateUserIds`
    - `enabledFrom` (opcional)
    - `enabledTo` (opcional)
  - Front requiere que `GET /api/entity/asignacion` incluya (idealmente):
    - `id`/`asignacionId`
    - `testId`/`pruebaTecnicaId`
    - `candidateUserId`/`usuarioCandidatoId`
    - `enabledFrom`/`enabledTo` (opcionales)
    - `status`/`estado` (opcional)

### 2026-03-19 - Bloque 35 - Pantalla explicita de Iniciar Prueba (Candidato)

- Solicitud atendida:
  - Incluir pantalla de inicio de prueba para candidato.
- Cambios aplicados en frontend:
  - En `Intentos`, el boton de la tabla ahora primero prepara la asignacion.
  - Se agrego card de confirmacion con datos de la prueba y boton `Iniciar prueba`.
  - Solo despues de confirmar se llama endpoint de start y se despliega cuestionario.
  - Se agrego opcion de cancelar antes de iniciar intento.
- Resultado esperado:
  - UX mas clara y controlada para el candidato antes de comenzar la evaluacion.

### 2026-03-19 - Bloque 36 - Correccion de 403 en carga de asignaciones para Candidato

- Hallazgo reportado:
  - `GET /api/entity/asignacion` retorna `403 Forbidden` para usuario candidato.
- Causa raiz:
  - Endpoint generico suele requerir permiso `read:assignments`, mientras candidato tiene `read:candidate-attempt`.
- Correccion aplicada en frontend:
  - Pantalla de intentos ahora usa endpoint principal de candidato:
    - `GET /api/candidate/assignments`
  - Se mantiene fallback a endpoint generico solo por contingencia.
- Resumen para backend:
  - Requerido endpoint `GET /api/candidate/assignments` autorizado con `read:candidate-attempt`.
  - Debe devolver asignaciones del usuario autenticado (sin requerir `read:assignments`).

### 2026-03-19 - Bloque 37 - Alineacion estricta al backend actual para asignaciones

- Hallazgo reportado:
  - Ruta `/api/candidate/assignments` no existe en backend actual.
  - Ruta existente `/api/entity/asignacion` responde `403` para usuario candidato.
- Cambios aplicados en frontend:
  - Se retiro uso de `/api/candidate/assignments`.
  - Carga de asignaciones ahora usa exclusivamente `/api/entity/asignacion`.
  - Mensaje de error actualizado para reflejar 403 real del backend actual.
- Resumen para backend:
  - Para que candidato vea sus asignaciones con la ruta actual, backend debe permitir lectura en `GET /api/entity/asignacion` para el contexto de candidato (idealmente filtrada por usuario autenticado).

### 2026-03-19 - Bloque 38 - Alineacion de Intentos a endpoints existentes del backend

- Hallazgo reportado:
  - `POST /api/candidate/attempts/{assignmentId}/start` retorna `404` (ruta no existe en backend actual).
- Cambios aplicados en frontend:
  - Se removio dependencia de rutas `/api/candidate/attempts/*`.
  - Flujo de candidato ahora usa directamente endpoints genericos existentes:
    - iniciar intento: `POST /api/entity/intento`
    - guardar respuesta: `POST /api/entity/respuesta`
    - enviar intento: `PUT /api/entity/intento/{id}` con estado `Enviado`
- Resultado esperado:
  - Flujo de inicio/respuesta/envio de intento funcional sin depender de rutas no implementadas.

### 2026-03-19 - Bloque 39 - Correccion de "Body invalido" por enums en intento

- Hallazgo reportado:
  - Backend responde `Body invalido: revisa formato y valores de enums.` al iniciar/enviar intento.
- Causa probable:
  - Payload enviaba `estado` en texto (`Iniciado`/`Enviado`) y backend espera enum numerico o nombre distinto.
- Correccion aplicada en frontend:
  - `startAttempt` ahora intenta primero payload minimo (sin estado).
  - Si falla, reintenta con `estado` numerico (`1`).
  - `submitAttempt` envia `estado` numerico (`2`) en lugar de texto.
- Resumen para backend:
  - Confirmar oficialmente el enum y valores permitidos para estado de `intento`.
  - Ideal documentar contrato de `POST /entity/intento` y `PUT /entity/intento/{id}`.

### 2026-03-19 - Bloque 40 - Alineacion a AssignmentId obligatorio (>0)

- Entrada funcional recibida:
  - `assignmentId` es obligatorio y debe ser mayor a 0 para crear intento.
  - Backend retorna 400 cuando llega `AssignmentId = 0`.
- Cambios aplicados en frontend:
  - Payload de inicio de intento ajustado para enviar `assignmentId` (clave oficial), no `asignacionId`.
  - Validacion previa en UI: bloquea inicio si `assignmentId <= 0`.
  - Mapeo de asignaciones endurecido para aceptar aliases de id (`assignmentId`/`AssignmentId`) y descartar ids invalidos.
- Resultado esperado:
  - Se elimina el error de validacion por `AssignmentId` en flujo de inicio de prueba.

### 2026-03-19 - Bloque 41 - Diagnostico de 403 en carga de preguntas para Candidato

- Hallazgo reportado:
  - `GET /api/entity/preguntatecnica` devuelve `403 Forbidden` para perfil candidato.
- Impacto:
  - Candidato no puede avanzar del paso "Iniciar prueba" al cuestionario.
- Ajuste aplicado en frontend:
  - Mensaje de error de UI actualizado para mostrar causa real y endpoint bloqueado.
- Resumen para backend:
  - Se requiere habilitar lectura de preguntas para flujo candidato (sin exponer catalogo global):
    - opcion A: permitir `GET /api/entity/preguntatecnica` filtrado por prueba/asignacion del usuario autenticado
    - opcion B (recomendada): endpoint dedicado, por ejemplo `GET /api/candidate/assignments/{assignmentId}/questions`

### 2026-03-19 - Bloque 42 - Correccion de 400 en POST /api/entity/respuesta

- Hallazgo reportado:
  - Backend valida `AttemptId` y `QuestionId` y respondia 400 por valores fuera de rango.
- Causa raiz:
  - Front enviaba nombres legacy (`intentoId` / `preguntaTecnicaId`) y backend esperaba contrato principal (`AttemptId` / `QuestionId`).
- Correccion aplicada en frontend:
  - Payload de respuesta actualizado para enviar campos oficiales:
    - `attemptId`
    - `questionId`
    - `answerText`
    - `selectedOption`
  - Se mantienen aliases legacy temporalmente para compatibilidad.
  - Se agrego validacion previa de ids (>0) antes de enviar respuesta.
- Resultado esperado:
  - El endpoint de respuestas deja de fallar por validacion de `AttemptId` y `QuestionId` cuando la data de intento/pregunta es valida.

### 2026-03-19 - Bloque 43 - Cierre automatico de asignacion al finalizar evaluacion

- Solicitud atendida:
  - Al terminar la evaluacion, cerrar esa asignacion para el usuario candidato.
- Cambios aplicados en frontend:
  - Flujo de submit ahora, ademas de enviar intento, actualiza la asignacion actual como finalizada/inactiva.
  - Se envia `PUT /api/entity/asignacion/{assignmentId}` con estado de cierre y banderas de inactivacion.
  - Mensaje de UI actualizado a "Intento enviado y asignacion cerrada para este usuario".
- Resumen para backend:
  - Front espera que `PUT /api/entity/asignacion/{id}` permita cerrar la asignacion con payload de estado y activo.
  - Si backend requiere enum/campos especificos para cierre, confirmar contrato exacto para alinear payload final.

### 2026-03-19 - Bloque 44 - Correccion de "Body invalido" en cierre de asignacion

- Hallazgo reportado:
  - `PUT /api/entity/asignacion/{id}` respondia `Body invalido` por valores de enum en campo `estado`.
- Correccion aplicada en frontend:
  - Se retiro envio de `estado` textual en cierre de asignacion.
  - Ahora se envia payload minimo para cierre funcional:
    - `activo: false`
    - `enabledTo: now`
  - Se agrego fallback de forma alternativa:
    - `isActive: false`
    - `enabledTo: now`
- Resultado esperado:
  - Evitar error de enum y permitir cierre de asignacion con campos no-enum.

### 2026-03-20 - Bloque 45 - Separacion de permisos: ver intentos vs calificar

- Hallazgo reportado:
  - La pantalla de intentos permitia ver y guardar puntajes bajo el mismo permiso de lectura.
- Correccion aplicada en frontend:
  - Se mantiene acceso de lectura para consultar intentos/respuestas.
  - Se agrego validacion explicita de permiso `update:candidate-attempt` para guardar puntajes.
  - Si el usuario no tiene permiso de update:
    - no se muestra editor de puntaje en tabla
    - el flujo de guardado se bloquea con mensaje de permiso insuficiente
- Resultado esperado:
  - Queda separado el control de "ver" y "calificar" sin romper navegacion de lectura.

### 2026-03-20 - Bloque 46 - Nuevo permiso para Mi Puntaje (candidate-score)

- Solicitud atendida:
  - Separar explicitamente el acceso de "Mi Puntaje" del permiso de intentos.
- Cambios aplicados en frontend:
  - Ruta `/main/my-scores` ahora exige `read:candidate-score`.
  - Menu lateral "Mi Puntaje" ahora depende de `read:candidate-score`.
  - Se agrego constante `SCORES` en catalogo de permisos del frontend.
- Resultado esperado:
  - El acceso a calificaciones queda desacoplado de `read:candidate-attempt`.
  - Solo perfiles con `read:candidate-score` ven y abren la pantalla de "Mi Puntaje".

### 2026-03-20 - Bloque 47 - Restriccion de Mi Puntaje por rol (solo Candidato)

- Hallazgo reportado:
  - Usuarios Administrador podian ver "Mi Puntaje" cuando traian `read:candidate-score` en el token.
- Cambios aplicados en frontend:
  - Se agrego `allowedRoles` en metadatos de menu y rutas.
  - Item de menu "Mi Puntaje" configurado con `allowedRoles: ['candidato']`.
  - Ruta `/main/my-scores` configurada con `allowedRoles: ['candidato']`.
  - `permissionGuard` ahora valida permiso y rol cuando la ruta define `allowedRoles`.
  - `MainLayout` ahora filtra menu por permiso + rol permitido.
- Resultado esperado:
  - Aunque un administrador tenga `read:candidate-score`, no ve ni accede a `/main/my-scores`.

### 2026-03-20 - Bloque 48 - Integracion de recomendacion y comentario IA en Mi Puntaje

- Entrada funcional recibida:
  - El endpoint de listado de pruebas ya retorna campos IA por registro:
    - `aiSuggestedScore`
    - `aiSummary`
    - `comentarioIa`
    - `aiCreatedAt`
- Cambios aplicados en frontend:
  - Se extendio `AssignmentTestOption` y su mapeo para leer los campos IA.
  - `CandidateScorePage` ahora propaga esos datos a cada fila de puntajes.
  - La tabla de "Mi Puntaje" ahora muestra columnas:
    - Recomendacion IA
    - Comentario IA (con fallback a `aiSummary`)
    - Fecha IA (debajo del comentario cuando existe)
- Resultado esperado:
  - El usuario ve recomendacion/comentario IA sin depender de una llamada adicional por intento.

### 2026-03-20 - Bloque 49 - Simplificacion de Mi Puntaje a solo Recomendacion

- Solicitud atendida:
  - Mostrar solo una columna de recomendacion y quitar comentario IA.
- Cambios aplicados:
  - En tabla de "Mi Puntaje" se renombro encabezado a `Recomendacion`.
  - Se elimino la columna de `Comentario IA` y su fecha asociada.
  - Se simplifico el modelo de fila para conservar solo `aiSuggestedScore` en esa vista.
- Resultado esperado:
  - UI mas simple: solo se visualiza la recomendacion numerica en el modulo.

### 2026-03-20 - Bloque 50 - Actualizacion de documentacion de arquitectura frontend

- Solicitud atendida:
  - Explicar y actualizar la arquitectura del frontend para facilitar entendimiento del equipo.
- Cambios aplicados:
  - Se actualizo `README.md` para reflejar estado real de modulos, rutas, seguridad y proxy actual.
  - Se creo `docs/Arquitectura-Frontend.md` con detalle por capas:
    - stack y estilo arquitectonico
    - estructura de carpetas
    - flujo de autenticacion
    - flujo de autorizacion (permiso + rol)
    - integracion con backend/proxy
    - decisiones recientes y recomendaciones de evolucion
- Resultado esperado:
  - Documento vivo y claro para onboarding tecnico y mantenimiento del proyecto.
