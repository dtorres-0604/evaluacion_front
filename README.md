# EvaluacionTecnicaFrontend

Frontend de Evaluacion Tecnica construido con Angular 21 (standalone components) + NgRx para autenticacion, permisos y navegacion por rol.

## Estado actual

- Login integrado con backend (`POST /api/auth/login`) y parseo robusto de JWT/claims.
- Seguridad por capas:
  - `authGuard` (sesion activa)
  - `guestGuard` (evita volver a login con sesion)
  - `permissionGuard` (permiso + rol opcional por ruta)
- Layout principal con menu lateral filtrado por permisos y rol.
- Modulos funcionales:
  - Dashboard
  - Usuarios (CRUD)
  - Pruebas Tecnicas
  - Asignaciones
  - Intentos de Candidato
  - Mi Puntaje (solo rol Candidato)
  - Analisis IA

## Arquitectura

Resumen detallado:

- `docs/Arquitectura-Frontend.md`

Bitacora cronologica de cambios:

- `docs/Bitacora-Frontend.md`

## Estructura principal

- `src/app/core`
  - `auth`: normalizacion y validacion de permisos.
  - `guards`: control de acceso por autenticacion, permiso y rol.
  - `interceptors`: agrega `Authorization: Bearer <token>` a `/api/*`.
  - `services`: login y persistencia de sesion.
  - `constants/lists/theme`: catalogos de permisos, menu lateral y paleta.
- `src/app/store/auth`
  - `actions`, `reducer`, `effects`, `selectors`.
- `src/app/features`
  - Modulos/paginas de negocio.

## Configuracion de API (desarrollo)

El frontend usa base relativa `/api`.

- Proxy dev en `proxy.conf.json` apuntando a `http://localhost:5099`.
- Script recomendado de arranque ya incluye proxy: `npm start`.

## Rutas principales

- Publica:
  - `/login`
- Protegidas bajo `/main`:
  - `/main/dashboard` (`read:tests`)
  - `/main/users` (`read:users`)
  - `/main/tests` (`read:tests`)
  - `/main/assignments` (`read:assignments`)
  - `/main/attempts` (`read:candidate-attempt`)
  - `/main/my-scores` (`read:candidate-score` + rol `candidato`)
  - `/main/ai-analysis` (`read:ai-analysis`)

## Ejecucion local

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar desarrollo:

```bash
npm start
```

3. Abrir en navegador:

- `http://localhost:4200`

## Build

```bash
npm run build
```
