# Plan de implementación integral

## Estrategia

Implementar en una sola rama y release, manteniendo ciclos
rojo-verde-refactor por comportamiento. Los commits intermedios deben dejar
tests, typechecks y build en verde.

## Fase 1: fundamentos y esquema

1. Agregar dependencias de Argon2id, Nodemailer y utilidades de prueba HTTP.
2. Escribir pruebas rojas para normalización de email, códigos, contraseñas,
   categorías y etiquetas.
3. Implementar servicios puros mínimos hasta ponerlas en verde.
4. Extender `initDb` con migraciones aditivas para usuarios, desafíos y
   propuestas, más índices y constraints.
5. Añadir configuración SMTP y secreto HMAC a `.env.example` y
   `render.yaml`, sin valores sensibles.

## Fase 2: autenticación backend

1. Extraer una factoría de aplicación Express que pueda probarse sin abrir
   puerto.
2. Escribir pruebas rojas de registro: solicitar código, verificar y completar.
3. Implementar repositorio de desafíos, mailer inyectable y rutas de registro.
4. Escribir pruebas rojas de login con contraseña y con código.
5. Implementar ambos logins y JWT con email/sessionVersion.
6. Escribir pruebas rojas de recuperación e invalidación de sesiones.
7. Implementar reset y chequeo de sessionVersion en middleware.
8. Mantener respuestas genéricas y mapear límites a 429.

## Fase 3: autenticación frontend

1. Escribir pruebas de la máquina de estados del flujo email-first.
2. Extender cliente API y store de autenticación.
3. Reemplazar el modal por pasos: email, método, código, contraseña y reset.
4. Implementar pegado de código, reenvío temporizado, retorno y errores
   accesibles.
5. Verificar login/registro contra backend local con mailer de desarrollo.

## Fase 4: propuestas backend

1. Escribir pruebas rojas de creación y permisos.
2. Implementar tabla/repositorio/rutas de propuestas.
3. Escribir pruebas de bandeja, detalle y privacidad.
4. Escribir pruebas rojas de aceptación, rechazo, idempotencia y conflicto.
5. Implementar actualización transaccional de jugada/lista y confirmación de
   override.

## Fase 5: propuestas frontend

1. Extender el origen de una copia con snapshot base.
2. Escribir pruebas del armado de payload y resumen de diferencias.
3. Agregar «Proponer cambios», mensaje y reanudación tras autenticarse.
4. Crear bandeja del dueño, detalle, vista previa, aceptar/rechazar y conflicto.
5. Agregar vista de estado para propuestas enviadas.

## Fase 6: listas avanzadas

1. Escribir pruebas de reordenamiento y re-snapshot.
2. Extender API propia de listas para obtener y guardar contenido ordenado.
3. Implementar editor de lista con selección, drag-and-drop y botones
   arriba/abajo.
4. Implementar «Actualizar versiones» con resolución explícita de faltantes.
5. Mantener id/link estable y actualizar updatedAt.

## Fase 7: taxonomía

1. Poner en verde las pruebas de normalización y migración de categorías.
2. Aplicar migración al cargar/guardar jugadas.
3. Sustituir edición por texto por chips multiselección y entrada personalizada.
4. Cambiar filtros múltiples a semántica «todas».
5. Reutilizar presets en biblioteca y editor de listas.

## Fase 8: verificación y entrega

1. Ejecutar tests completos, typecheck frontend/servidor y build.
2. Ejecutar smoke API con una base de prueba o transacción aislada.
3. Recorrer en navegador registro, login por contraseña/código, reset,
   propuesta, conflicto, aceptación, edición de lista y link público.
4. Revisar logs para asegurar que no exponen secretos.
5. Revisar diff, commitear intencionalmente y pushear a `main`.
