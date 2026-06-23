import { Play } from '../types'

export function downloadJson(play: Play): void {
  const json = JSON.stringify(play, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${play.name.replace(/[^a-z0-9]/gi, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(plays: Play[]): void {
  const header = 'id,name,description,category,createdAt,duration,playerCount'
  const rows = plays.map(p => {
    const escapedName = `"${p.name.replace(/"/g, '""')}"`
    const escapedDesc = `"${p.description.replace(/"/g, '""')}"`
    return `${p.id},${escapedName},${escapedDesc},"${p.category}","${p.createdAt}",${p.duration},${p.players.length}`
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tactics-rugby-plays.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Formatos de video por orden de preferencia. MP4 primero (más compatible para
// compartir y reproducir); WebM como respaldo si el navegador no soporta MP4.
const VIDEO_MIMES: { mime: string; ext: string }[] = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
]

export function pickVideoMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const c of VIDEO_MIMES) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c
  }
  return null
}

/**
 * Graba un video de la animación. Copia el frame actual del stage (vía
 * `getFrame`) a un canvas propio cada cuadro y captura ese canvas con
 * MediaRecorder. Requiere que la animación esté reproduciéndose mientras corre.
 * Devuelve el blob y la extensión real elegida (mp4 o webm).
 */
export async function recordStageVideo(
  getFrame: () => HTMLCanvasElement,
  width: number,
  height: number,
  durationMs: number,
): Promise<{ blob: Blob; ext: string } | null> {
  const picked = pickVideoMime()
  if (!picked) return null

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) return null

  const stream = out.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: picked.mime, videoBitsPerSecond: 12_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve() })

  rec.start(100) // timeslice: emite datos periódicamente → evita archivos sin índice
  const t0 = performance.now()
  let raf = 0
  await new Promise<void>((resolve) => {
    const loop = () => {
      ctx.fillStyle = '#0d1117'
      ctx.fillRect(0, 0, width, height)
      try { ctx.drawImage(getFrame(), 0, 0, width, height) } catch { /* frame no listo */ }
      if (performance.now() - t0 >= durationMs) { resolve(); return }
      raf = requestAnimationFrame(loop)
    }
    loop()
  })
  cancelAnimationFrame(raf)
  await new Promise((r) => setTimeout(r, 150)) // último frame
  rec.stop()
  await stopped

  if (chunks.length === 0) return null
  return { blob: new Blob(chunks, { type: picked.mime }), ext: picked.ext }
}

export function downloadVideo(blob: Blob, name: string, ext: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.${ext}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Intenta compartir el video con el Web Share API (nativo en móvil → WhatsApp, etc.).
 * Si el navegador no soporta file sharing, descarga el archivo normalmente.
 */
export async function shareOrDownloadVideo(blob: Blob, name: string, ext: string): Promise<void> {
  const safeName = name.replace(/[^a-z0-9]/gi, '_')
  const file = new File([blob], `${safeName}.${ext}`, { type: blob.type })

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // usuario canceló
      // Otro error → fallback a descarga
    }
  }
  downloadVideo(blob, name, ext)
}
