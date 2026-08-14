# SIGE-ETIMA V2.0.7.7 — Planes con denominación única

- Elimina de la interfaz la administración manual de menciones.
- Impide por API crear, renombrar, activar o inactivar menciones dentro de un código existente.
- Cada código oficial representa una sola opción académica.
- Para incorporar un plan no catalogado se exige un código nuevo y la denominación oficial completa; no se agregan menciones separadas.
- Normaliza automáticamente el plan 41049 a CIENCIAS AGRÍCOLAS Y PECUARIAS.
- Elimina automáticamente la mención errónea ALGODON/ALGODÓN asociada a 41049 cuando no tiene secciones; si tuviera histórico, se inactiva sin borrar dicho histórico.
- Mantiene las menciones canónicas precargadas únicamente como dato interno necesario para secciones y matrícula.
