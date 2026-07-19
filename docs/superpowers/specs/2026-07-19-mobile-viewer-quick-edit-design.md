# RugbyTactics: visor mobile y edición rápida

## Objetivo

Hacer que RugbyTactics sea útil desde un teléfono principalmente para elegir,
presentar y reproducir jugadas. En mobile, la visualización será el camino
predeterminado y el editor completo dejará de competir por espacio. Se ofrecerá
una edición rápida para modificaciones simples; el trabajo avanzado seguirá
orientado a computadoras.

## Alcance

Esta entrega incluye:

- biblioteca mobile de jugadas y listas;
- visor táctil horizontal a pantalla completa;
- reproducción individual y de listas con autoavance;
- edición rápida de metadatos y posiciones;
- entrada directa al visor desde links compartidos;
- fallbacks para navegadores que no permiten fullscreen o bloqueo de orientación;
- diseño responsive y pruebas de los flujos mobile.

No incluye grabación de trayectorias, edición de timeline, formaciones, zonas,
cantos, overlay de imágenes ni un reemplazo mobile del editor completo.

## Detección y modo inicial

La app usará capacidades y dimensiones de pantalla, no user-agent. Se
considerará experiencia mobile cuando el dispositivo tenga puntero principal
táctil y el lado menor de su pantalla sea de hasta `768px`. La decisión se toma
al iniciar la sesión y se mantiene al rotar; de esta manera un teléfono de
`844×390px` no cambia accidentalmente al editor desktop al entrar en landscape.
Los cambios de tamaño que no sean rotación vuelven a evaluar el modo.

En mobile:

1. Una apertura normal muestra la biblioteca simplificada.
2. Un link `#list=` entra directamente al visor de lista.
3. Un link `#play=` entra directamente al visor de esa jugada.
4. El usuario puede pedir el editor completo desde una acción secundaria. Antes
   de entrar se informa que la experiencia recomendada es una computadora.

En desktop se conserva el comportamiento actual.

La preferencia del usuario por biblioteca, visor o editor completo sólo vive en
la sesión actual. Una visita mobile nueva vuelve a priorizar la biblioteca; esto
evita que un editor difícil de usar quede configurado accidentalmente como
pantalla inicial permanente.

## Arquitectura de interfaz

### `useMobileExperience`

Hook aislado que expone:

- `isMobileExperience`;
- `isLandscape`;
- `canFullscreen`;
- `canLockOrientation`.

Escucha cambios de viewport y orientación y limpia todos los listeners al
desmontarse. El resto de la interfaz consume estas capacidades sin duplicar
consultas al navegador.

### `MobileLibrary`

Pantalla inicial mobile. Presenta tarjetas grandes de jugadas locales y listas
del usuario autenticado. Incluye búsqueda, categorías y etiquetas. Cada jugada
tiene una acción primaria `Ver` y una secundaria `Editar`. Cada lista tiene
`Reproducir lista`.

Si el usuario no inició sesión, se muestran sus jugadas locales. Las listas
propias requieren sesión y conservan el flujo de autenticación existente.

### `MobileViewer`

Contenedor de visualización que reutiliza `FieldCanvas`, el motor de animación y
el estado de reproducción existentes. No serializa ni convierte la jugada en un
video: sigue siendo una animación interactiva, presentada visualmente como un
reproductor de video.

Responsabilidades:

- solicitar fullscreen desde el gesto de `Ver` o `Play`;
- intentar bloquear orientación landscape después de entrar a fullscreen;
- mostrar el aviso de rotación cuando el viewport siga vertical;
- controlar visibilidad temporal de la interfaz;
- restaurar fullscreen y orientación al salir;
- delegar autoavance de listas al comportamiento existente.

### `MobileQuickEditor`

Editor táctil deliberadamente limitado. Permite:

- seleccionar y arrastrar jugadores;
- seleccionar y arrastrar la pelota;
- zoom con pellizco;
- desplazamiento del campo arrastrando el fondo;
- editar nombre, descripción, categoría y múltiples etiquetas;
- guardar o cancelar.

No muestra ni habilita grabación, timeline, formaciones, zonas, cantos,
trayectorias u overlays. Reutiliza el mismo modelo `Play` y las acciones del store
actuales. No existe un formato de datos mobile.

Las jugadas importadas desde listas conservan `origin` y `basePlay`; después de
una edición rápida mantienen disponible `Proponer cambios`.

## Navegación

El estado visual mobile tendrá tres vistas explícitas:

- `library`;
- `viewer`;
- `quick-edit`.

La vista se manejará como estado de interfaz, separada de `presentationMode` y
del contenido persistido. Entrar a `viewer` activa presentación; salir vuelve a
la vista de origen. Desde una lista compartida, salir cierra el visor y restaura
la biblioteca resguardada como ocurre actualmente.

El botón atrás del navegador y el gesto atrás no deben abandonar la app de
forma inesperada: primero cierran controles secundarios, luego edición rápida y
finalmente el visor. Se usará una entrada de `history` efímera para cada capa
mobile, sin colocar datos de jugadas en la URL.

## Fullscreen y orientación

Fullscreen y bloqueo de orientación son mejoras progresivas:

1. El usuario toca `Ver`, `Play` o `Reproducir lista`.
2. En ese mismo gesto se solicita `document.documentElement.requestFullscreen()`
   cuando está disponible.
3. Después se intenta `screen.orientation.lock('landscape')` cuando el navegador
   lo expone y lo permite.
4. Cualquier rechazo se captura y no interrumpe la reproducción.
5. Si el viewport permanece vertical, se muestra un overlay accesible que pide
   girar el teléfono. Al detectar landscape desaparece automáticamente.
6. Al salir se intenta `screen.orientation.unlock()` y `document.exitFullscreen()`
   sólo si RugbyTactics inició esos estados.

En iPhone/Safari no se presupone soporte de bloqueo. La app debe funcionar en
landscape embebido y respetar `env(safe-area-inset-*)`.

## Controles de reproducción

El campo ocupa todo el viewport disponible. Los controles aparecen:

- al abrir el visor;
- al tocar el campo;
- al pausar;
- al cambiar de jugada;
- ante un error recuperable.

Mientras la jugada reproduce, se ocultan luego de tres segundos sin interacción.
Pausados permanecen visibles. Un toque sobre el campo alterna su visibilidad sin
modificar la jugada.

La barra contiene áreas táctiles de al menos `44×44px` para:

- anterior;
- reiniciar;
- play/pausa;
- siguiente;
- progreso y tiempo;
- velocidad;
- salir.

En listas, el encabezado discreto muestra `LISTA · n de total`. El autoavance
existente se conserva. Los controles no se ocultan durante la pausa entre
jugadas para que el cambio sea comprensible.

Las animaciones de aparición respetan `prefers-reduced-motion`.

## Edición rápida y guardado

Al entrar a edición rápida se toma un snapshot para cancelar. Los movimientos se
aplican al store durante el gesto, pero se persisten al terminar el drag o al
guardar metadatos; así se evita escribir localStorage por cada evento táctil.

`Guardar` conserva los cambios en la biblioteca y deja la jugada seleccionada.
`Cancelar` restaura el snapshot sin generar una copia adicional. El historial
undo/redo recibe una sola entrada por gesto completo.

La edición rápida de una jugada compartida sólo ocurre después de `Editar una
copia`; nunca modifica el snapshot público ni la jugada del dueño.

## Estados y errores

- Sin jugadas: la biblioteca ofrece crear una jugada básica o abrir el editor
  completo.
- Lista eliminada o sin conexión: se muestra un mensaje con `Reintentar` y
  `Volver a mis jugadas`.
- Fullscreen rechazado: el visor continúa embebido.
- Bloqueo de orientación rechazado: se usa el aviso de giro.
- Cambio de orientación durante reproducción: el canvas se reajusta sin perder
  tiempo, velocidad ni jugada actual.
- Salida inesperada de fullscreen: se conserva el visor y reaparecen controles;
  no se cierra la lista automáticamente.

Los errores no deben borrar ni reemplazar la biblioteca local.

## Accesibilidad

- Todos los controles tienen nombre accesible y estado anunciado.
- Las áreas táctiles respetan un mínimo de 44 px.
- El visor soporta controles de teclado cuando existe teclado externo.
- El aviso de orientación usa `role="status"`, no bloquea lectores de pantalla.
- Contraste y foco siguen los tokens actuales de RugbyTactics.
- Safe areas se aplican a encabezado y controles.

## Pruebas

### Unitarias

- detección de experiencia mobile y cambios de orientación;
- reducer de vistas `library`, `viewer` y `quick-edit`;
- temporizador de controles con reproducción y pausa;
- cálculo de fallbacks fullscreen/orientación;
- snapshot, guardar y cancelar en edición rápida;
- un gesto produce una sola entrada de historial.

### Componentes

- biblioteca mobile muestra jugadas y filtra por categoría/etiqueta;
- `Ver` entra al visor y `Editar` al editor limitado;
- link compartido omite biblioteca;
- controles reaparecen al tocar y no se ocultan pausados;
- lista muestra posición y conserva autoavance;
- edición rápida no expone herramientas avanzadas;
- copia compartida conserva la acción de propuesta.

### Navegador

- Android equivalente en vertical y landscape;
- iPhone equivalente con fallback sin orientation lock;
- entrada y salida de fullscreen;
- cambio de orientación durante playback;
- jugada local, link `#play=` y link `#list=`;
- restauración de biblioteca al cerrar una lista;
- modo desktop sin regresiones.

## Criterios de aceptación

1. Un usuario mobile abre la app y ve una biblioteca legible sin el editor
   desktop.
2. Tocar `Ver` reproduce en un visor horizontal que usa toda la pantalla
   disponible.
3. La ausencia de fullscreen u orientation lock nunca impide reproducir.
4. Los controles se ocultan a los tres segundos y reaparecen al tocar.
5. Una lista autoavanza y permite navegación manual.
6. La edición rápida sólo permite posiciones y metadatos.
7. El editor desktop y los links compartidos existentes siguen funcionando.
8. Cerrar un visor compartido restaura la biblioteca local intacta.
