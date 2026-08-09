import { automaticEnrollmentCloseDate, parseSchoolCalendarDate } from './school-calendar';

describe('school calendar rules', () => {
  it('fija el cierre de matrícula el 31 de octubre del año de inicio', () => {
    expect(automaticEnrollmentCloseDate('2026-09-30').toISOString()).toBe('2026-10-31T04:00:00.000Z');
    expect(automaticEnrollmentCloseDate('2027-09-28').toISOString()).toBe('2027-10-31T04:00:00.000Z');
  });

  it('interpreta una fecha administrativa YYYY-MM-DD conservando el mismo día civil en Venezuela', () => {
    expect(parseSchoolCalendarDate('2026-10-31').toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });
});
