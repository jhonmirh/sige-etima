# API principal

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET/POST/PATCH /api/students`
- `POST /api/students/:id/anthropometrics`
- `GET/POST /api/representatives`
- `POST /api/representatives/:id/students`
- `GET/POST /api/enrollments`
- `GET /api/enrollments/:id`
- `GET /api/enrollments/re-enrollment/lookup`
- `POST /api/enrollments/re-enrollment`
- `GET /api/enrollments/roster/:sectionId`
- `POST /api/enrollments/roster/:sectionId/lock`
- `POST /api/enrollments/:id/withdraw`
- `POST /api/enrollments/:id/graduate`
- `POST /api/enrollments/year/:yearId/inactivate`
- `PATCH /api/enrollments/:id/condition` (ADMIN/DIRECTOR)
- `GET /api/academic/plans|years|sections|geography`
- `POST /api/academic/years`
- `PATCH /api/academic/years/:id/activate`
- `POST /api/academic/years/:id/clone-sections`
- `POST /api/academic/sections`
- `GET/POST /api/staff`
- `POST /api/grading/assessments/:assessmentId/students/:enrollmentId/:form`
- `POST /api/grading/lapses/:lapseId/assignments/:assignmentId/students/:enrollmentId/close`
- `POST /api/grading/annual/:studyPlanSubjectId/students/:enrollmentId`
- `GET/POST /api/groups`
- `GET /api/reports/dashboard`
- `GET /api/reports/roster/:sectionId.xlsx`
- `GET /api/reports/study-certificate/:enrollmentId.pdf`
- `GET /api/reports/work-certificate/:staffId.pdf`

Swagger queda en `/api/docs`.
