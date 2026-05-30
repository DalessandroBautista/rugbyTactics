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

export async function exportToMp4(
  canvasElement: HTMLCanvasElement,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  const stream = canvasElement.captureStream(30)
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  const chunks: BlobPart[] = []

  return new Promise((resolve) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.start()

    const checkProgress = setInterval(() => {
      if (onProgress) {
        // approximate progress
      }
    }, 200)

    setTimeout(() => {
      mediaRecorder.stop()
      clearInterval(checkProgress)
    }, duration + 500)
  })
}

export function downloadVideo(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.webm`
  a.click()
  URL.revokeObjectURL(url)
}
