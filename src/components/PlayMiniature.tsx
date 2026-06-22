import React, { useRef, useEffect } from 'react'
import { Play, FIELD_PX } from '../types'

const PlayMiniature: React.FC<{ play: Play; width: number; height: number }> = ({ play, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const scaleX = width / FIELD_PX.totalLength
    const scaleY = height / FIELD_PX.width

    // Background
    ctx.fillStyle = '#1e4025'
    ctx.fillRect(0, 0, width, height)

    // Halfway line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    // Players
    for (const player of play.players) {
      const px = (player.y + FIELD_PX.width / 2) * scaleX
      const py = (-player.x + FIELD_PX.totalLength / 2) * scaleY
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = player.color
      ctx.fill()
    }

    // Ball
    const bx = (play.ball.y + FIELD_PX.width / 2) * scaleX
    const by = (-play.ball.x + FIELD_PX.totalLength / 2) * scaleY
    ctx.beginPath()
    ctx.arc(bx, by, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#f1c40f'
    ctx.fill()
  }, [play, width, height])

  return <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 6 }} />
}

export default PlayMiniature
