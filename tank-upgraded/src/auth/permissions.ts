export const roleAccess: Record<string, string[]> = {
  ADMIN: ['/', '/tanks', '/inspections', '/planner', '/upload', '/heatmap', '/report'],
  INTEGRITY_MANAGER: ['/', '/tanks', '/inspections', '/planner', '/report'],
  INTEGRITY_ENGINEER: ['/', '/tanks', '/inspections'],
  INSPECTOR: ['/inspections'],
};

function normalizeRole(role?: string): string | undefined {
  if (!role) return undefined;
  return role.replace(/^ROLE_/, '');
}

export function canAccess(role: string | undefined, path: string): boolean {
  const r = normalizeRole(role);
  if (!r) return false;

  return roleAccess[r]?.includes(path) ?? false;
}