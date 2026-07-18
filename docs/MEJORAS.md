# Mejoras propuestas — RugbyTactics

Análisis posterior al rediseño del campo, modo presentación y onboarding.
Ordenado por relación impacto / esfuerzo. Marcado: ✅ hecho · 🔜 propuesto.

> Estado: en la segunda iteración se completaron A1, A4, B1, B2, B3, B4, B6.
> Todo verificado en navegador (animación, presentación, onboarding) + lint +
> typecheck + 18 tests + build.

---

## A. Estructura y modularización

### A1. Dividir `FieldCanvas.tsx` ✅ (parcial)
Concentraba demasiadas responsabilidades. Extraído (807 → 593 líneas):
- ✅ `FieldMarkings.tsx` — dibujo estático del campo.
- ✅ `PlayerToken.tsx` / `BallToken.tsx` — render de ficha y pelota.
- ✅ `MovementTrail.tsx` — la estela de reproducción.
- 🔜 hooks: `usePanZoom`, `useRubberBand`, `usePlayerDrag`. Dejarían el
  componente como puro orquestador (~150 líneas). Pendiente.

### A2. Partir `useStore.ts` (~780 líneas) en slices 🔜
Hoy es un único `create()` monolítico. Migrar al patrón de slices de Zustand:
`playsSlice`, `selectionSlice`, `playbackSlice`, `viewSlice`, `historySlice`,
`uiSlice`. Cada uno testeable por separado.

### A3. Helper `updateCurrentPlay(updater)` 🔜
El patrón `plays.map(p => p.id === currentPlayId ? {...} : p)` se repite en ~20
acciones. Un helper único reduce ruido y el riesgo de olvidar `savePlays`.

### A4. Tipado de `zones` ✅
Eliminados todos los `(play as any).zones` de FieldCanvas, Sidebar y store; ahora
usan `play.zones` tipado.

---

## B. Código y rendimiento

### B1. `setAnimatingPositions` recrea `plays` a 60 fps ✅
Movido a estado efímero (`animatedPositions` / `animatedBall`) que el canvas
combina al renderizar, sin tocar `plays`. Reproducir ya no muta ni re-renderiza
todo el árbol; además se conservan las posiciones base (corrige el bug por el
que reproducir "movía" a los jugadores de forma permanente). Cubierto por tests.

### B2. Persistencia con debounce ✅
`savePlays` agrupa ráfagas en una escritura cada 300 ms, con `flushPlays()` en
`beforeunload` para no perder el último estado.

### B3. `pushHistory` clona con `JSON.parse(JSON.stringify())` ✅
Reemplazado por `structuredClone` (con fallback). También en undo/redo y duplicar.

### B4. ESLint roto + sin Prettier/CI ✅
Agregados `eslint.config.js` (flat config con typescript-eslint + react-hooks),
`.prettierrc.json`, scripts `lint`/`format`/`typecheck`/`test`, y workflow de
GitHub Actions (`.github/workflows/ci.yml`). Lint pasa con 0 errores (quedan
avisos intencionales en deps de hooks y `any` de eventos Konva). Se corrigió de
paso un bug real: hooks llamados condicionalmente en `Sidebar`.

### B5. Documentar el sistema de coordenadas 🔜
La transformación campo→pantalla (grupo rotado -90, `fieldToScreen` /
`screenToField`) es lo más confuso del proyecto. Merece un comentario de bloque o
un `docs/COORDENADAS.md` con un diagrama. Bloquea features como formaciones reales.

### B6. Limpieza de código muerto ✅
Eliminados `BallEntity.tsx`, `FieldLines.tsx`, `PlayerCircle.tsx` (0 referencias,
colores de una versión anterior).

---

## C. UX y uso

### C1. Editar duración de la jugada 🔜
Hoy fija en 40 s. Permitir ajustarla (afecta el ritmo de la animación).
### C2. Exportar a GIF/video 🔜
Ya se exporta PNG; un GIF de la jugada animada es lo que un coach comparte por
WhatsApp.
### C3. Compartir por URL 🔜
Serializar la jugada en el hash (`#play=...`) para compartir sin backend.
### C4. Shift-click acumulativo 🔜
Sumar a la selección con Shift sin tener que activar el toggle "Multi".
### C5. Deshacer borrado de jugada 🔜
`deletePlay` no pasa por el historial; un borrado accidental es irreversible.
### C6. Formaciones iniciales reales 🔜
En lugar de 15 fichas apiladas en el centro, abrir con una disposición de rugby
reconocible. Depende de B5 (coordenadas).
### C7. Leyenda de posiciones 🔜
Tooltip con el nombre de la posición por número (1 pilar, 9 medio-scrum, etc.).

---

## D. Hecho en esta iteración ✅

- Campo reglamentario: try lines, 22 m, mediocampo, 5/10 m punteadas,
  longitudinales 5/15 m, postes en H, césped con profundidad e in-goals teñidos.
- Fichas con sombra de contacto, volumen y halo del portador; pelota ovalada.
- Estela de movimiento durante la reproducción.
- Modo presentación (tecla P) con barra de controles e navegación entre jugadas.
- Onboarding de primer uso (`WelcomeOverlay`).
- `FieldMarkings` extraído; huérfanos eliminados.

---

### B7. Vulnerabilidad de Vite (dev-server) 🔜
`npm audit` reporta 1 high en `vite <=6.4.2` (bypass de `server.fs.deny` y
disclosure vía UNC, solo Windows y solo dev-server). Preexistente. Resolver con
`npm audit fix` o subiendo Vite, verificando que el build siga OK.

## Pendiente (orden sugerido)

1. A2 (slices del store) — refactor invasivo; mejor con verificación visual.
2. A3 (helper `updateCurrentPlay`) — reduce repetición en ~20 acciones.
3. A1 hooks (`usePanZoom` / `useRubberBand` / `usePlayerDrag`).
4. B5 (documentar coordenadas) + B7 (vuln Vite).
5. C1–C7 según prioridad de producto.
