export const roleAccess: Record<string, string[]> = {
  ADMIN: [
    '/',
    '/assets',
    '/assets/new',
    '/tanks',
    '/inspections',
    '/inspections/new',
    '/planner',
    '/calendar',
    '/jobs',       // <-- ADDED: Job Dashboard
    '/upload',
    '/ingestion',
    '/heatmap',
    '/report',
    '/analysis',
    '/compliance',
    '/templates',
    '/activity',
    '/alerts',
    '/admin',
    '/dashboardf',
  ],

  INTEGRITY_MANAGER: [
    '/',
    '/assets',
    '/tanks',
    '/inspections',
    '/inspections/new',
    '/planner',
    '/calendar',
    '/heatmap',
    '/report',
    '/analysis',
    '/compliance',
    '/templates',
    '/activity',
    '/alerts',
    '/dashboardf',
  ],

  INTEGRITY_ENGINEER: [
    '/',
    '/assets',
    '/tanks',
    '/inspections',
    '/inspections/new',
    '/jobs',       // <-- ADDED: Job Dashboard (Synced with backend)
    '/upload',     // <-- ADDED: Upload Wizard (Synced with backend)
    '/ingestion',  // <-- ADDED: Ingestion API (Synced with backend)
    '/heatmap',
    '/report',
    '/analysis',
    '/activity',
    '/dashboardf',
  ],

  INSPECTOR: [
    '/inspections',
    '/inspections/new',
    '/assets',
    '/tanks',
    '/dashboardf',
  ],
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