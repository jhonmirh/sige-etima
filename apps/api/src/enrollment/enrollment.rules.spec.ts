import { StudentCondition } from '@prisma/client';
import { deriveAcademicDecision } from './enrollment.rules';

describe('deriveAcademicDecision',()=>{
  it('promueve como REGULAR cuando no reprueba materias',()=>{
    expect(deriveAcademicDecision({gradeLevel:1,maxGrade:6,failedCount:0,pendingMaxSubjects:2})).toEqual({
      condition:StudentCondition.REGULAR,
      targetGradeLevel:2,
      graduationEligible:false,
      failedCount:0,
      curriculumPolicy:'NEXT_GRADE_FULL',
    });
  });

  it('promueve con MATERIA_PENDIENTE cuando reprueba hasta dos',()=>{
    const r=deriveAcademicDecision({gradeLevel:2,maxGrade:6,failedCount:2,pendingMaxSubjects:2});
    expect(r.condition).toBe(StudentCondition.MATERIA_PENDIENTE);
    expect(r.targetGradeLevel).toBe(3);
    expect(r.curriculumPolicy).toBe('NEXT_GRADE_PLUS_PENDING');
  });

  it('mantiene el mismo grado como REPITIENTE y solo debe recursar reprobadas',()=>{
    const r=deriveAcademicDecision({gradeLevel:3,maxGrade:6,failedCount:3,pendingMaxSubjects:2});
    expect(r.condition).toBe(StudentCondition.REPITIENTE);
    expect(r.targetGradeLevel).toBe(3);
    expect(r.curriculumPolicy).toBe('FAILED_ONLY');
  });

  it('en último grado con hasta dos reprobadas mantiene grado y solo pendientes',()=>{
    const r=deriveAcademicDecision({gradeLevel:6,maxGrade:6,failedCount:2,pendingMaxSubjects:2});
    expect(r.condition).toBe(StudentCondition.MATERIA_PENDIENTE);
    expect(r.targetGradeLevel).toBe(6);
    expect(r.graduationEligible).toBe(false);
    expect(r.curriculumPolicy).toBe('PENDING_ONLY');
  });

  it('marca elegible a graduación si está en el último grado y aprobó todo',()=>{
    const r=deriveAcademicDecision({gradeLevel:6,maxGrade:6,failedCount:0,pendingMaxSubjects:2});
    expect(r.graduationEligible).toBe(true);
    expect(r.targetGradeLevel).toBeNull();
    expect(r.curriculumPolicy).toBe('GRADUATE');
  });
});
