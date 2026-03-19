export const permissions = {
  Actions: {
    READ: 'read',
  },
  Subjects: {
    DASHBOARD: 'read:tests',
    USERS: 'read:users',
    TESTS: 'read:tests',
    ASSIGNMENTS: 'read:assignments',
    ATTEMPTS: 'read:candidate-attempt',
    AI_ANALYSIS: 'read:ai-analysis',
  },
} as const;

export type SubjectPermission =
  (typeof permissions.Subjects)[keyof typeof permissions.Subjects];
