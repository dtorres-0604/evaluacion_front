const permissionAliasMap: Record<string, string[]> = {
  'users.manage': ['read:users', 'update:users', 'delete:users'],
  'tests.manage': ['read:tests', 'update:tests', 'delete:tests'],
  'assignments.manage': ['read:assignments', 'update:assignments', 'delete:assignments'],
  'candidate.attempt': [
    'read:candidate-attempt',
    'update:candidate-attempt',
    'delete:candidate-attempt',
  ],
  'ai.analysis.read': ['read:ai-analysis'],
  'ai.analysis.write': ['update:ai-analysis', 'delete:ai-analysis'],
};

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

function createReverseAliases(map: Record<string, string[]>): Record<string, string[]> {
  const reverse: Record<string, string[]> = {};

  for (const [legacy, modern] of Object.entries(map)) {
    for (const permission of modern) {
      if (!reverse[permission]) {
        reverse[permission] = [];
      }

      reverse[permission].push(legacy);
    }
  }

  return reverse;
}

const reverseAliases = createReverseAliases(permissionAliasMap);

export function sanitizePermissions(permissions: string[]): string[] {
  return permissions
    .map((permission) => normalizePermission(permission))
    .filter((permission) => permission.length > 2 && permission !== ':');
}

export function expandPermissions(permissions: string[]): Set<string> {
  const expanded = new Set<string>();

  for (const raw of sanitizePermissions(permissions)) {
    expanded.add(raw);

    const mapped = permissionAliasMap[raw] ?? reverseAliases[raw] ?? [];
    for (const alias of mapped) {
      expanded.add(alias);
    }
  }

  return expanded;
}

export function hasPermission(required: string, granted: string[]): boolean {
  return expandPermissions(granted).has(normalizePermission(required));
}
