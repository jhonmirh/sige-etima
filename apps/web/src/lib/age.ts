const INSTITUTION_TIME_ZONE = 'America/Caracas';

type CivilDate = { year: number; month: number; day: number };

function currentInstitutionDate(referenceDate: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INSTITUTION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function calculateAge(birthDate?: string, referenceDate: Date = new Date()): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const birth = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const ref = currentInstitutionDate(referenceDate);
  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) age--;
  return age >= 0 ? age : null;
}

export function latestBirthDateForMinimumAge(minimumAge: number, referenceDate: Date = new Date()): string {
  const ref = currentInstitutionDate(referenceDate);
  const targetYear = ref.year - minimumAge;
  const maxDay = new Date(Date.UTC(targetYear, ref.month, 0)).getUTCDate();
  const day = Math.min(ref.day, maxDay);
  return `${targetYear}-${String(ref.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
