# Autenticación, colaboración y listas avanzadas

## Objetivo

Entregar en una sola versión tres capacidades conectadas de RugbyTactics:

1. cuentas verificadas por email con contraseña o código de acceso;
2. propuestas de cambios sobre jugadas compartidas, revisables por el dueño;
3. listas actualizables y reordenables, con clasificación múltiple de jugadas.

La identidad es una dependencia de las propuestas. Las listas y las jugadas
seguirán siendo snapshots públicos de sólo lectura hasta que el dueño acepte una
propuesta o actualice explícitamente una lista.

## Decisiones principales

- Se mantiene el backend Express y PostgreSQL existente.
- El correo se envía por Gmail SMTP mediante un adaptador desacoplado.
- Las contraseñas se almacenan con Argon2id, nunca con SHA-256.
- Los códigos son numéricos de seis dígitos, duran diez minutos y son de un solo
  uso.
- El acceso comienza siempre por email y adapta el paso siguiente al flujo
  elegido.
- Abrir una lista sigue siendo público; enviar una propuesta exige una cuenta
  verificada.
- Una jugada conserva una categoría principal y puede tener múltiples etiquetas.

## Arquitectura

### Autenticación

El backend se divide en unidades con responsabilidades explícitas:

- `authRouter`: valida solicitudes HTTP y traduce errores a respuestas.
- `authService`: registro, login, recuperación y emisión de sesiones.
- `verificationService`: crea, verifica, limita e invalida códigos.
- `passwordService`: encapsula Argon2id.
- `mailService`: interfaz de correo con implementaciones SMTP y falsa para
  pruebas.

El frontend mantiene `useAuth` como estado de sesión, pero el modal pasa a ser
un flujo por pasos. Los componentes no conocen SMTP, hashes ni reglas de códigos.

### Colaboración

Las propuestas viven en rutas y tablas propias. Una propuesta contiene la
versión base que recibió el colaborador y la versión modificada que envía. El
servidor deriva el resumen de diferencias y determina si la jugada del dueño
cambió desde la base.

### Listas y clasificación

La API de listas devuelve también sus jugadas al dueño cuando abre el editor.
Actualizar, reordenar y aceptar propuestas reutiliza un servicio de listas para
evitar mutaciones distintas sobre el JSONB.

La categoría sigue siendo un único valor compatible con datos existentes. Las
etiquetas son una lista normalizada, sin duplicados, y representan facetas que
pueden combinarse.

## Modelo de datos

### Usuarios

La tabla `users` incorpora:

- `email TEXT`, único sin distinguir mayúsculas;
- `password_hash TEXT NOT NULL`;
- `session_version INTEGER NOT NULL DEFAULT 1`;
- `email_verified_at TIMESTAMPTZ NOT NULL`.

`username` queda nullable durante la migración para no romper referencias por
`user_id`. No se utiliza en cuentas nuevas ni se expone en la API.

### Desafíos de verificación

`email_verification_challenges` contiene:

- identificador aleatorio;
- email normalizado;
- propósito: `register`, `login` o `reset`;
- hash HMAC del código, nunca el código en claro;
- expiración, cantidad de intentos, fecha de consumo y fecha de creación.

Sólo puede haber un desafío activo por email y propósito. Pedir otro invalida el
anterior. Se permite un envío por minuto y cinco por cada ventana de quince
minutos. Cada desafío admite cinco intentos.

### Propuestas

`play_proposals` contiene:

- id público;
- `playlist_id`, `play_id` y `owner_user_id`;
- `proposer_user_id`;
- `base_data JSONB` y `proposed_data JSONB`;
- mensaje opcional de hasta 500 caracteres;
- estado `pending`, `accepted` o `rejected`;
- fechas de creación y revisión.

Una propuesta pendiente es inmutable. Aceptar o rechazar es idempotente para el
mismo resultado y devuelve conflicto si ya fue resuelta de otra manera.

## Flujos de autenticación

### Registro

1. El usuario ingresa email y elige registrarse.
2. `POST /api/auth/register/code` envía un código con respuesta genérica.
3. `POST /api/auth/register/verify` valida el código y devuelve un token de
   configuración de cinco minutos.
4. `POST /api/auth/register/complete` recibe ese token y una contraseña.
5. El servidor crea la cuenta verificada y devuelve la sesión.

La contraseña tendrá entre 10 y 128 caracteres. No se impondrán reglas de
composición que incentiven patrones previsibles.

### Login

Después de ingresar el email, la interfaz muestra:

- contraseña;
- «Usar un código».

El login con contraseña usa `POST /api/auth/login/password`. El login por código
usa `POST /api/auth/login/code` y `POST /api/auth/login/verify`.

Las respuestas de solicitud de código no revelan si el email existe. Un código
de login para una cuenta inexistente no crea la cuenta.

### Recuperación

`POST /api/auth/reset/code` y `POST /api/auth/reset/verify` producen un token
de recuperación de cinco minutos. `POST /api/auth/reset/complete` cambia la
contraseña, incrementa `session_version` y emite una sesión nueva.

Los JWT duran treinta días e incluyen `userId`, `email` y
`sessionVersion`. El middleware verifica que la versión coincida con la base,
mediante una consulta autenticada por solicitud, por lo que un cambio de
contraseña invalida sesiones anteriores.

## Entrega de correo

Producción usa Nodemailer con:

- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_SECURE`;
- `SMTP_USER`;
- `SMTP_APP_PASSWORD`;
- `EMAIL_FROM`.
- `AUTH_CODE_SECRET`, independiente de `JWT_SECRET`, para el HMAC de códigos.

En producción, la ausencia de configuración impide iniciar el servidor con un
error claro. En desarrollo se permite un transportador de consola que registra
el código únicamente en el proceso local. Ninguna respuesta HTTP devuelve el
código.

Los emails incluyen versión HTML y texto plano, nombre RugbyTactics, código,
propósito y vencimiento.

## Flujo de propuestas

1. Una persona abre una lista pública y elige «Editar una copia».
2. La copia conserva `origin.listId`, `origin.playId` y la versión base.
3. Después de editar aparece «Proponer cambios».
4. Si no inició sesión, completa autenticación y vuelve al envío sin perder la
   copia.
5. Puede agregar un mensaje y enviar la propuesta.
6. El dueño ve un indicador de propuestas pendientes y abre «Propuestas».
7. El detalle muestra autor, mensaje, fecha, resumen de cambios y vista previa
   base/propuesta.
8. El dueño acepta o rechaza.

Al aceptar, una transacción:

- reemplaza la jugada del dueño en `plays` cuando existe con el mismo id;
- reemplaza el item correspondiente dentro del snapshot de la lista;
- marca la propuesta como aceptada;
- devuelve la jugada y lista resultantes al frontend.

Si la jugada actual del dueño difiere de la base, la API responde `409` con un
resumen de conflicto. La interfaz permite revisar y confirmar
`acceptCurrentOverride: true`. No se intentará un merge automático de
trayectorias en esta versión.

Rechazar sólo cambia el estado. El colaborador puede consultar el estado de sus
propias propuestas, pero no ve el email ni otras propuestas del dueño.

Las rutas serán:

- `POST /api/proposals` y `GET /api/proposals/mine` para el colaborador;
- `GET /api/proposals/inbox` y `GET /api/proposals/:id` para revisión;
- `POST /api/proposals/:id/accept` y `POST /api/proposals/:id/reject` para
  el dueño.

## Listas avanzadas

«Mis listas» incorpora «Editar» para:

- cambiar el nombre;
- seleccionar o quitar jugadas;
- arrastrar para reordenar;
- mover con botones arriba/abajo para teclado y lectores de pantalla;
- guardar el snapshot editado;
- ejecutar «Actualizar versiones».

«Actualizar versiones» busca cada id de la lista en la biblioteca actual del
dueño y reemplaza su contenido conservando el orden. Si una jugada ya no existe,
la interfaz la marca como faltante y permite conservar el snapshot anterior o
quitarla antes de confirmar. No se agregan automáticamente jugadas nuevas.

Cada actualización modifica `updated_at`, pero conserva el id y el enlace
público.

## Categorías y etiquetas

Las categorías principales compatibles son:

- Lineout
- Scrum
- Ataque
- Defensa
- Patada
- Maul
- Salida
- General

Los valores ingleses existentes se migran al mostrarlos y al volver a guardar:
`Attack` → `Ataque`, `Defense` → `Defensa`, `Kick` → `Patada`.
`Backline` se conserva como etiqueta y la categoría pasa a `Ataque`.

La biblioteca ofrece chips multiselección con estos presets:

- lineout, scrum, ataque, defensa, patada;
- mitad de cancha, 22 propia, 22 rival;
- salida, recepción, maul.

También admite etiquetas personalizadas. Se normalizan con espacios internos
simples, comparación sin distinguir mayúsculas y un máximo de 30 caracteres por
etiqueta y 12 etiquetas por jugada. Los filtros seleccionados usan coincidencia
«todas» para combinar facetas.

## Interfaz

El acceso usa el diseño aprobado de email primero:

- pantalla inicial con email y «Continuar»;
- pasos posteriores para contraseña, código o nueva contraseña;
- indicador de progreso y opción de volver;
- seis casillas de código con pegado completo y reenvío temporizado;
- mensajes de error junto al campo afectado.

Las propuestas se administran desde una bandeja compacta accesible en la barra
superior. Las listas se editan dentro del diálogo existente para conservar el
lenguaje visual ámbar/tiza de RugbyTactics.

Todos los diálogos controlan foco, se cierran con Escape, tienen etiquetas
accesibles y no dependen sólo de color o drag-and-drop.

## Errores y observabilidad

- `400`: datos inválidos.
- `401`: credenciales o sesión inválidas.
- `403`: recurso válido sin permiso.
- `404`: recurso no encontrado.
- `409`: email ocupado, propuesta resuelta o conflicto de versión.
- `429`: límite de códigos o intentos.
- `500`/`503`: error interno o proveedor de correo no disponible.

Los logs incluyen ids de solicitud/desafío/propuesta, nunca contraseñas, códigos,
tokens ni cuerpos completos de jugadas.

## Pruebas y verificación

La implementación seguirá ciclos TDD. La cobertura mínima incluye:

- normalización de email y etiquetas;
- hashing/verificación de contraseña y códigos;
- expiración, consumo, intentos y límites de códigos;
- registro, ambos logins y recuperación;
- invalidación de JWT por `session_version`;
- permisos y transiciones de propuestas;
- detección y confirmación de conflicto;
- aceptación transaccional sobre jugada y lista;
- actualización y reordenamiento de listas;
- migración de categorías;
- estados principales de los diálogos React;
- preservación de la biblioteca local al usar listas públicas.

La entrega requiere:

- tests frontend y servidor;
- typecheck de ambos proyectos;
- build de producción;
- smoke test de API contra una base de prueba;
- recorrido real en navegador de registro, login por ambos métodos, propuesta,
  aceptación, actualización y reproducción pública;
- worktree limpio, commits intencionales y push a `main`.

## Fuera de alcance

- merge automático campo por campo de propuestas conflictivas;
- comentarios en hilo o múltiples rondas sobre una propuesta;
- OAuth social, passkeys o segundo factor;
- dominio de correo propio;
- historial ilimitado de versiones de listas;
- notificaciones por email de propuestas.
