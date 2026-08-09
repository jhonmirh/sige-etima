export const SCHOOL_TIME_ZONE = 'America/Caracas';

export function schoolDateKey(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function automaticCloseLabelFromStart(startDate?: string) {
  if (!startDate) return '31/10/AAAA';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  const year = match?.[1] || String(new Date(startDate).getUTCFullYear());
  return `31/10/${year}`;
}

export function dateLabel(v: any) {
  if (!v) return 'NO DEFINIDO';
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(v));
}

export function storedDateKey(v: any) {
  if (!v) return '';
  return new Date(v).toISOString().slice(0, 10);
}
