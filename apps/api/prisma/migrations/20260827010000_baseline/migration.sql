-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DIRECTOR', 'SECRETARIA', 'DOCENTE');

-- CreateEnum
CREATE TYPE "Nationality" AS ENUM ('VENEZOLANO', 'EXTRANJERO');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SOLTERO', 'CASADO', 'VIUDO', 'DIVORCIADO', 'UNION_ESTABLE');

-- CreateEnum
CREATE TYPE "LivingWith" AS ENUM ('MADRE', 'PADRE', 'AUTORIZADO');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('MADRE', 'PADRE', 'AUTORIZADO', 'OTRO');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CORRIENTE', 'AHORRO', 'OTRA');

-- CreateEnum
CREATE TYPE "EducationModality" AS ENUM ('MEDIA_GENERAL', 'MEDIA_TECNICA');

-- CreateEnum
CREATE TYPE "StudentCondition" AS ENUM ('REGULAR', 'MATERIA_PENDIENTE', 'REPITIENTE', 'RETIRADO', 'RETIRADO_MODIFICADO', 'GRADUADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CEDULA', 'PARTIDA_NACIMIENTO', 'BOLETA_PROMOCION', 'FOTO_ALUMNO', 'FOTO_REPRESENTANTE', 'CEDULA_REPRESENTANTE', 'NOTAS_CERTIFICADAS', 'CARTA_BUENA_CONDUCTA', 'CUENTA_BANCARIA', 'INFORME_MEDICO', 'AUTORIZACION_REPRESENTANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('DOCENTE', 'ADMINISTRATIVO', 'OBRERO', 'COCINERO');

-- CreateEnum
CREATE TYPE "EmploymentCondition" AS ENUM ('ACTIVO', 'REPOSO_CONTINUO', 'INCAPACITADO', 'JUBILADO', 'EN_PROCESO_JUBILACION', 'PROCESO_ADMINISTRATIVO');

-- CreateEnum
CREATE TYPE "IncapacityExecutor" AS ENUM ('IPASME', 'IVSS');

-- CreateEnum
CREATE TYPE "HousingTenure" AS ENUM ('PROPIA', 'ALQUILADA', 'PRESTADA');

-- CreateEnum
CREATE TYPE "QualificationType" AS ENUM ('PREGRADO', 'ESPECIALIZACION', 'MAESTRIA', 'DOCTORADO', 'OTRO');

-- CreateEnum
CREATE TYPE "GradingType" AS ENUM ('NUMERIC', 'ORIENTATION_LETTER');

-- CreateEnum
CREATE TYPE "LapseStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "GradingCalculationMode" AS ENUM ('PERCENTUAL', 'ACUMULATIVA');

-- CreateEnum
CREATE TYPE "AssessmentForm" AS ENUM ('PRIMERA', 'SEGUNDA');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'INASISTENTE');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('APROBADO', 'REPROBADO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "PendingStatus" AS ENUM ('ABIERTA', 'APROBADA', 'AGOTADA_REVISION', 'REPETIR');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PENDIENTE', 'PRESENTADA', 'INASISTENTE');

-- CreateEnum
CREATE TYPE "WithdrawalType" AS ENUM ('PRIMEROS_30_DIAS', 'RESTO_ANO', 'HASTA_CIERRE_MATRICULA', 'POST_CIERRE_MATRICULA');

-- CreateEnum
CREATE TYPE "EnrollmentMovementType" AS ENUM ('RETIRO', 'REINCORPORACION');

-- CreateEnum
CREATE TYPE "EnrollmentSubjectOrigin" AS ENUM ('PLAN_ACTUAL', 'MATERIA_PENDIENTE', 'REPITENCIA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plantCode" TEXT,
    "statisticalCode" TEXT,
    "dependencyCode" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "stateId" TEXT,
    "municipalityId" TEXT,
    "parishId" TEXT,
    "directorTitle" TEXT,
    "directorName" TEXT,
    "directorNationality" "Nationality",
    "directorIdentity" TEXT,
    "directorAddress" TEXT,
    "directorPhone" TEXT,
    "directorEmail" TEXT,
    "schoolLogoPath" TEXT,
    "ministryLogoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FederalState" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FederalState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parish" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Parish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "enrollmentCloseDate" TIMESTAMP(3),
    "academicClosedAt" TIMESTAMP(3),
    "academicClosedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "contributionAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingPolicy" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "passingScore" DECIMAL(4,2) NOT NULL DEFAULT 10,
    "maxScore" DECIMAL(4,2) NOT NULL DEFAULT 20,
    "pendingMaxSubjects" INTEGER NOT NULL DEFAULT 2,
    "evaluationsMin" INTEGER NOT NULL DEFAULT 2,
    "evaluationsMax" INTEGER NOT NULL DEFAULT 5,
    "lapseCount" INTEGER NOT NULL DEFAULT 3,
    "orientationAmin" DECIMAL(4,2) NOT NULL DEFAULT 18,
    "orientationBmin" DECIMAL(4,2) NOT NULL DEFAULT 16,
    "orientationCmin" DECIMAL(4,2) NOT NULL DEFAULT 12,

    CONSTRAINT "GradingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nationality" "Nationality" NOT NULL,
    "identityNumber" TEXT,
    "schoolIdentityNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "sex" "Sex" NOT NULL,
    "maritalStatus" "MaritalStatus",
    "phone" TEXT,
    "email" TEXT,
    "birthPlace" TEXT NOT NULL,
    "birthStateId" TEXT,
    "birthMunicipalityId" TEXT,
    "birthParishId" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "residenceStateId" TEXT,
    "residenceMunicipalityId" TEXT,
    "residenceParishId" TEXT,
    "motherName" TEXT,
    "fatherName" TEXT,
    "motherIdentity" TEXT,
    "fatherIdentity" TEXT,
    "motherAddress" TEXT,
    "fatherAddress" TEXT,
    "livingWith" "LivingWith" NOT NULL,
    "bloodType" TEXT,
    "disability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityDetails" TEXT,
    "medicalReport" BOOLEAN NOT NULL DEFAULT false,
    "allergy" BOOLEAN NOT NULL DEFAULT false,
    "allergyDetails" TEXT,
    "originSchool" TEXT,
    "destinationSchool" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Representative" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nationality" "Nationality" NOT NULL,
    "identityNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "profession" TEXT,
    "address" TEXT NOT NULL,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "sex" "Sex",
    "email" TEXT,
    "phone1" TEXT NOT NULL,
    "phone2" TEXT,
    "workplace" TEXT,
    "workAddress" TEXT,
    "workPhone" TEXT,
    "bankName" TEXT,
    "accountType" "AccountType",
    "accountNumber" TEXT,
    "bloodType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Representative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRepresentative" (
    "studentId" TEXT NOT NULL,
    "representativeId" TEXT NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "livesWithStudent" BOOLEAN NOT NULL DEFAULT false,
    "authorizationDescription" TEXT,

    CONSTRAINT "StudentRepresentative_pkey" PRIMARY KEY ("studentId","representativeId")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "identityNumber" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnthropometricRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heightCm" INTEGER NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "shirtSize" TEXT,
    "pantSize" TEXT,
    "shoeSize" INTEGER,

    CONSTRAINT "AnthropometricRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "type" "DocumentType" NOT NULL,
    "presented" BOOLEAN NOT NULL DEFAULT false,
    "filePath" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "EducationModality" NOT NULL,
    "specialtyName" TEXT,
    "optionName" TEXT,
    "hasMention" BOOLEAN NOT NULL DEFAULT false,
    "officialCatalog" BOOLEAN NOT NULL DEFAULT false,
    "sourceReference" TEXT,
    "curriculumVerified" BOOLEAN NOT NULL DEFAULT false,
    "maxGrade" INTEGER NOT NULL,
    "titleName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradingType" "GradingType" NOT NULL DEFAULT 'NUMERIC',

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlanSubject" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "weeklyHours" INTEGER,
    "annualHours" INTEGER,
    "component" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudyPlanSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionName" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "mentionId" TEXT,
    "mentionName" TEXT,
    "gradeLevel" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shift" TEXT,
    "capacity" INTEGER,
    "rosterLockedAt" TIMESTAMP(3),

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastApprovedYear" TEXT,
    "literal" TEXT,
    "listNumber" INTEGER,
    "condition" "StudentCondition" NOT NULL DEFAULT 'REGULAR',
    "academicCondition" "StudentCondition",
    "isLateEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "previousEnrollmentId" TEXT,
    "academicOutcomeFinalizedAt" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentSubject" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studyPlanSubjectId" TEXT NOT NULL,
    "origin" "EnrollmentSubjectOrigin" NOT NULL DEFAULT 'PLAN_ACTUAL',
    "sourceEnrollmentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "withdrawalDate" TIMESTAMP(3) NOT NULL,
    "destinationInstitution" TEXT,
    "reason" TEXT NOT NULL,
    "type" "WithdrawalType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentMovement" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "type" "EnrollmentMovementType" NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "withdrawalType" "WithdrawalType",
    "destinationInstitution" TEXT,
    "reason" TEXT,
    "conditionBefore" "StudentCondition",
    "conditionAfter" "StudentCondition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "representativeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPositionCatalog" (
    "id" TEXT NOT NULL,
    "staffType" "StaffType" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPositionCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "staffType" "StaffType" NOT NULL DEFAULT 'DOCENTE',
    "nationality" "Nationality" NOT NULL DEFAULT 'VENEZOLANO',
    "identityNumber" TEXT NOT NULL,
    "maritalStatus" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "sex" "Sex",
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "bloodType" TEXT,
    "housingTenure" "HousingTenure",
    "housingRepairNeeded" BOOLEAN NOT NULL DEFAULT false,
    "housingRepairDescription" TEXT,
    "hasDisease" BOOLEAN NOT NULL DEFAULT false,
    "diseaseDescription" TEXT,
    "needsSurgery" BOOLEAN NOT NULL DEFAULT false,
    "surgeryDescription" TEXT,
    "wearsGlasses" BOOLEAN NOT NULL DEFAULT false,
    "eyeConditionDescription" TEXT,
    "disability" BOOLEAN NOT NULL DEFAULT false,
    "medicalReport" BOOLEAN NOT NULL DEFAULT false,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "cargoCode" TEXT,
    "cargoDescription" TEXT,
    "institutionalFunction" TEXT,
    "pantSize" TEXT,
    "shirtSize" TEXT,
    "shoeSize" INTEGER,
    "bankName" TEXT,
    "accountType" "AccountType",
    "accountNumber" TEXT,
    "ministryEntryDate" TIMESTAMP(3),
    "employmentCondition" "EmploymentCondition" NOT NULL DEFAULT 'ACTIVO',
    "continuousLeaveDisease" TEXT,
    "continuousLeaveCount" INTEGER,
    "incapacityExecutor" "IncapacityExecutor",
    "incapacityDate" TIMESTAMP(3),
    "retirementDate" TIMESTAMP(3),
    "retirementProcessDate" TIMESTAMP(3),
    "retirementProcessObservation" TEXT,
    "administrativeProcessDate" TIMESTAMP(3),
    "administrativeProcessObservation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffChild" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "identityNumber" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "studying" BOOLEAN NOT NULL DEFAULT false,
    "educationLevel" TEXT,
    "institutionName" TEXT,
    "hasDisease" BOOLEAN NOT NULL DEFAULT false,
    "diseaseDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffQualification" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "QualificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT,
    "year" INTEGER,

    CONSTRAINT "StaffQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedagogicalLapse" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LapseStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "PedagogicalLapse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "studyPlanSubjectId" TEXT NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentLapseConfig" (
    "id" TEXT NOT NULL,
    "teacherAssignmentId" TEXT NOT NULL,
    "lapseId" TEXT NOT NULL,
    "calculationMode" "GradingCalculationMode" NOT NULL DEFAULT 'ACUMULATIVA',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentLapseConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "teacherAssignmentId" TEXT NOT NULL,
    "lapseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" DECIMAL(8,3),
    "orderNumber" INTEGER NOT NULL,
    "weight" DECIMAL(8,4) NOT NULL DEFAULT 1,
    "technique" TEXT,
    "instrument" TEXT,
    "scheduledAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "form" "AssessmentForm" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "score" DECIMAL(4,2),
    "technique" TEXT,
    "instrument" TEXT,
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LapseGrade" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherAssignmentId" TEXT NOT NULL,
    "lapseId" TEXT NOT NULL,
    "score" DECIMAL(4,2),
    "absences" INTEGER,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "LapseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualSubjectResult" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studyPlanSubjectId" TEXT NOT NULL,
    "numericScore" DECIMAL(4,2),
    "letterScore" TEXT,
    "status" "ResultStatus" NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnualSubjectResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingSubject" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studyPlanSubjectId" TEXT,
    "manualSubjectName" TEXT,
    "sourceLevel" TEXT,
    "sourceAcademicYear" TEXT NOT NULL,
    "status" "PendingStatus" NOT NULL DEFAULT 'ABIERTA',

    CONSTRAINT "PendingSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingOpportunity" (
    "id" TEXT NOT NULL,
    "pendingSubjectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),

    CONSTRAINT "PendingOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAttempt" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "form" "AssessmentForm" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "score" DECIMAL(4,2),
    "technique" TEXT,
    "instrument" TEXT,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PendingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAttempt" (
    "id" TEXT NOT NULL,
    "pendingSubjectId" TEXT NOT NULL,
    "form" "AssessmentForm" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "score" DECIMAL(4,2),
    "technique" TEXT,
    "instrument" TEXT,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableGroup" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT,
    "description" TEXT,

    CONSTRAINT "StableGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableGroupMembership" (
    "id" TEXT NOT NULL,
    "stableGroupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StableGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffId_key" ON "User"("staffId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FederalState_name_key" ON "FederalState"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_stateId_name_key" ON "Municipality"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Parish_municipalityId_name_key" ON "Parish"("municipalityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GradingPolicy_academicYearId_key" ON "GradingPolicy"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_identityNumber_key" ON "Student"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolIdentityNumber_key" ON "Student"("schoolIdentityNumber");

-- CreateIndex
CREATE INDEX "Student_active_lastName_firstName_idx" ON "Student"("active", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Student_identityNumber_idx" ON "Student"("identityNumber");

-- CreateIndex
CREATE INDEX "Student_schoolIdentityNumber_idx" ON "Student"("schoolIdentityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Representative_identityNumber_key" ON "Representative"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_studentId_academicYearId_type_key" ON "StudentDocument"("studentId", "academicYearId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlan_code_effectiveFrom_key" ON "StudyPlan"("code", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanSubject_studyPlanId_subjectId_gradeLevel_key" ON "StudyPlanSubject"("studyPlanId", "subjectId", "gradeLevel");

-- CreateIndex
CREATE INDEX "Mention_studyPlanId_active_idx" ON "Mention"("studyPlanId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Mention_studyPlanId_name_key" ON "Mention"("studyPlanId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SectionName_name_key" ON "SectionName"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_academicYearId_studyPlanId_gradeLevel_name_key" ON "Section"("academicYearId", "studyPlanId", "gradeLevel", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_previousEnrollmentId_key" ON "Enrollment"("previousEnrollmentId");

-- CreateIndex
CREATE INDEX "Enrollment_academicYearId_gradeLevel_condition_idx" ON "Enrollment"("academicYearId", "gradeLevel", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_academicYearId_key" ON "Enrollment"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_sectionId_listNumber_key" ON "Enrollment"("sectionId", "listNumber");

-- CreateIndex
CREATE INDEX "EnrollmentSubject_enrollmentId_origin_active_idx" ON "EnrollmentSubject"("enrollmentId", "origin", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentSubject_enrollmentId_studyPlanSubjectId_key" ON "EnrollmentSubject"("enrollmentId", "studyPlanSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_enrollmentId_key" ON "Withdrawal"("enrollmentId");

-- CreateIndex
CREATE INDEX "EnrollmentMovement_enrollmentId_movementDate_idx" ON "EnrollmentMovement"("enrollmentId", "movementDate");

-- CreateIndex
CREATE INDEX "EnrollmentMovement_type_movementDate_idx" ON "EnrollmentMovement"("type", "movementDate");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_representativeId_academicYearId_key" ON "Contribution"("representativeId", "academicYearId");

-- CreateIndex
CREATE INDEX "StaffPositionCatalog_staffType_active_idx" ON "StaffPositionCatalog"("staffType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPositionCatalog_staffType_code_key" ON "StaffPositionCatalog"("staffType", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_identityNumber_key" ON "Staff"("identityNumber");

-- CreateIndex
CREATE INDEX "StaffChild_staffId_birthDate_idx" ON "StaffChild"("staffId", "birthDate");

-- CreateIndex
CREATE INDEX "StaffChild_identityNumber_idx" ON "StaffChild"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PedagogicalLapse_academicYearId_number_key" ON "PedagogicalLapse"("academicYearId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_staffId_sectionId_studyPlanSubjectId_key" ON "TeacherAssignment"("staffId", "sectionId", "studyPlanSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentLapseConfig_teacherAssignmentId_lapseId_key" ON "AssignmentLapseConfig"("teacherAssignmentId", "lapseId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_teacherAssignmentId_lapseId_orderNumber_key" ON "Assessment"("teacherAssignmentId", "lapseId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentId_enrollmentId_form_key" ON "AssessmentAttempt"("assessmentId", "enrollmentId", "form");

-- CreateIndex
CREATE UNIQUE INDEX "LapseGrade_enrollmentId_teacherAssignmentId_lapseId_key" ON "LapseGrade"("enrollmentId", "teacherAssignmentId", "lapseId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualSubjectResult_enrollmentId_studyPlanSubjectId_key" ON "AnnualSubjectResult"("enrollmentId", "studyPlanSubjectId");

-- CreateIndex
CREATE INDEX "PendingSubject_enrollmentId_manualSubjectName_idx" ON "PendingSubject"("enrollmentId", "manualSubjectName");

-- CreateIndex
CREATE UNIQUE INDEX "PendingSubject_enrollmentId_studyPlanSubjectId_sourceAcadem_key" ON "PendingSubject"("enrollmentId", "studyPlanSubjectId", "sourceAcademicYear");

-- CreateIndex
CREATE UNIQUE INDEX "PendingOpportunity_pendingSubjectId_sequence_key" ON "PendingOpportunity"("pendingSubjectId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PendingAttempt_opportunityId_form_key" ON "PendingAttempt"("opportunityId", "form");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAttempt_pendingSubjectId_form_key" ON "ReviewAttempt"("pendingSubjectId", "form");

-- CreateIndex
CREATE UNIQUE INDEX "StableGroup_academicYearId_name_key" ON "StableGroup"("academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StableGroupMembership_stableGroupId_studentId_key" ON "StableGroupMembership"("stableGroupId", "studentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Municipality" ADD CONSTRAINT "Municipality_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "FederalState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parish" ADD CONSTRAINT "Parish_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPolicy" ADD CONSTRAINT "GradingPolicy_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_birthStateId_fkey" FOREIGN KEY ("birthStateId") REFERENCES "FederalState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_birthMunicipalityId_fkey" FOREIGN KEY ("birthMunicipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_birthParishId_fkey" FOREIGN KEY ("birthParishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_residenceStateId_fkey" FOREIGN KEY ("residenceStateId") REFERENCES "FederalState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_residenceMunicipalityId_fkey" FOREIGN KEY ("residenceMunicipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_residenceParishId_fkey" FOREIGN KEY ("residenceParishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRepresentative" ADD CONSTRAINT "StudentRepresentative_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRepresentative" ADD CONSTRAINT "StudentRepresentative_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnthropometricRecord" ADD CONSTRAINT "AnthropometricRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnthropometricRecord" ADD CONSTRAINT "AnthropometricRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanSubject" ADD CONSTRAINT "StudyPlanSubject_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanSubject" ADD CONSTRAINT "StudyPlanSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "Mention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_previousEnrollmentId_fkey" FOREIGN KEY ("previousEnrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubject" ADD CONSTRAINT "EnrollmentSubject_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubject" ADD CONSTRAINT "EnrollmentSubject_studyPlanSubjectId_fkey" FOREIGN KEY ("studyPlanSubjectId") REFERENCES "StudyPlanSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubject" ADD CONSTRAINT "EnrollmentSubject_sourceEnrollmentId_fkey" FOREIGN KEY ("sourceEnrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentMovement" ADD CONSTRAINT "EnrollmentMovement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffChild" ADD CONSTRAINT "StaffChild_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQualification" ADD CONSTRAINT "StaffQualification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedagogicalLapse" ADD CONSTRAINT "PedagogicalLapse_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_studyPlanSubjectId_fkey" FOREIGN KEY ("studyPlanSubjectId") REFERENCES "StudyPlanSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLapseConfig" ADD CONSTRAINT "AssignmentLapseConfig_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLapseConfig" ADD CONSTRAINT "AssignmentLapseConfig_lapseId_fkey" FOREIGN KEY ("lapseId") REFERENCES "PedagogicalLapse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_lapseId_fkey" FOREIGN KEY ("lapseId") REFERENCES "PedagogicalLapse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LapseGrade" ADD CONSTRAINT "LapseGrade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LapseGrade" ADD CONSTRAINT "LapseGrade_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LapseGrade" ADD CONSTRAINT "LapseGrade_lapseId_fkey" FOREIGN KEY ("lapseId") REFERENCES "PedagogicalLapse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualSubjectResult" ADD CONSTRAINT "AnnualSubjectResult_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualSubjectResult" ADD CONSTRAINT "AnnualSubjectResult_studyPlanSubjectId_fkey" FOREIGN KEY ("studyPlanSubjectId") REFERENCES "StudyPlanSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingSubject" ADD CONSTRAINT "PendingSubject_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingSubject" ADD CONSTRAINT "PendingSubject_studyPlanSubjectId_fkey" FOREIGN KEY ("studyPlanSubjectId") REFERENCES "StudyPlanSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingOpportunity" ADD CONSTRAINT "PendingOpportunity_pendingSubjectId_fkey" FOREIGN KEY ("pendingSubjectId") REFERENCES "PendingSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAttempt" ADD CONSTRAINT "PendingAttempt_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "PendingOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_pendingSubjectId_fkey" FOREIGN KEY ("pendingSubjectId") REFERENCES "PendingSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableGroup" ADD CONSTRAINT "StableGroup_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableGroupMembership" ADD CONSTRAINT "StableGroupMembership_stableGroupId_fkey" FOREIGN KEY ("stableGroupId") REFERENCES "StableGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableGroupMembership" ADD CONSTRAINT "StableGroupMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableGroupMembership" ADD CONSTRAINT "StableGroupMembership_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
