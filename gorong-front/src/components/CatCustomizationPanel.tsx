import React, { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

interface CatCustomizationPanelProps {
  furColor: string
  outfit: string
  accessory: string
  expression: string
  onFurColorChange: (color: string) => void
  onOutfitChange: (outfit: string) => void
  onAccessoryChange: (accessory: string) => void
  onExpressionChange: (expression: string) => void
}

const FUR_COLORS = [
  { name: '주황색', value: 'orange', emoji: '🟠' },
  { name: '검정색', value: 'black', emoji: '⬛' },
  { name: '흰색', value: 'white', emoji: '⚪' },
  { name: '회색', value: 'gray', emoji: '🔘' },
  { name: '갈색', value: 'brown', emoji: '🟤' },
]

const OUTFITS = [
  { name: '기본', value: 'basic', emoji: '😺' },
  { name: '모자', value: 'hat', emoji: '👒' },
  { name: '선글라스', value: 'sunglasses', emoji: '😎' },
  { name: '넥타이', value: 'tie', emoji: '👔' },
  { name: '스카프', value: 'scarf', emoji: '🧣' },
  { name: '왕관', value: 'crown', emoji: '👑' },
]

const ACCESSORIES = [
  { name: '없음', value: 'none', emoji: '✨' },
  { name: '목걸이', value: 'necklace', emoji: '📿' },
  { name: '뱃지', value: 'badge', emoji: '🏅' },
  { name: '팔찌', value: 'bracelet', emoji: '💍' },
  { name: '귀걸이', value: 'earring', emoji: '💎' },
]

const EXPRESSIONS = [
  { name: '행복', value: 'happy', emoji: '😻' },
  { name: '신난', value: 'excited', emoji: '🤩' },
  { name: '생각중', value: 'thinking', emoji: '🤔' },
  { name: '졸린', value: 'sleepy', emoji: '😴' },
  { name: '화난', value: 'angry', emoji: '😾' },
  { name: '시크', value: 'cool', emoji: '😼' },
]

export default function CatCustomizationPanel({
  furColor,
  outfit,
  accessory,
  expression,
  onFurColorChange,
  onOutfitChange,
  onAccessoryChange,
  onExpressionChange
}: CatCustomizationPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyShareLink = () => {
    const shareCode = btoa(JSON.stringify({ furColor, outfit, accessory, expression }))
    const shareUrl = `${window.location.origin}/?cat=${shareCode}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* 털 색상 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">🎨 털 색상</h3>
        <div className="grid grid-cols-3 gap-2">
          {FUR_COLORS.map(({ name, value, emoji }) => (
            <button
              key={value}
              onClick={() => onFurColorChange(value)}
              className={`p-3 rounded-lg border-2 transition-all text-center
                ${furColor === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              <div className="text-3xl mb-1">{emoji}</div>
              <p className="text-xs font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 의상 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">👗 의상</h3>
        <div className="grid grid-cols-2 gap-2">
          {OUTFITS.map(({ name, value, emoji }) => (
            <button
              key={value}
              onClick={() => onOutfitChange(value)}
              className={`p-3 rounded-lg border-2 transition-all
                ${outfit === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <p className="text-xs font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 액세서리 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">💎 액세서리</h3>
        <div className="grid grid-cols-2 gap-2">
          {ACCESSORIES.map(({ name, value, emoji }) => (
            <button
              key={value}
              onClick={() => onAccessoryChange(value)}
              className={`p-3 rounded-lg border-2 transition-all
                ${accessory === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <p className="text-xs font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 표정 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">😻 표정</h3>
        <div className="grid grid-cols-3 gap-2">
          {EXPRESSIONS.map(({ name, value, emoji }) => (
            <button
              key={value}
              onClick={() => onExpressionChange(value)}
              className={`p-3 rounded-lg border-2 transition-all text-center
                ${expression === value
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              <div className="text-3xl mb-1">{emoji}</div>
              <p className="text-xs font-semibold">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 공유 버튼 */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-lg shadow-md p-4">
        <button
          onClick={handleCopyShareLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 
            bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              복사됨!
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              내 고양이 공유하기
            </>
          )}
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">
          친구들과 당신의 고양이를 공유해보세요! 🐱
        </p>
      </div>
    </div>
  )
}
