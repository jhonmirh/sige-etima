import { automaticEnrollmentCloseDate, automaticRosterLockDate, parseSchoolCalendarDate } from './school-calendar';

describe('school calendar rules', () => {
  it('fija el cierre de matrícula el 31 de octubre del año de inicio', () => {
    expect(automaticEnrollmentCloseDate('2026-09-30').toISOString()).toBe('2026-10-31T04:00:00.000Z');
    expect(automaticEnrollmentCloseDate('2027-09-28').toISOString()).toBe('2027-10-31T04:00:00.000Z');
  });

  it('mantiene la nómina provisional durante todo el 31 de octubre y la fija el 1 de noviembre', () => {
    const lock = automaticRosterLockDate('2026-09-30');
    expect(lock.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(parseSchoolCalendarDate('2026-10-31').getTime()).toBeLessThan(lock.getTime());
    expect(parseSchoolCalendarDate('2026-11-01').getTime()).toBeGreaterThanOrEqual(lock.getTime());
  });

  it('interpreta una fecha administrativa YYYY-MM-DD conservando el mismo día civil en Venezuela', () => {
    expect(parseSchoolCalendarDate('2026-10-31').toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });
});
