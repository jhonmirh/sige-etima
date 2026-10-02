const INSTITUTION_TIME_ZONE = 'America/Caracas';

type CivilDate = { year: number; month: number; day: number };

function referenceCivilDate(date: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INSTITUTION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function birthCivilDate(value: Date | string): CivilDate | null {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Edad civil calculada con la fecha oficial de la institución (Venezuela). */
export function ageOnDate(birthDate: Date | string, referenceDate: Date = new Date()): number {
  const birth = birthCivilDate(birthDate);
  if (!birth) return -1;
  const ref = referenceCivilDate(referenceDate);
  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) age--;
  return age;
}
