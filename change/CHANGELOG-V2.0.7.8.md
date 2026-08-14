# SIGE-ETIMA V2.0.7.8 — Secciones y Responsive

## Cambios funcionales
- Eliminada por completo la función **Clonar secciones** de la interfaz y del API.
- El año escolar se selecciona directamente en el encabezado de **Secciones del período**.
- **Crear sección** y **Secciones configuradas** ahora se muestran en una sola columna, una debajo de la otra.
- Se mantiene la creación manual de cada sección para evitar arrastrar configuraciones equivocadas entre períodos.

## Responsive integral
Se reforzó la adaptación visual para:
- Monitores grandes (>=1600 px)
- PC y laptops medianas
- Laptops compactas y tablets horizontales
- Tablets verticales
- Celulares
- Celulares estrechos

### Ajustes principales
- Anchuras y espaciados progresivos.
- Sidebar de escritorio con tamaño adecuado al monitor.
- Sidebar móvil convertido en navegación horizontal desplazable.
- Formularios pasan de dos columnas a una en teléfonos.
- Tablas mantienen lectura mediante desplazamiento horizontal controlado.
- Botones e inputs con altura táctil mínima.
- Tamaños de tipografía y tarjetas adaptativos.
- Evita desbordamiento horizontal de la aplicación.

## Base de datos
No modifica Prisma ni PostgreSQL.
