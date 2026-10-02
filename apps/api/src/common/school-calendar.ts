/**
 * Reglas de calendario escolar de SIGE-ETIMA.
 *
 * La institución opera en Venezuela (America/Caracas, UTC-04:00).
 * El cierre de matrícula es una regla institucional fija: 31 de octubre
 * del año calendario en el que inicia el período escolar. La nómina permanece
 * provisional durante todo ese día y se fija automáticamente al comenzar
 * el 1 de noviembre.
 */
export const SCHOOL_TIME_ZONE = 'America/Caracas';

export function automaticEnrollmentCloseDate(startDate: Date | string): Date {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) throw new Error('Fecha de inicio de año escolar inválida');
  const startYear = start.getUTCFullYear();
  // Se almacena el inicio civil del 31 de octubre en Venezuela. Esta fecha
  // representa el ÚLTIMO DÍA de matrícula ordinaria, no el instante de fijación.
  return new Date(Date.UTC(startYear, 9, 31, 4, 0, 0, 0));
}

/**
 * Instante a partir del cual la nómina queda definitivamente fija.
 * 01/11 a las 00:00 en Venezuela = 04:00 UTC.
 */
export function automaticRosterLockDate(startDate: Date | string): Date {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) throw new Error('Fecha de inicio de año escolar inválida');
  const startYear = start.getUTCFullYear();
  return new Date(Date.UTC(startYear, 10, 1, 4, 0, 0, 0));
}

export function parseSchoolCalendarDate(value?: string): Date {
  if (!value) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  const [, y, m, d] = match;
  // Mediodía UTC conserva el mismo día civil en Venezuela y evita que un
  // valor YYYY-MM-DD se interprete como la noche del día anterior.
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0));
}
