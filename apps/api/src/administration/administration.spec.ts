import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  AdministrationContributionDto,
  GraduateEnrollmentsDto,
  UpdateInstitutionDto,
} from './administration';

const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
  data: undefined,
});

describe('Administration DTO validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const representativeId = '11111111-1111-4111-8111-111111111111';
  const academicYearId = '22222222-2222-4222-8222-222222222222';
  const enrollmentId = '33333333-3333-4333-8333-333333333333';

  it('accepts only institution fields explicitly allowed by the DTO', async () => {
    const result = await pipe.transform(
      { name: 'ETIMA', directorEmail: 'direccion@etima.edu.ve' },
      bodyMetadata(UpdateInstitutionDto),
    );
    expect(result).toMatchObject({ name: 'ETIMA', directorEmail: 'direccion@etima.edu.ve' });
  });

  it('rejects attempts to write protected institution fields', async () => {
    await expect(
      pipe.transform(
        { name: 'ETIMA', id: representativeId, createdAt: new Date().toISOString() },
        bodyMetadata(UpdateInstitutionDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid contribution', async () => {
    const result = await pipe.transform(
      { representativeId, academicYearId, amount: 25.5, reference: 'ABC-123' },
      bodyMetadata(AdministrationContributionDto),
    );
    expect(result.amount).toBe(25.5);
  });

  it.each([0, -1, 10.999])('rejects an invalid contribution amount: %s', async (amount) => {
    await expect(
      pipe.transform(
        { representativeId, academicYearId, amount },
        bodyMetadata(AdministrationContributionDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed identifiers', async () => {
    await expect(
      pipe.transform(
        { representativeId: 'representante', academicYearId, amount: 10 },
        bodyMetadata(AdministrationContributionDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a bounded non-empty list of enrollment UUIDs', async () => {
    const result = await pipe.transform({ enrollmentIds: [enrollmentId] }, bodyMetadata(GraduateEnrollmentsDto));
    expect(result.enrollmentIds).toEqual([enrollmentId]);
  });

  it.each<[string[]]>([[[]], [['matricula-invalida']]])('rejects an invalid graduation list', async (enrollmentIds) => {
    await expect(
      pipe.transform({ enrollmentIds }, bodyMetadata(GraduateEnrollmentsDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
