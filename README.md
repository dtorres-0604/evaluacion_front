# EvaluacionTecnicaFrontend

Frontend en Angular 21 con NgRx para autenticacion y control de permisos, conectado al backend .NET 8 de Evaluacion Tecnica.

## Alcance Implementado

- Pantalla de Login conectada al endpoint `POST /api/auth/login`.
- Pantalla de Dashboard protegida por autenticacion y permiso.
- Estado global con NgRx (`store`, `effects`, `selectors`, `actions`).
- Persistencia de sesion en `localStorage`.
- Guards de ruta:
  - `authGuard` para rutas autenticadas.
  - `guestGuard` para impedir entrar a login si ya hay sesion.
  - `permissionGuard` para validar permisos por ruta.

## Estructura Principal

- `src/app/core`: modelos, servicios y guards.
- `src/app/store/auth`: estado NgRx de autenticacion.
- `src/app/features/auth`: pagina Login.
- `src/app/features/dashboard`: pagina Dashboard.

## Configuracion de API

La URL base del backend esta en:

- `src/app/core/services/auth-api.service.ts`

Valor actual:

- `http://localhost:5099/api`

Si tu backend corre en otra URL, actualiza ese valor.

## Rutas Implementadas

- `/login`
- `/dashboard`

`/dashboard` actualmente exige permiso: `tests.manage`.

## Ejecucion Local

1. Instalar dependencias:

```bash
npm install
```

1. Levantar frontend:

```bash
npm start
```

1. Abrir:

- `http://localhost:4200`

## Build

```bash
npm run build
```

## Usuario Semilla Backend

- Email: `admin@dt.local`
- Password: `Admin123*`

## Bitacora de Trabajo Frontend

### 2026-03-19 - Bloque 1

- Se inicializo proyecto Angular 21 en la carpeta raiz del workspace.
- Se agrego NgRx (`@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`).
- Se configuro `app.config.ts` con router, http client, store y effects.

### 2026-03-19 - Bloque 2

- Se implemento modulo de autenticacion:
  - `AuthApiService` para login con parseo robusto de token/claims/permisos.
  - `TokenStorageService` para persistir/restaurar sesion.
  - `AuthActions`, `authFeature` reducer, selectors y effects.
- Se implementaron guards:
  - `authGuard`
  - `guestGuard`
  - `permissionGuard`

### 2026-03-19 - Bloque 3

- Se crearon vistas:
  - Login (`/login`)
  - Dashboard (`/dashboard`)
- Se aplico estilo de tarjetas inspirado en el formato solicitado (header iconico, card content, botones de accion).
- Se ajusto routing con proteccion por permiso en Dashboard.

### 2026-03-19 - Bloque 4

- Se ejecuto compilacion de validacion:
  - `npm run build`
- Resultado: build exitoso con salida en `dist/evaluacion-tecnica-frontend`.
