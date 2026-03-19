import { permissions, SubjectPermission } from '../constants/permissions';

export interface SidebarMenuItem {
  key: string;
  icon: string;
  label: string;
  route: string;
  subject: SubjectPermission;
  action: string;
}

export const sidebarMenu: SidebarMenuItem[] = [
  {
    key: 'dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    route: '/main/dashboard',
    subject: permissions.Subjects.DASHBOARD,
    action: permissions.Actions.READ,
  },
  {
    key: 'tests',
    icon: 'assignment',
    label: 'Pruebas Tecnicas',
    route: '/main/tests',
    subject: permissions.Subjects.TESTS,
    action: permissions.Actions.READ,
  },
  {
    key: 'assignments',
    icon: 'inventory_2',
    label: 'Asignaciones',
    route: '/main/assignments',
    subject: permissions.Subjects.ASSIGNMENTS,
    action: permissions.Actions.READ,
  },
  {
    key: 'attempts',
    icon: 'timer',
    label: 'Intentos Candidato',
    route: '/main/attempts',
    subject: permissions.Subjects.ATTEMPTS,
    action: permissions.Actions.READ,
  },
  {
    key: 'ai-analysis',
    icon: 'smart_toy',
    label: 'Analisis IA',
    route: '/main/ai-analysis',
    subject: permissions.Subjects.AI_ANALYSIS,
    action: permissions.Actions.READ,
  },
  {
    key: 'users',
    icon: 'group',
    label: 'Usuarios',
    route: '/main/users',
    subject: permissions.Subjects.USERS,
    action: permissions.Actions.READ,
  },
];
