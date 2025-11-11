export type CanonicalStatus = 'nowy' | 'w trakcie' | 'naprawiony';

const STATUS_MAP: Record<string, CanonicalStatus> = {
  'nowy': 'nowy',
  'new': 'nowy',

  'w trakcie': 'w trakcie',
  'in progress': 'w trakcie',
  'in_progress': 'w trakcie',

  'naprawiony': 'naprawiony',
  'solved': 'naprawiony',
  'repaired': 'naprawiony',
};

export function normalizeStatus(input?: string): CanonicalStatus | undefined {
  if (!input) return undefined;
  return STATUS_MAP[input.toLowerCase().trim()];
}