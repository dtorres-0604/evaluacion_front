# Arquitectura Frontend - Evaluacion Tecnica

Este documento describe la arquitectura actual del frontend, su organizacion por capas y los flujos principales de autenticacion, permisos y modulos.

## 1. Stack y estilo arquitectonico

- Framework: Angular 21.
- Enfoque: standalone components (sin NgModules por feature).
- Estado global: NgRx (solo dominio auth por ahora).
- Networking: HttpClient + interceptor JWT.
- Seguridad de navegacion: guards por autenticacion, permiso y rol.

Arquitectura general (vista logica):

1. Presentacion: paginas y layout en `src/app/features`.
2. Aplicacion: store NgRx (`src/app/store/auth`) y guards (`src/app/core/guards`).
3. Infraestructura cliente: servicios HTTP e interceptor (`src/app/core/services`, `src/app/core/interceptors`).
4. Contratos/normalizacion: modelos y utils de permisos (`src/app/core/models`, `src/app/core/auth`).

## 2. Estructura de carpetas (resumen)

- `src/app/app.config.ts`
  - Registra router, HttpClient, interceptor, store, effects y devtools.
- `src/app/app.routes.ts`
  - Mapa central de rutas y metadatos de seguridad (`permission`, `allowedRoles`).
- `src/app/core`
  - `auth/permission.utils.ts`: sanitiza, expande aliases legacy y valida permisos.
  - `guards/*.guard.ts`: control de acceso.
  - `interceptors/auth.interceptor.ts`: inyecta Bearer token a llamadas `/api/*`.
  - `services/auth-api.service.ts`: login y mapeo robusto de payload/claims.
  - `services/token-storage.service.ts`: persistencia de sesion.
  - `constants/permissions.ts`: catalogo canonico de permisos de UI.
  - `lists/sidebar-menu.ts`: definicion de menu y restriccion por rol opcional.
- `src/app/store/auth`
  - `auth.actions.ts`, `auth.reducer.ts`, `auth.effects.ts`, `auth.selectors.ts`.
- `src/app/features`
  - `main/layout`: shell principal con sidenav.
  - `main/pages/home-redirect-page`: redireccion por permisos.
  - Resto de modulos funcionales (usuarios, pruebas, asignaciones, intentos, puntajes, IA).

## 3. Flujo de autenticacion

1. Usuario envia credenciales en login.
2. `AuthEffects.login$` llama `AuthApiService.login()`.
3. `AuthApiService`:
   - acepta payload envuelto (`data`) o plano,
   - extrae token y datos de usuario,
   - decodifica claims JWT cuando hace falta,
   - normaliza/sanitiza permisos.
4. Al exito:
   - `AuthActions.loginSuccess` guarda sesion en store,
   - `AuthEffects.loginSuccess$` persiste en localStorage,
   - navega a `/main/home`.
5. Al iniciar app:
   - `ROOT_EFFECTS_INIT` intenta restaurar sesion desde storage.

## 4. Flujo de autorizacion (permisos y roles)

## 4.1 En rutas

`permissionGuard` evalua:

- `data.permission` (si existe), y
- `data.allowedRoles` (si existe).

Si falla alguna validacion, redirige a `/main/home?denied=1`.

## 4.2 En menu lateral

`MainLayoutComponent` filtra `sidebarMenu` por:

- permiso requerido (`item.subject`),
- rol permitido (`item.allowedRoles`, opcional).

Esto evita mostrar opciones no autorizadas, incluso si alguien intenta navegar directo, la ruta vuelve a validar.

## 4.3 Compatibilidad con permisos legacy

`permission.utils.ts` mantiene alias entre formatos:

- legacy: `users.manage`, `tests.manage`, etc.
- actual: `read:*`, `update:*`, `delete:*`.

Asi el frontend funciona con tokens antiguos y nuevos.

## 5. Navegacion principal

Rutas protegidas bajo `main`:

- `dashboard`: `read:tests`
- `users`: `read:users`
- `tests`: `read:tests`
- `assignments`: `read:assignments`
- `attempts`: `read:candidate-attempt`
- `my-scores`: `read:candidate-score` + `allowedRoles: ['candidato']`
- `ai-analysis`: `read:ai-analysis`

`HomeRedirectPage` decide destino inicial segun permisos disponibles.

## 6. Integracion con backend y proxy

- Base URL en frontend: rutas relativas `/api`.
- En desarrollo, Angular usa `proxy.conf.json` para reenviar a `http://localhost:5099`.
- Beneficio: evita problemas CORS en entorno local.

## 7. Patron de servicios por feature

Cada modulo funcional suele tener:

1. Servicio de acceso HTTP (`features/*/services`).
2. Componente pagina (`features/*/pages`).
3. Mapeo tolerante a variaciones de contrato (snake/camel, alias, envelope `data`).

Esto ha permitido evolucionar contratos de backend sin romper toda la UI.

## 8. Decisiones recientes relevantes

- Separacion de permisos para intentos vs puntajes.
- Restriccion por rol en `Mi Puntaje` para evitar mostrarlo a Administrador.
- Integracion de columna `Recomendacion` en `Mi Puntaje` usando `aiSuggestedScore` del payload de pruebas.

## 9. Recomendaciones para evolucion

1. Crear estado NgRx por feature (tests, assignments, attempts) cuando haya mas reglas de negocio compartidas.
2. Centralizar tipos DTO de backend en carpeta de contratos por modulo.
3. Agregar pruebas unitarias de guards y utilidades de permisos.
4. Agregar pruebas de integracion para mapeos de payload (escenarios con y sin `data`).

## 10. Mapa rapido de archivos clave

- `src/app/app.config.ts`
- `src/app/app.routes.ts`
- `src/app/core/interceptors/auth.interceptor.ts`
- `src/app/core/guards/permission.guard.ts`
- `src/app/core/auth/permission.utils.ts`
- `src/app/core/services/auth-api.service.ts`
- `src/app/store/auth/auth.effects.ts`
- `src/app/features/main/layout/main-layout.component.ts`
- `src/app/features/main/pages/home-redirect-page/home-redirect-page.component.ts`
