import React from 'react'
import { Palette } from 'lucide-react'

interface CharacterCustomizerProps {
  characterColor: string
  characterPattern: string
  onColorChange: (color: string) => void
  onPatternChange: (pattern: string) => void
}

const CHARACTER_COLORS = [
  { name: '오렌지', value: 'orange' },
  { name: '검정', value: 'black' },
  { name: '흰색', value: 'white' },
  { name: '회색', value: 'gray' },
  { name: '갈색', value: 'brown' },
  { name: '얼룩', value: 'tabby' },
]

const CHARACTER_PATTERNS = [
  { name: '단색', value: 'solid' },
  { name: '줄무늬', value: 'striped' },
  { name: '점박이', value: 'spotted' },
  { name: '얼룩', value: 'tabby' },
]

export default function CharacterCustomizer({
  characterColor,
  characterPattern,
  onColorChange,
  onPatternChange
}: CharacterCustomizerProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Palette className="w-5 h-5 text-orange-500" />
        🐱 고냥이 커스터마이징
      </h3>

      {/* 색상 선택 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">색상</p>
        <div className="grid grid-cols-3 gap-2">
          {CHARACTER_COLORS.map(({ name, value }) => (
            <button
              key={value}
              onClick={() => onColorChange(value)}
              className={`p-3 rounded-lg border-2 transition-all ${
                characterColor === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full mx-auto mb-1 bg-${value}-400`} />
              <p className="text-xs font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 패턴 선택 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">패턴</p>
        <div className="grid grid-cols-2 gap-2">
          {CHARACTER_PATTERNS.map(({ name, value }) => (
            <button
              key={value}
              onClick={() => onPatternChange(value)}
              className={`p-2 rounded-lg border-2 text-sm transition-all ${
                characterPattern === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <p className="font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 미리보기 */}
      <div className="mt-4 p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-2">미리보기</p>
        <p className="text-5xl">😺</p>
      </div>
    </div>
  )
}
