export const TEMPLATE_MAP: Record<string, number> = {
  WSE: 1,
  FFS: 2,
  ISE: 3,
};

export const STANDARD_MAP: Record<string, number> = {
  WSE: 7,
  FFS: 7,
  ISE: 5,
};

export function formatInspectionDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}