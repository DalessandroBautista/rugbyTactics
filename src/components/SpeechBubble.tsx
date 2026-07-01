import React, { useState, useEffect } from 'react'
import { Group, Rect, Text, Line } from 'react-konva'
import { SpeechBubble as SpeechBubbleType } from '../types'

interface SpeechBubbleProps {
  bubble: SpeechBubbleType
  visible: boolean  // si debe mostrarse según el currentTime
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ bubble, visible }) => {
  const [animOpacity, setAnimOpacity] = useState(0)
  const [scale, setScale] = useState(0.5)

  // Animación de entrada/salida al cambiar visible
  useEffect(() => {
    if (visible) {
      // Entrada: un frame después para que React monte el DOM
      const raf = requestAnimationFrame(() => {
        setAnimOpacity(1)
        setScale(1)
      })
      return () => cancelAnimationFrame(raf)
    } else {
      setAnimOpacity(0)
      setScale(0.5)
    }
  }, [visible])

  // ── Layout ────────────────────────────────────────────────────────────────
  const padding = 10
  const maxTextWidth = 140
  const tailHeight = 10
  const borderRadius = 8
  const lineHeight = 14
  const fontSize = 11

  const charsPerLine = Math.floor(maxTextWidth / (fontSize * 0.55))
  const numLines = Math.max(1, Math.ceil(bubble.text.length / charsPerLine))
  const textContentHeight = numLines * lineHeight
  const bubbleHeight = textContentHeight + padding * 2
  const bubbleWidth = maxTextWidth + padding * 2

  const bgColor = bubble.color || 'rgba(15, 20, 30, 0.92)'
  const borderColor = 'rgba(255, 255, 255, 0.15)'
  const textColor = bubble.textColor || '#ffffff'

  // La cola apunta hacia abajo, al punto de "habla"
  const bodyTop = -(bubbleHeight + tailHeight)

  return (
    <Group
      x={bubble.x}
      y={bubble.y}
      opacity={animOpacity}
      scaleX={scale}
      scaleY={scale}
    >
      {/* Sombra */}
      <Rect
        x={-bubbleWidth / 2 + 2} y={bodyTop + 2}
        width={bubbleWidth} height={bubbleHeight}
        cornerRadius={borderRadius}
        fill="rgba(0, 0, 0, 0.35)"
      />

      {/* Cuerpo */}
      <Rect
        x={-bubbleWidth / 2} y={bodyTop}
        width={bubbleWidth} height={bubbleHeight}
        cornerRadius={borderRadius}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={1}
      />

      {/* Cola */}
      <Line
        points={[-7, bodyTop + bubbleHeight, 0, 0, 7, bodyTop + bubbleHeight]}
        fill={bgColor} closed
      />
      <Line
        points={[-7, bodyTop + bubbleHeight - 0.5, 0, 0, 7, bodyTop + bubbleHeight - 0.5]}
        stroke={borderColor} strokeWidth={1} closed
      />

      {/* Texto */}
      <Text
        x={-bubbleWidth / 2 + padding}
        y={bodyTop + padding}
        text={bubble.text}
        fontSize={fontSize}
        fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
        fill={textColor}
        align="center"
        width={maxTextWidth}
        lineHeight={lineHeight / fontSize}
      />
    </Group>
  )
}
