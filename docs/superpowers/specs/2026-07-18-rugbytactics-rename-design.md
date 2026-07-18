# Cambio de marca a RugbyTactics

## Objetivo

Reemplazar la marca actual TacticsRugby por RugbyTactics en la aplicación,
sus metadatos, documentación y repositorio, sin perder las jugadas guardadas
localmente ni alterar el servicio remoto de Render.

## Convenciones

- Marca visible: `RugbyTactics`.
- Identificadores técnicos: `rugby-tactics`.
- Repositorio de GitHub: `RugbyTactics`.

## Alcance local

El cambio incluye:

- textos visibles de la aplicación, ayuda y bienvenida;
- título HTML y metadatos PWA;
- `package.json` y `package-lock.json`;
- nombres de archivos exportados;
- documentación de producto y proyecto;
- nombre declarativo del servicio en `render.yaml`;
- claves de almacenamiento local.

No se renombrará el directorio local del proyecto, porque hacerlo mientras el
entorno está trabajando dentro de él puede invalidar rutas y herramientas.

## Compatibilidad de persistencia

Las claves nuevas usarán el prefijo `rugby-tactics-`. Al cargar la aplicación,
si una clave nueva no existe pero su equivalente `tactics-rugby-` sí existe,
se copiará el valor anterior a la clave nueva. La migración será idempotente y
conservará la clave anterior como respaldo; no habrá eliminación destructiva.

## Repositorio y Render

Después de verificar y commitear los cambios locales:

1. se renombrará el repositorio GitHub de
   `DalessandroBautista/tacticsRugby` a
   `DalessandroBautista/RugbyTactics`;
2. se actualizará `origin` a la URL nueva;
3. se verificará que el remoto responda y que la rama local conserve su enlace.

`render.yaml` declarará `rugby-tactics`, pero no se renombrará el servicio
existente desde el dashboard ni se modificará su URL pública. Ese cambio externo
requiere una operación separada para evitar interrumpir el despliegue actual.

## Verificación

La implementación se considerará completa cuando:

- no queden apariciones residuales del nombre anterior fuera de la migración de
  claves y del historial;
- los tests existentes pasen;
- frontend y servidor superen typecheck;
- el build de producción termine correctamente;
- el repositorio remoto use el nombre nuevo y `origin` apunte a él.

## Fuera de alcance

- rediseño visual de la marca o creación de logo;
- cambio del hostname de Render;
- cambios del flujo de autenticación y correo;
- eliminación de datos o claves de compatibilidad.
