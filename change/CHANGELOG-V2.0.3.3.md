# SIGE-ETIMA V2.0.3.3

## Ajuste de numeración de nómina por fecha de cierre

Regla aplicada para cada nómina/sección del año escolar:

1. Antes de la fecha de cierre de matrícula, la nómina es PROVISIONAL.
2. Durante ese período los estudiantes se ordenan por número de cédula dentro de su sección (la sección ya pertenece a un año escolar, plan/mención y grado).
3. Se muestra un número provisional visible, pero todavía puede cambiar si se incorpora un estudiante cuya cédula modifica el orden.
4. A partir de la fecha de cierre de matrícula, inclusive, la nómina queda FIJA.
5. Al fijarse, los estudiantes inscritos antes del cierre reciben números definitivos según el orden numérico de cédula.
6. Toda inscripción o reinscripción con fecha igual o posterior al cierre recibe el siguiente número disponible al final.
7. Ningún número previamente ocupado se reutiliza ni se desplaza por nuevas matrículas.
8. Los estudiantes retirados conservan su número de lista.
9. Si existen registros post-cierre antes de fijar una nómina, se ubican después de la nómina inicial y se ordenan por fecha de inscripción/reinscripción.
10. La consulta de matrícula fija automáticamente las nóminas cuyo cierre ya fue alcanzado; además el flujo de inscripción/reinscripción fija la sección al registrar el primer movimiento post-cierre.

## Interfaz

- El banner del año escolar explica claramente si la numeración es PROVISIONAL o FIJA.
- Antes del cierre, el número se muestra con la marca `PROV.`.
- Después del cierre, los nuevos registros se identifican como `POST-CIERRE`.
- En Configuración anual ya no se permite cerrar prematuramente una nómina: antes de la fecha se muestra `PROVISIONAL HASTA <fecha>`.
- Desde la fecha de cierre aparece la acción `Fijar nómina` si todavía no fue fijada automáticamente.

## Archivos modificados

- `apps/api/src/enrollment/enrollment.ts`
- `apps/web/src/app/enrollments/page.tsx`
- `apps/web/src/app/enrollments/configuration/page.tsx`

No hay cambios en `schema.prisma` ni nuevas tablas en esta versión.
