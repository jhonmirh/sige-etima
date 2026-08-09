import { StudentCondition } from '@prisma/client';

export type CurriculumPolicy =
  | 'NEXT_GRADE_FULL'
  | 'NEXT_GRADE_PLUS_PENDING'
  | 'FAILED_ONLY'
  | 'PENDING_ONLY'
  | 'GRADUATE';

export type AcademicDecision = {
  condition: StudentCondition;
  targetGradeLevel: number | null;
  graduationEligible: boolean;
  failedCount: number;
  curriculumPolicy: CurriculumPolicy;
};

export function deriveAcademicDecision(input:{
  gradeLevel:number;
  maxGrade:number;
  failedCount:number;
  pendingMaxSubjects:number;
}):AcademicDecision{
  const {gradeLevel,maxGrade,failedCount,pendingMaxSubjects}=input;
  if(failedCount===0){
    if(gradeLevel>=maxGrade){
      return {
        condition:StudentCondition.REGULAR,
        targetGradeLevel:null,
        graduationEligible:true,
        failedCount,
        curriculumPolicy:'GRADUATE',
      };
    }
    return {
      condition:StudentCondition.REGULAR,
      targetGradeLevel:gradeLevel+1,
      graduationEligible:false,
      failedCount,
      curriculumPolicy:'NEXT_GRADE_FULL',
    };
  }
  if(failedCount<=pendingMaxSubjects){
    const lastGrade=gradeLevel>=maxGrade;
    return {
      condition:StudentCondition.MATERIA_PENDIENTE,
      targetGradeLevel:lastGrade?gradeLevel:gradeLevel+1,
      graduationEligible:false,
      failedCount,
      curriculumPolicy:lastGrade?'PENDING_ONLY':'NEXT_GRADE_PLUS_PENDING',
    };
  }
  return {
    condition:StudentCondition.REPITIENTE,
    targetGradeLevel:gradeLevel,
    graduationEligible:false,
    failedCount,
    curriculumPolicy:'FAILED_ONLY',
  };
}
