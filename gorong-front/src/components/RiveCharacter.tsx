import React, { useEffect, useRef } from 'react'
import { MessageCircle, Heart } from 'lucide-react'

interface RiveCharacterProps {
  stateMachine?: 'idle' | 'happy' | 'excited' | 'thinking' | 'celebrating'
  message?: string
  onAnimationEnd?: () => void
  className?: string
}

/**
 * RiveCharacter Component
 * 
 * Displays the Go냥이 (Go-nyang) character animation.
 * In a real implementation, this would connect to a Rive animation file (.riv)
 * For now, it displays a placeholder with character state indicators.
 * 
 * Props:
 * - stateMachine: Current animation state
 * - message: Speech bubble message
 * - onAnimationEnd: Callback when animation ends
 * - className: Additional CSS classes
 */
export default function RiveCharacter({
  stateMachine = 'idle',
  message,
  onAnimationEnd,
  className = '',
}: RiveCharacterProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (stateMachine !== 'idle' && onAnimationEnd) {
      timeoutRef.current = setTimeout(() => {
        onAnimationEnd()
      }, 2000)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [stateMachine, onAnimationEnd])

  const stateEmoji = {
    idle: '😺',
    happy: '😻',
    excited: '🤩',
    thinking: '🤔',
    celebrating: '🎉',
  }[stateMachine]

  const animationClass = stateMachine !== 'idle' ? 'animate-character-reaction' : 'animate-float'

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div
        className={`w-32 h-32 flex items-center justify-center text-6xl ${animationClass} rounded-full bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200 shadow-lg`}
      >
        {stateEmoji}
      </div>

      {message && (
        <div className="relative bg-white rounded-2xl rounded-tl-none shadow-md p-4 max-w-xs">
          <MessageCircle className="w-5 h-5 text-gray-300 absolute -left-2 top-0" />
          <p className="text-sm text-gray-800 text-center">{message}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button className="p-2 rounded-full hover:bg-red-50 transition-colors">
          <Heart className="w-5 h-5 text-red-500" />
        </button>
      </div>

      {/* 실제 Rive 구현 시 아래처럼 사용: */}
      {/* <RiveComponent src="/rive/go-cat.riv" stateMachines={[stateMachine]} /> */}
    </div>
  )
}
