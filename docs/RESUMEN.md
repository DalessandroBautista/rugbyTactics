# TacticsRugby — Resumen del proyecto

## ¿Qué es?
Aplicación web para diseñar y animar jugadas de rugby. Permite posicionar jugadores en un campo reglamentario, grabar trayectorias de movimiento, reproducir animaciones y organizar jugadas en una biblioteca.

## Stack técnico
- **React 18** + **TypeScript**
- **React-Konva** (Konva.js) para el canvas 2D interactivo
- **Zustand** para estado global
- **Vite** como bundler
- Sin backend — todo se persiste en `localStorage`

## Versión actual: 1.0.9

---

## Arquitectura

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/store/useStore.ts` | Store central (Zustand). Toda la lógica de negocio. |
| `src/types/index.ts` | Tipos e interfaces + constantes del campo (FIELD_PX, SCALE, etc.) |
| `src/components/FieldCanvas.tsx` | Canvas principal (React-Konva). Drag, zoom, pan, rubber-band, grabación. |
| `src/components/Sidebar.tsx` | Panel lateral: lista de jugadores, selección, acciones. |
| `src/components/TopBar.tsx` | Barra superior: modos, controles, shortcuts. |
| `src/components/Timeline.tsx` | Línea de tiempo para reproducción animada. |
| `src/components/TrajectoryPath.tsx` | Renderiza trayectorias (flechas + nodos editables). |
| `src/components/FormationDialog.tsx` | Diálogo para formaciones de lineout y scrum. |
| `src/hooks/useAnimation.ts` | Interpolación y loop de animación (requestAnimationFrame). |
| `src/hooks/useRecording.ts` | Grabación de movimientos del jugador/pelota. |
| `src/utils/persistence.ts` | Load/save en localStorage. |

### Modelos de datos

```
Play
  ├── id, name, description, category, createdAt, duration
  ├── players: Player[]
  │     ├── id, number, team ('home'|'away'), color
  │     ├── x, y  (posición actual)
  │     └── trajectory: TrajectoryPoint[]  [{x, y, time}]
  └── ball: Ball
        ├── x, y, carriedBy (playerId | null), size
        └── trajectory: TrajectoryPoint[]
```

### Modos de edición
- **select**: selección de jugadores con clic o rubber-band drag
- **move**: arrastra jugadores/pelota para reposicionarlos
- **record**: arrastra para grabar trayectoria en tiempo real

---

## Funcionalidades implementadas

- [x] Campo de rugby reglamentario (70×100m + in-goal de 22m)
- [x] 15 jugadores locales + hasta 15 rivales
- [x] Zoom (rueda del mouse), pan (drag en modo no-select)
- [x] Fit-to-screen automático y botón "Centrar"
- [x] Selección simple y multiselección (rubber-band + modo Multi)
- [x] Movimiento grupal de jugadores seleccionados
- [x] Grabación de trayectorias en tiempo real
- [x] Edición de nodos de trayectoria (drag y clic para borrar)
- [x] Pelota con portador y trayectoria independiente
- [x] Animación con interpolación y control de velocidad (0.5x, 1x, 2x, 4x)
- [x] Biblioteca de jugadas
- [x] Exportar/importar jugadas en JSON
- [x] Formaciones prearmadas (lineout, scrum)
- [x] Persistencia automática en localStorage

---

## Bugs conocidos / arreglados

### Multi-selector drag (arreglado en sesión jun-2026)
**Problema:** Al arrastrar varios jugadores seleccionados, el jugador arrastrado "saltaba" de vuelta a su posición original en cada frame.  
**Causa:** Durante `onDragMove`, el store se actualizaba solo para los OTROS jugadores seleccionados (no el arrastrado). Cada re-render de React-Konva reseteaba el Group arrastrado a la posición original del store.  
**Fix:** Incluir al jugador arrastrado en la actualización del store durante DragMove (`x, y` exactos del evento), y en DragEnd finalizar todas las posiciones seleccionadas y llamar `savePlays`.

---

## Ideas de mejora y extensiones posibles

### UX / Interacción
- [ ] **Deshacer/Rehacer (Ctrl+Z/Y)** — la operación más pedida en apps de este tipo. Implementable con un stack de snapshots del estado.
- [ ] **Atajos de teclado** — Delete para borrar selección, Ctrl+D para duplicar jugador, flechas para mover con precisión.
- [ ] **Nombres personalizados** en los jugadores (no solo números).
- [ ] **Colores editables por jugador** — color picker al hacer clic derecho.
- [ ] **Snap a grilla** — opción para mover en incrementos de 1m o 5m.
- [ ] **Multi-drag con pelota** — si se arrastra el portador en modo multi-select, la pelota debería seguirlo.

### Trayectorias y animación
- [ ] **Trayectorias simultáneas** — actualmente se graba de a un jugador a la vez. Sería ideal grabar todos a la vez (como en video).
- [ ] **Tipos de movimiento** — lineal, curvo (Bezier), sprint, caminando. Visual feedback diferente por tipo.
- [ ] **Reproducción en loop**
- [ ] **Exportar como GIF o video** — con `html2canvas` + `gif.js` o `ffmpeg.wasm`.
- [ ] **Exportar como imagen PNG** — snapshot del campo en el instante actual.
- [ ] **Editor de trayectoria curva** — handles Bezier para trayectorias más naturales.

### Organización de jugadas
- [ ] **Carpetas / categorías** en la biblioteca con filtros.
- [ ] **Orden drag-and-drop** en la lista de jugadas.
- [ ] **Búsqueda** en la biblioteca.
- [ ] **Tags/etiquetas** además de categorías.
- [ ] **Vista previa** en miniatura de cada jugada en la biblioteca.
- [ ] **Notas/comentarios** por jugada o por jugador.

### Campo y contexto
- [ ] **Modo espejo** — reflejar horizontalmente la jugada (útil para cambiar de mitad).
- [ ] **Posiciones de referencia** (posts, corner flags marcados visualmente).
- [ ] **Múltiples zonas** — poder marcar "zona de ruck" u otros elementos tácticos.
- [ ] **Overlay de imagen** — importar foto de pizarrón o imagen de referencia.

### Colaboración / cloud
- [ ] **Backend con autenticación** — guardar jugadas en la nube (Supabase o similar).
- [ ] **Compartir por link** — URL única para ver/editar una jugada.
- [ ] **Modo solo lectura** — link para presentar a jugadores sin acceso a edición.
- [ ] **Multi-usuario en tiempo real** (WebSockets / CRDTs).

### Rediseño visual
- [ ] **Campo más realista** — textura de césped, gradientes, líneas más nítidas.
- [ ] **Modo oscuro / claro** toggle.
- [ ] **Avatares de posición** — íconos específicos por posición (1-pilier, 2-hooker, etc.).
- [ ] **Panel lateral colapsable** — más espacio para el campo en pantallas pequeñas.
- [ ] **Mobile/tablet** — gestos táctiles (pinch-zoom, tap selección).

### Técnico / calidad
- [ ] **Guardar posiciones en DragEnd** — actualmente `movePlayer` no llama `savePlays`, las posiciones después de drag no se persisten hasta la próxima acción que sí guarda.
- [ ] **Tests unitarios** del store y lógica de interpolación.
- [ ] **PWA** — funcionar offline instalado en dispositivo.
- [ ] **Undo stack** como middleware de Zustand (`zustand/middleware` immer + history).
