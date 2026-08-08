# API principal

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET/POST/PATCH /api/students`
- `POST /api/students/:id/anthropometrics`
- `GET/POST /api/representatives`
- `POST /api/representatives/:id/students`
- `GET/POST /api/enrollments`
- `POST /api/enrollments/roster/:sectionId/lock`
- `POST /api/enrollments/:id/withdraw`
- `GET /api/academic/plans|years|sections|geography`
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
