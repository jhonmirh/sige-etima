import { BadRequestException } from '@nestjs/common';
import { GradingService, parseOptionalAbsences } from './grading';

describe('Reglas académicas de calificación', () => {
  const service = new GradingService({} as never);
  const policy = {
    orientationAmin: 18,
    orientationBmin: 16,
    orientationCmin: 12,
  };

  it.each([
    [20, 'A'],
    [18, 'A'],
    [17, 'B'],
    [16, 'B'],
    [15, 'C'],
    [12, 'C'],
    [11, 'D'],
    [1, 'D'],
  ])('convierte la nota %s a la literal %s', (score, expected) => {
    expect(service.orientationLetter(score, policy)).toBe(expected);
  });

  it.each([1, 2, 25, '3', ' 9 '])('acepta la inasistencia positiva %s', (value) => {
    expect(parseOptionalAbsences(value)).toBe(Number(String(value).trim()));
  });

  it.each([undefined, null, '', '   '])('interpreta %s como ausencia no registrada', (value) => {
    expect(parseOptionalAbsences(value)).toBeNull();
  });

  it.each([0, -1, 1.5, '0', '-2', '2.5', 'DOS', '*'])('rechaza la inasistencia inválida %s', (value) => {
    expect(() => parseOptionalAbsences(value)).toThrow(BadRequestException);
  });
});
