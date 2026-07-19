# Plan de implementación: visor mobile y edición rápida

## Estrategia

Implementar por capas pequeñas con TDD, reutilizando el motor de reproducción y
el store actuales. Cada fase debe terminar con tests y typecheck en verde.

## Fase 1: capacidades y navegación mobile

1. Escribir pruebas para detección estable de dispositivo táctil mobile.
2. Implementar utilidades de capacidades, orientación y fullscreen.
3. Escribir pruebas para el reducer de vistas `library`, `viewer` y
   `quick-edit`.
4. Implementar un store de interfaz mobile sin persistir la vista entre visitas.
5. Conectar links `#play=` y `#list=` para que entren directamente al visor.

## Fase 2: biblioteca mobile

1. Escribir pruebas de render para jugadas locales, estado vacío y filtros.
2. Implementar `MobileLibrary` con tarjetas táctiles y acciones `Ver`/`Editar`.
3. Integrar listas propias para usuarios autenticados y el flujo de login cuando
   corresponda.
4. Añadir acceso secundario al editor completo con advertencia.

## Fase 3: visor horizontal

1. Escribir pruebas del controlador de fullscreen y orientation lock con
   fallbacks.
2. Implementar hook que entra y sale sólo de los estados iniciados por la app.
3. Escribir pruebas del temporizador de controles.
4. Implementar `MobileViewer` reutilizando `FieldCanvas` y playback existente.
5. Adaptar controles a safe areas, targets de 44px y reduced motion.
6. Integrar estado de rotación, aviso vertical y cambios de viewport.

## Fase 4: listas y links compartidos

1. Probar entrada directa desde un link público mobile.
2. Reutilizar autoavance y navegación manual de listas.
3. Probar cierre y restauración intacta de la biblioteca local.
4. Evitar que salir inesperadamente de fullscreen cierre el visor.

## Fase 5: edición rápida

1. Escribir pruebas de snapshot, guardar y cancelar.
2. Implementar `MobileQuickEditor` con metadatos y etiquetas.
3. Adaptar `FieldCanvas` a gestos táctiles de selección, drag, pan y zoom.
4. Agrupar cada gesto como una sola entrada de historial y persistencia.
5. Conservar origen/propuesta para copias compartidas.

## Fase 6: navegación e integración

1. Manejar atrás del navegador por capas mobile.
2. Integrar el modo mobile en `Layout` sin modificar la ruta desktop.
3. Añadir estados de error, reintento y vacío.
4. Verificar accesibilidad de labels, foco y avisos.

## Fase 7: verificación

1. Ejecutar tests completos, typecheck frontend/servidor, lint y build.
2. Recorrer en navegador viewports Android e iPhone, vertical y horizontal.
3. Probar jugada local, `#play=`, `#list=`, autoavance y restauración.
4. Revisar consola, diff y ausencia de secretos.
5. Actualizar versión, commitear, etiquetar y pushear.
