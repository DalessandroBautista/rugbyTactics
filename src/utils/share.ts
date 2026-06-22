import { Play } from '../types'

const HASH_PREFIX = '#play='

// Codifica/decodifica en base64 seguro para UTF-8 (acentos en nombres, etc.)
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}
function fromBase64(b64: string): string {
  return decodeURIComponent(escape(atob(b64)))
}

/** Construye una URL que lleva la jugada serializada en el hash (sin backend). */
export function buildShareUrl(play: Play): string {
  const payload = toBase64(JSON.stringify(play))
  return `${location.origin}${location.pathname}${HASH_PREFIX}${payload}`
}

/** Si la URL actual contiene una jugada compartida, la decodifica. */
export function readSharedPlay(): Play | null {
  const hash = location.hash
  if (!hash.startsWith(HASH_PREFIX)) return null
  try {
    const json = fromBase64(hash.slice(HASH_PREFIX.length))
    const play = JSON.parse(json) as Play
    if (play && Array.isArray(play.players) && play.ball) return play
    return null
  } catch {
    return null
  }
}

/** Limpia el hash de la URL sin recargar la página. */
export function clearShareHash(): void {
  history.replaceState(null, '', location.pathname + location.search)
}
