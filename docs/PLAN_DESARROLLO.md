# Plan de desarrollo — TacticsRugby

> Documento para implementación asistida por IA.  
> Cada fase es independiente y entregable. Implementar en orden: las fases anteriores son prerequisito de las siguientes.  
> Stack: React 18, TypeScript, React-Konva (Konva.js), Zustand, Vite. Sin backend.

---

## FASE 1 — Fundación técnica

**Objetivo:** Corregir bugs silenciosos y sentar la base para todo lo demás.

---

### 1.1 — Undo / Redo (Ctrl+Z / Ctrl+Y)

**Archivos a modificar:** `src/store/useStore.ts`, `src/components/TopBar.tsx`, `src/index.css`

**Implementación:**

Agregar al store Zustand un stack de historial. Usar el patrón de snapshots (no middleware externo).

En `useStore.ts`, agregar al estado:
```ts
history: Play[][]       // stack de snapshots anteriores (máx 50)
future: Play[][]        // stack para redo
```

Agregar acciones al store:
```ts
pushHistory: () => void   // llamar antes de cada mutación que modifica plays
undo: () => void
redo: () => void
```

Implementación de `pushHistory`:
```ts
pushHistory: () => {
  const state = get()
  const snapshot = JSON.parse(JSON.stringify(state.plays)) as Play[]
  set({
    history: [...state.history.slice(-49), snapshot],
    future: [],
  })
},
```

Implementación de `undo`:
```ts
undo: () => {
  const state = get()
  if (state.history.length === 0) return
  const prev = state.history[state.history.length - 1]
  const currentSnapshot = JSON.parse(JSON.stringify(state.plays)) as Play[]
  set({
    plays: prev,
    history: state.history.slice(0, -1),
    future: [currentSnapshot, ...state.future.slice(0, 49)],
    isDirty: true,
  })
  savePlays(prev)
},
```

Implementación de `redo` (inverso de undo).

**Regla:** Llamar `pushHistory()` al inicio de: `movePlayer`, `moveBall`, `finishRecording`, `updateTrajectoryPoint`, `deleteTrajectoryPoint`, `addTrajectoryPoint`, `clearPlayerTrajectory`, `clearBallTrajectory`, `resetPlay`, `resetMovements`, `removePlayer`, `addOpponentPlayer`.  
NO llamar en `setAnimatingPositions` (se usa durante reproducción, no es edición).

**En `TopBar.tsx`:** Agregar botones "↩ Deshacer" y "↪ Rehacer" con estado disabled cuando los stacks están vacíos.

**En `src/main.tsx` o un `useEffect` global:** Registrar listener de teclado:
```ts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    useStore.getState().undo()
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    useStore.getState().redo()
  }
})
```

Registrar el listener en `App.tsx` con `useEffect` + cleanup.

---

### 1.2 — Persistencia correcta de posiciones después de drag

**Archivo a modificar:** `src/store/useStore.ts`

**Problema:** `movePlayer` y `moveBall` no llaman `savePlays`, por lo que posiciones movidas manualmente no se persisten hasta la próxima acción que sí guarda. Si el usuario cierra la pestaña después de solo mover jugadores, pierde los cambios.

**Fix:** Agregar `savePlays(newPlays)` al final de `movePlayer` y `savePlays(...)` al final de `moveBall`.

---

### 1.3 — Atajos de teclado globales

**Archivo nuevo:** `src/hooks/useKeyboard.ts`  
**Archivo a modificar:** `src/App.tsx`

Crear hook `useKeyboard()` y llamarlo en `App.tsx`.

Atajos a implementar:

| Tecla | Acción |
|-------|--------|
| `S` | Cambiar a modo Select |
| `M` | Cambiar a modo Move |
| `R` | Cambiar a modo Record |
| `G` | Iniciar/detener grabación (en modo Record) |
| `Delete` / `Backspace` | Borrar trayectoria del jugador/pelota seleccionado |
| `Escape` | Deseleccionar todo |
| `F` | Fit to screen (centrar) |

Importante: no activar atajos cuando el foco está en un `<input>` o `<textarea>`.
```ts
const tag = (document.activeElement as HTMLElement)?.tagName
if (tag === 'INPUT' || tag === 'TEXTAREA') return
```

---

### 1.4 — PWA (Progressive Web App)

**Archivos a crear:** `public/manifest.json`, `public/sw.js`  
**Archivo a modificar:** `index.html`, `vite.config.ts`

Instalar plugin: `npm install -D vite-plugin-pwa`

En `vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TacticsRugby',
        short_name: 'TacticsRugby',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
```

Crear íconos simples 192×192 y 512×512 (fondo verde oscuro `#1e4025` con texto "TR" blanco).

---

### 1.5 — Tests unitarios

**Instalar:** `npm install -D vitest @testing-library/react @testing-library/user-event jsdom`

**Archivos nuevos:**
- `src/utils/interpolation.test.ts`
- `src/store/useStore.test.ts`

**En `vite.config.ts`** agregar:
```ts
test: {
  environment: 'jsdom',
  globals: true,
}
```

**Tests a escribir:**

`interpolation.test.ts` — verificar que la función de interpolación devuelve posición correcta en `time=0`, `time=maxTime`, y `time=mitad`.

`useStore.test.ts` — verificar:
- Crear jugada → tiene 15 jugadores
- `movePlayer(1, 100, 200)` → jugador 1 queda en `{x:100, y:200}`
- `undo()` después de `movePlayer` → posición vuelve al valor anterior
- `toggleSelectedPlayer` agrega y quita correctamente

---

## FASE 2 — UX y control

**Prerequisito:** Fase 1 completa.

---

### 2.1 — Nombres y colores editables por jugador

**Archivos a modificar:** `src/types/index.ts`, `src/store/useStore.ts`, `src/components/Sidebar.tsx`

**En `types/index.ts`**, agregar campo a `Player`:
```ts
name?: string   // nombre libre, ej: "Juan" o "Openside"
```

**En el store**, agregar acción:
```ts
updatePlayer: (id: number, updates: Partial<Pick<Player, 'name' | 'color' | 'number'>>) => void
```

**En `Sidebar.tsx`**, en la fila de cada jugador:
- Click en el círculo de color → abrir `<input type="color">` en línea (usar `useRef` en el input, llamar `.click()` desde el handler).
- Doble clic en el nombre → cambiar a `<input type="text">` en línea. Al perder foco o presionar Enter → `updatePlayer(id, { name: value })`.

**Mostrar en el canvas:** En `FieldCanvas.tsx`, si `player.name` existe, renderizarlo encima del círculo con un `<Text>` de Konva (fuente 6px, color blanco, posición `y = -PLAYER_RADIUS - 8`).

---

### 2.2 — Snap a grilla

**Archivos a modificar:** `src/store/useStore.ts`, `src/components/TopBar.tsx`, `src/components/FieldCanvas.tsx`

**En el store**, agregar estado:
```ts
snapToGrid: boolean
snapSize: number   // en píxeles de campo, default: SCALE (= 1 metro)
```

Acción: `toggleSnapToGrid: () => void`

**En `FieldCanvas.tsx`**, crear helper:
```ts
function snapPos(x: number, y: number, snap: boolean, size: number) {
  if (!snap) return { x, y }
  return {
    x: Math.round(x / size) * size,
    y: Math.round(y / size) * size,
  }
}
```

Llamar `snapPos` en `handlePlayerDragMove` y `handlePlayerDragEnd` antes de actualizar el store.

**En `TopBar.tsx`**, agregar toggle "Snap" junto a "Multi".

---

### 2.3 — Multi-drag con pelota

**Archivo a modificar:** `src/components/FieldCanvas.tsx`, `src/store/useStore.ts`

**Comportamiento deseado:** Si la pelota tiene portador (`ball.carriedBy`) y ese portador es uno de los jugadores seleccionados que se están moviendo en multi-drag, la pelota debe seguir al portador.

**Fix en `handlePlayerDragMove`:** Después de calcular `newPlayers`, verificar si `play.ball.carriedBy` está en `selectedSet`. Si está, calcular su nueva posición y actualizar `ball` también:

```ts
let newBall = currentPlay.ball
const carrierId = currentPlay.ball.carriedBy
if (carrierId !== null && selectedSet.has(carrierId)) {
  const carrierNew = newPlayers.find(p => p.id === carrierId)
  if (carrierNew) newBall = { ...newBall, x: carrierNew.x, y: carrierNew.y }
}
const newPlays = state.plays.map(p =>
  p.id === state.currentPlayId ? { ...p, players: newPlayers, ball: newBall } : p
)
```

Aplicar la misma lógica en `handlePlayerDragEnd`.

---

### 2.4 — Panel de jugador mejorado (sidebar)

**Archivo a modificar:** `src/components/Sidebar.tsx`

Cuando hay **múltiples jugadores seleccionados** (multiSelected), mostrar:
- Conteo: "N jugadores seleccionados"
- Botón "Pos. inicial grupal" → llama `movePlayer` para cada uno a posición inicial
- Botón "Borrar rutas grupales" → llama `clearPlayerTrajectory` para cada uno

Cuando hay **un jugador seleccionado**, agregar:
- Campo de nombre editable (ver 2.1)
- Coordenadas actuales en metros (convertir de px dividiendo por `SCALE`), solo lectura.
- Color editable (ver 2.1)

---

## FASE 3 — Animación avanzada

**Prerequisito:** Fase 1 completa.

---

### 3.1 — Exportar como imagen PNG

**Instalación:** No requiere dependencias nuevas. Konva tiene `stage.toDataURL()` nativo.

**Archivos a modificar:** `src/components/TopBar.tsx`, `src/components/FieldCanvas.tsx`

**Implementación:**
- Exponer el `Stage` ref desde `FieldCanvas` al store (o usar un ref compartido via Context/store).
- Mejor opción: agregar al store un campo `stageRef: React.RefObject<Konva.Stage> | null` y setearlo desde `FieldCanvas` en el `useEffect` de montaje.
- En `TopBar.tsx`, botón "Exportar PNG" → llama `useStore.getState().stageRef?.current?.toDataURL({ pixelRatio: 2 })` y descarga el resultado.

```ts
function downloadPNG(dataURL: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  a.click()
}
```

**Alternativa más simple:** Pasar un callback `onExportPNG` desde `FieldCanvas` al store usando `useEffect`:
```ts
// en FieldCanvas.tsx
const stageRef = useRef<Konva.Stage>(null)
useEffect(() => {
  useStore.setState({ exportPNG: () => {
    const url = stageRef.current?.toDataURL({ pixelRatio: 2 })
    if (url) downloadPNG(url, `${play?.name || 'jugada'}.png`)
  }})
}, [play?.name])
```

Agregar `exportPNG: (() => void) | null` al store.

---

### 3.2 — Grabación simultánea de múltiples jugadores

**Contexto actual:** Solo se puede grabar un jugador o la pelota a la vez. Hay que mover, grabar, mover, grabar para cada jugador.

**Objetivo:** Activar grabación para TODOS los jugadores seleccionados a la vez.

**Archivos a modificar:** `src/store/useStore.ts`, `src/components/FieldCanvas.tsx`, `src/hooks/useRecording.ts`

**Cambios en el store:**

La acción `startRecording` actualmente solo soporta un jugador. Modificarla para aceptar múltiples:

```ts
startRecording: () => {
  const state = get()
  const play = state.plays.find(p => p.id === state.currentPlayId)
  if (!play) return

  const movements: RecordedMovement[] = []

  // Todos los jugadores seleccionados
  for (const playerId of state.selectedPlayerIds) {
    const player = play.players.find(p => p.id === playerId)
    if (player) movements.push({ playerId, points: [{ x: player.x, y: player.y, time: 0 }] })
  }

  // Pelota si está seleccionada
  if (state.selectedBall) {
    movements.push({ playerId: -1, points: [{ x: play.ball.x, y: play.ball.y, time: 0 }] })
  }

  if (movements.length === 0) return

  set({
    isRecording: true,
    recordingStartTime: performance.now(),
    recordedMovements: movements,
  })
},
```

**Cambios en `FieldCanvas.tsx`:**

En modo `record` con múltiples jugadores, cada jugador debe ser draggable independientemente. Actualmente `handlePlayerDragMove` en modo record llama `handleDrag(id, x, y)` que agrega un punto al movimiento de ese jugador.

Esto ya debería funcionar si `startRecording` inicia correctamente para todos los jugadores seleccionados. Verificar que `addRecordingPoint` use el `playerId` correcto.

**En `TopBar.tsx`**, el botón Grabar muestra estado disabled si `selectedPlayerIds.length === 0 && !selectedBall`. Con múltiple selección, habilitarlo.

---

### 3.3 — Reproducción en loop

**Archivo a modificar:** `src/hooks/useAnimation.ts`, `src/components/Timeline.tsx`

En el store, agregar:
```ts
loopPlayback: boolean
toggleLoopPlayback: () => void
```

En `useAnimation.ts`, cuando el tiempo llega al final de la jugada y `loopPlayback` es true, resetear `currentTime` a 0 en lugar de pausar.

En `Timeline.tsx`, agregar botón de loop (ícono ↺) que toglea `loopPlayback`.

---

### 3.4 — Trayectorias curvas (Bezier)

**Contexto:** Actualmente las trayectorias son líneas rectas entre puntos. Las curvas serían más naturales para representar movimientos de jugadores.

**Alcance:** Renderizado curvo automático (Catmull-Rom spline → convertir a Bezier). El usuario NO necesita manejar puntos de control manualmente.

**Archivo a modificar:** `src/components/TrajectoryPath.tsx`

Agregar función que convierte puntos de trayectoria a una curva suave usando Catmull-Rom:

```ts
function catmullRomToBezier(points: {x:number, y:number}[]): number[] {
  if (points.length < 2) return []
  const tension = 0.5
  const result: number[] = [points[0].x, points[0].y]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3
    result.push(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
  return result
}
```

En `TrajectoryPath.tsx`, reemplazar el `<Line>` actual por un `<Shape>` de Konva que use `bezierCurveTo` con esos puntos. O alternativamente, usar `tension` prop que Konva ya soporta en `<Line>`:

```tsx
<Line
  points={flatPoints}
  tension={0.4}   // ← Konva soporta esto nativamente!
  ...
/>
```

**Nota:** Konva's `Line` ya tiene `tension` prop que hace exactamente esto. Solo agregar `tension={0.4}` al `<Line>` de trayectoria. Verificar que no rompa la interpolación en `useAnimation.ts` (la interpolación trabaja sobre los puntos originales, no sobre la curva visual, así que no afecta).

---

## FASE 4 — Biblioteca

**Prerequisito:** Fase 1 completa.

---

### 4.1 — Búsqueda en la biblioteca

**Archivo a modificar:** `src/components/PlayLibrary.tsx`

Agregar input de búsqueda al top del componente. Filtrar jugadas por `name.toLowerCase().includes(query)` o `description` o `category`. Usar estado local de React (`useState`).

---

### 4.2 — Tags y categorías mejoradas

**Archivos a modificar:** `src/types/index.ts`, `src/store/useStore.ts`, `src/components/PlayLibrary.tsx`, `src/components/FormationDialog.tsx`

En `types/index.ts`, agregar a `Play`:
```ts
tags?: string[]
```

En la biblioteca, mostrar chips de categorías como filtros. Click en un chip → filtra por esa categoría. Click de nuevo → quita el filtro.

En el store, agregar acción:
```ts
updatePlayTags: (id: string, tags: string[]) => void
```

---

### 4.3 — Vista previa en miniatura

**Contexto:** Cada jugada en la biblioteca muestra solo nombre y categoría. Sería útil ver una preview del campo con los jugadores.

**Implementación con Canvas 2D nativo** (no Konva, para evitar múltiples Stage):

Crear componente `PlayMiniature.tsx` que recibe una `Play` y renderiza en un `<canvas>` HTML mediante `useEffect`:

```tsx
const PlayMiniature: React.FC<{ play: Play; width: number; height: number }> = ({ play, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // Escala para que el campo quepa en width x height
    const scaleX = width / FIELD_PX.totalLength
    const scaleY = height / FIELD_PX.width
    // Dibujar fondo verde
    ctx.fillStyle = '#1e4025'
    ctx.fillRect(0, 0, width, height)
    // Dibujar línea de medio (simple)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
    // Dibujar jugadores
    for (const player of play.players) {
      const px = (player.y + FIELD_PX.width / 2) * scaleX
      const py = (-player.x + FIELD_PX.totalLength / 2) * scaleY
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = player.color
      ctx.fill()
    }
    // Dibujar pelota
    const bx = (play.ball.y + FIELD_PX.width / 2) * scaleX
    const by = (-play.ball.x + FIELD_PX.totalLength / 2) * scaleY
    ctx.beginPath()
    ctx.arc(bx, by, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#f1c40f'
    ctx.fill()
  }, [play, width, height])
  return <canvas ref={canvasRef} width={width} height={height} />
}
```

Usar este componente en `PlayLibrary.tsx` para cada jugada.

---

### 4.4 — Orden drag-and-drop en la biblioteca

**Instalación:** `npm install @dnd-kit/core @dnd-kit/sortable`

**Archivo a modificar:** `src/components/PlayLibrary.tsx`, `src/store/useStore.ts`

En el store, agregar:
```ts
reorderPlays: (fromIndex: number, toIndex: number) => void
```

```ts
reorderPlays: (from, to) => {
  const state = get()
  const newPlays = [...state.plays]
  const [moved] = newPlays.splice(from, 1)
  newPlays.splice(to, 0, moved)
  set({ plays: newPlays, isDirty: true })
  savePlays(newPlays)
},
```

En `PlayLibrary.tsx`, envolver la lista con `<DndContext>` y `<SortableContext>` de `@dnd-kit`. Cada jugada se convierte en un `useSortable` item. Al terminar el drag (`onDragEnd`), llamar `reorderPlays`.

---

## FASE 5 — Campo avanzado

**Prerequisito:** Fase 1 completa.

---

### 5.1 — Modo espejo (flip horizontal)

**Archivos a modificar:** `src/store/useStore.ts`, `src/components/TopBar.tsx`

Agregar acción al store:
```ts
mirrorPlay: (id: string) => void
```

```ts
mirrorPlay: (id) => {
  const state = get()
  const play = state.plays.find(p => p.id === id)
  if (!play) return
  // "Espejar" significa invertir la coordenada x (largo del campo)
  // player.x es la coordenada en el eje largo → invertir respecto al centro
  const center = 0  // x=0 es el centro del campo en coordenadas de store
  const newPlayers = play.players.map(p => ({
    ...p,
    x: -p.x,
    trajectory: p.trajectory.map(pt => ({ ...pt, x: -pt.x })),
  }))
  const newBall = {
    ...play.ball,
    x: -play.ball.x,
    trajectory: play.ball.trajectory.map(pt => ({ ...pt, x: -pt.x })),
  }
  state.pushHistory()
  const newPlay = { ...play, players: newPlayers, ball: newBall }
  const newPlays = state.plays.map(p => p.id === id ? newPlay : p)
  set({ plays: newPlays, isDirty: true })
  savePlays(newPlays)
},
```

**Nota importante:** Verificar las coordenadas. En el sistema actual, `player.x` es la coordenada a lo largo del campo (eje largo = 144m). El centro es `FIELD_PX.totalLength / 2` en píxeles. En la función `fieldToScreen`, `layerY = -px + FIELD_PX.totalLength / 2`, así que espejar en x implica negar `px` respecto al centro → `newX = -oldX`. Verificar con un caso concreto antes de implementar.

En `TopBar.tsx`, botón "Espejo" que llama `mirrorPlay(currentPlayId)`.

---

### 5.2 — Zonas tácticas (elementos del campo)

**Objetivo:** Agregar marcadores visuales opcionales: zona de ruck, zona de kick, área de ataque, etc.

**Archivos a modificar:** `src/types/index.ts`, `src/store/useStore.ts`, `src/components/FieldCanvas.tsx`, `src/components/Sidebar.tsx`

**En `types/index.ts`**, nuevo tipo:
```ts
export type ZoneShape = 'rect' | 'circle' | 'arrow'
export interface TacticalZone {
  id: string
  shape: ZoneShape
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  color: string
  label?: string
}
```

Agregar a `Play`:
```ts
zones?: TacticalZone[]
```

**En el store**, acciones:
```ts
addZone: (zone: Omit<TacticalZone, 'id'>) => void
removeZone: (id: string) => void
updateZone: (id: string, updates: Partial<TacticalZone>) => void
```

**En `FieldCanvas.tsx`**, renderizar las zonas con `<Rect>`, `<Circle>`, o `<Arrow>` de Konva según el tipo. Las zonas son draggables en modo `move`. Rendear antes de los jugadores (bajo en el z-order).

**En `Sidebar.tsx`**, agregar sección "Zonas" con lista de zonas activas y botones para agregar cada tipo.

---

### 5.3 — Overlay de imagen de referencia

**Objetivo:** Importar una imagen (foto de pizarrón, captura de video) y mostrarla semi-transparente encima del campo.

**Archivos a modificar:** `src/types/index.ts`, `src/store/useStore.ts`, `src/components/FieldCanvas.tsx`, `src/components/Sidebar.tsx`

**En `types/index.ts`**, agregar a `Play`:
```ts
overlayImage?: {
  dataURL: string    // base64
  x: number
  y: number
  width: number
  height: number
  opacity: number
}
```

**En el store**, acciones:
```ts
setOverlayImage: (dataURL: string) => void
updateOverlayImage: (updates: Partial<Play['overlayImage']>) => void
clearOverlayImage: () => void
```

**En `Sidebar.tsx`**, botón "Cargar imagen" → `<input type="file" accept="image/*">` → leer con `FileReader.readAsDataURL()` → llamar `setOverlayImage`.

**En `FieldCanvas.tsx`**, renderizar con el componente `<Image>` de React-Konva. Usar `useEffect` + `new window.Image()` para cargar el dataURL y pasarlo al estado local:
```tsx
const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
useEffect(() => {
  if (!play?.overlayImage?.dataURL) { setImgEl(null); return }
  const img = new window.Image()
  img.src = play.overlayImage.dataURL
  img.onload = () => setImgEl(img)
}, [play?.overlayImage?.dataURL])
```

Renderizar entre el fondo del campo y los jugadores:
```tsx
{imgEl && play?.overlayImage && (
  <Image
    image={imgEl}
    x={play.overlayImage.x}
    y={play.overlayImage.y}
    width={play.overlayImage.width}
    height={play.overlayImage.height}
    opacity={play.overlayImage.opacity}
    draggable={editMode === 'move'}
    onDragEnd={(e) => store.updateOverlayImage({ x: e.target.x(), y: e.target.y() })}
  />
)}
```

Control de opacidad en Sidebar (slider 0–100%).

---

## Orden de implementación sugerido

```
FASE 1.2 (persistencia drag)       ← 15 min
FASE 1.1 (undo/redo)               ← 2 hs
FASE 1.3 (atajos teclado)          ← 1 h
FASE 2.3 (multi-drag con pelota)   ← 30 min
FASE 3.4 (curvas Bezier)           ← 30 min (es una línea de código con tension prop)
FASE 3.3 (loop reproducción)       ← 30 min
FASE 3.1 (exportar PNG)            ← 1 h
FASE 2.1 (nombres y colores)       ← 2 hs
FASE 2.2 (snap a grilla)           ← 1 h
FASE 2.4 (sidebar mejorado)        ← 1 h
FASE 4.1 (búsqueda biblioteca)     ← 30 min
FASE 4.2 (tags)                    ← 1 h
FASE 4.3 (miniaturas)              ← 2 hs
FASE 4.4 (drag-and-drop orden)     ← 2 hs
FASE 5.1 (modo espejo)             ← 1 h
FASE 5.2 (zonas tácticas)          ← 4 hs
FASE 5.3 (overlay imagen)          ← 3 hs
FASE 1.4 (PWA)                     ← 1 h
FASE 1.5 (tests)                   ← 3 hs
```

---

## Notas generales para la IA implementadora

1. **No romper la animación.** `setAnimatingPositions` modifica `plays` en el store sin `isDirty`, sin `savePlays`, y sin `pushHistory`. Mantener esa restricción.
2. **Coordenadas:** El campo usa un sistema rotado. `player.x` es el eje largo del campo (largo = totalLength), `player.y` es el eje ancho. La función `fieldToScreen` en `FieldCanvas.tsx` es la fuente de verdad para conversiones.
3. **IDs de jugadores locales:** siempre 1–15. IDs de rivales: empiezan en >100. No asumir que `id === index`.
4. **El store no sabe del DOM.** Toda interacción con el Stage de Konva vive en `FieldCanvas.tsx`. El store solo guarda datos.
5. **Usar `useStore.getState()` en handlers de eventos** (no hooks de React), porque los closures de `useCallback` pueden quedar desactualizados.
6. **Siempre llamar `savePlays()` al final de cualquier mutación persistente.** Importar desde `src/utils/persistence.ts`.
