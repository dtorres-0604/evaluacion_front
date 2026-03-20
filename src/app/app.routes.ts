import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { LoginPageComponent } from './features/auth/pages/login-page.component';
import { CandidateAttemptPageComponent } from './features/attempts/pages/candidate-attempt-page/candidate-attempt-page.component';
import { AttemptCameraPageComponent } from './features/attempts/pages/attempt-camera-page/attempt-camera-page.component';
import { CandidateScorePageComponent } from './features/attempts/pages/candidate-score-page/candidate-score-page.component';
import { AssignmentsPageComponent } from './features/assignments/pages/assignments-page/assignments-page.component';
import { AiAnalysisPageComponent } from './features/ai-analysis/pages/ai-analysis-page.component';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page.component';
import { MainLayoutComponent } from './features/main/layout/main-layout.component';
import { HomeRedirectPageComponent } from './features/main/pages/home-redirect-page/home-redirect-page.component';
import { TestCreatePageComponent } from './features/tests/pages/test-create-page/test-create-page.component';
import { UsersCrudPageComponent } from './features/users/pages/users-crud-page/users-crud-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'main',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        component: HomeRedirectPageComponent,
      },
      {
        path: 'dashboard',
        component: DashboardPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:tests',
        },
      },
      {
        path: 'users',
        component: UsersCrudPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:users',
          title: 'Usuarios y Acceso',
          description: 'Administracion de usuarios, roles y permisos.',
        },
      },
      {
        path: 'tests',
        component: TestCreatePageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:tests',
          title: 'Pruebas Tecnicas',
          description: 'Creacion y gestion de pruebas, preguntas y estado.',
        },
      },
      {
        path: 'assignments',
        component: AssignmentsPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:assignments',
          title: 'Asignaciones',
          description: 'Asignacion de pruebas a candidatos y control de ventanas.',
        },
      },
      {
        path: 'attempts/:assignmentId/camera',
        component: AttemptCameraPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:candidate-attempt',
          title: 'Validacion de Camara',
          description: 'Activacion de camara previa a realizar la evaluacion.',
        },
      },
      {
        path: 'attempts',
        component: CandidateAttemptPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:candidate-attempt',
          title: 'Intentos de Candidato',
          description: 'Seguimiento de inicio, respuestas y envio de intentos.',
        },
      },
      {
        path: 'my-scores',
        component: CandidateScorePageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:candidate-attempt',
          title: 'Mi Puntaje',
          description: 'Consulta de resultados y calificaciones de intentos.',
        },
      },
      {
        path: 'ai-analysis',
        component: AiAnalysisPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'read:ai-analysis',
          title: 'Analisis IA',
          description: 'Consulta de resultados de analisis asistido por IA.',
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'main',
  },
  {
    path: '**',
    redirectTo: 'main',
  },
];
