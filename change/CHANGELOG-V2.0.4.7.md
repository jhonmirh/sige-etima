# SIGE-ETIMA V2.0.4.7

## Primera matrícula: literal histórico y alerta por retroceso de grado

- El sistema busca el literal A/B/C/D en todo el historial de matrículas del estudiante, no solamente en la matrícula más reciente.
- Si existe un literal registrado y el grado seleccionado es 2° o superior, el literal se muestra pero queda bloqueado.
- Si no existe literal registrado y el grado es 2° o superior, se mantiene el mensaje `BLOQUEADO PARA 2° AÑO EN ADELANTE`.
- En 1° año el literal sigue siendo editable mediante lista A/B/C/D y, si ya existía uno, se precarga para facilitar una corrección administrativa.
- Se muestra una alerta destacada si el grado seleccionado es inferior al grado que figura en la matrícula más reciente o si contradice el último año aprobado registrado.
- Al intentar guardar en esa situación se solicita una segunda confirmación. La operación no queda prohibida porque puede tratarse de una corrección válida de primera matrícula.
- No hay cambios en Prisma ni en PostgreSQL.
