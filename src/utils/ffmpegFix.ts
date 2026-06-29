import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let loading: Promise<boolean> | null = null

/**
 * Inicializa FFmpeg.wasm si aún no está cargado.
 * Descarga el core (wasm + js) desde node_modules copiado a public/ o desde CDN.
 * Se puede llamar varias veces; solo carga una vez.
 */
export async function ensureFFmpegLoaded(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg

  if (!loading) {
    ffmpeg = new FFmpeg()

    // Intentar cargar desde el CDN de unpkg (donde está publicado @ffmpeg/core)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

    loading = ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
  }

  await loading
  return ffmpeg!
}

/**
 * Toma un blob de video (MP4) y lo re-procesa con FFmpeg.wasm para:
 *   - Regenerar timestamps (DTS/PTS) con `-fflags +genpts`
 *   - Optimizar para streaming/web con `-movflags +faststart`
 *
 * Esto corrige el error "non monotonically increasing dts" que hace que WhatsApp
 * rechace el archivo mostrando "El archivo que intentaste añadir no es compatible".
 */
export async function fixVideoForWhatsApp(
  inputBlob: Blob,
  inputExt: string,
): Promise<Blob> {
  const ff = await ensureFFmpegLoaded()

  const inputName = `input.${inputExt}`
  const outputName = `output.${inputExt}`

  // Escribir el blob original en el sistema de archivos virtual de FFmpeg.wasm
  await ff.writeFile(inputName, await fetchFile(inputBlob))

  // Reprocesar: regenerar pts, optimizar moov atom al inicio
  await ff.exec([
    '-fflags', '+genpts',
    '-i', inputName,
    '-c:v', 'copy',
    '-movflags', '+faststart',
    '-y', // sobrescribir si existe
    outputName,
  ])

  // Leer el archivo resultante
  const data = await ff.readFile(outputName)
  const outputBlob = new Blob([data], { type: inputBlob.type })

  // Limpiar archivos temporales del FS virtual
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  return outputBlob
}
