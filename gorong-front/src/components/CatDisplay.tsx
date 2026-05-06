import { useEffect, useState } from 'react'
import RiveCatCanvas from './RiveCatCanvas'

interface CatDisplayProps {
  furColor: string
  outfit: string
  accessory: string
  expression: string
}

const EXPRESSION_EMOJIS: Record<string, string> = {
  happy: '😻',
  excited: '🤩',
  thinking: '🤔',
  sleepy: '😴',
  angry: '😾',
  cool: '😼',
}

const OUTFIT_ICONS: Record<string, string> = {
  basic: '',
  hat: '👒',
  sunglasses: '😎',
  tie: '👔',
  scarf: '🧣',
  crown: '👑',
}

const ACCESSORY_ICONS: Record<string, string> = {
  none: '',
  necklace: '📿',
  badge: '🏅',
  bracelet: '💍',
  earring: '💎',
}

const FUR_COLOR_STYLES: Record<string, { bg: string; accent: string }> = {
  orange: { bg: 'from-orange-200 to-orange-300', accent: 'text-orange-600' },
  black: { bg: 'from-gray-600 to-gray-800', accent: 'text-gray-900' },
  white: { bg: 'from-gray-100 to-gray-200', accent: 'text-gray-600' },
  gray: { bg: 'from-gray-300 to-gray-400', accent: 'text-gray-700' },
  brown: { bg: 'from-amber-600 to-amber-800', accent: 'text-amber-700' },
}

export default function CatDisplay({
  furColor,
  outfit,
  accessory,
  expression
}: CatDisplayProps) {
  const [hasRiveAsset, setHasRiveAsset] = useState(false)
  const [checkedRiveAsset, setCheckedRiveAsset] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAsset = async () => {
      try {
        const response = await fetch('/cat-customizer.riv', { method: 'HEAD' })
        if (!mounted) return
        setHasRiveAsset(response.ok)
      } catch {
        if (!mounted) return
        setHasRiveAsset(false)
      } finally {
        if (mounted) setCheckedRiveAsset(true)
      }
    }

    checkAsset()
    return () => {
      mounted = false
    }
  }, [])

  if (hasRiveAsset) {
    return (
      <RiveCatCanvas
        furColor={furColor}
        outfit={outfit}
        accessory={accessory}
        expression={expression}
      />
    )
  }

  const colorStyle = FUR_COLOR_STYLES[furColor] || FUR_COLOR_STYLES.orange
  const expressionEmoji = EXPRESSION_EMOJIS[expression] || '😺'
  const outfitIcon = OUTFIT_ICONS[outfit] || ''
  const accessoryIcon = ACCESSORY_ICONS[accessory] || ''

  return (
    <div className="flex flex-col items-center justify-center">
      {checkedRiveAsset && (
        <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
          Rive 파일이 없어 기본 고양이 미리보기를 표시 중입니다. `public/cat-customizer.riv` 파일을 추가하면 Rive 모드가 자동 적용됩니다.
        </p>
      )}
      {/* 고양이 몸통 */}
      <div className={`
        relative w-48 h-56 bg-gradient-to-br ${colorStyle.bg}
        rounded-3xl shadow-2xl flex items-center justify-center
        border-4 border-white
      `}>
        {/* 고양이 귀 */}
        <div className="absolute -top-6 left-8 w-8 h-12 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full transform -rotate-12" />
        <div className="absolute -top-6 right-8 w-8 h-12 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full transform rotate-12" />

        {/* 고양이 얼굴 */}
        <div className="relative">
          {/* 표정 */}
          <div className="text-9xl mb-4">
            {expressionEmoji}
          </div>

          {/* 의상 아이콘 (위) */}
          {outfit !== 'basic' && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-5xl animate-bounce">
              {outfitIcon}
            </div>
          )}

          {/* 액세서리 아이콘 (오른쪽) */}
          {accessory !== 'none' && (
            <div className="absolute -right-16 top-12 text-4xl animate-pulse">
              {accessoryIcon}
            </div>
          )}
        </div>

        {/* 발 */}
        <div className="absolute -bottom-2 left-10 w-8 h-3 bg-orange-600 rounded-full opacity-70" />
        <div className="absolute -bottom-2 right-10 w-8 h-3 bg-orange-600 rounded-full opacity-70" />
      </div>

      {/* 꾸미기 정보 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          <span className="font-bold">털색:</span> {
            { orange: '주황색', black: '검정색', white: '흰색', gray: '회색', brown: '갈색' }[furColor]
          }
        </p>
        {outfit !== 'basic' && (
          <p className="text-sm text-gray-600">
            <span className="font-bold">의상:</span> {
              { hat: '모자', sunglasses: '선글라스', tie: '넥타이', scarf: '스카프', crown: '왕관' }[outfit]
            }
          </p>
        )}
        {accessory !== 'none' && (
          <p className="text-sm text-gray-600">
            <span className="font-bold">액세서리:</span> {
              { necklace: '목걸이', badge: '뱃지', bracelet: '팔찌', earring: '귀걸이' }[accessory]
            }
          </p>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-bold">표정:</span> {
            { happy: '행복', excited: '신난', thinking: '생각중', sleepy: '졸린', angry: '화난', cool: '시크' }[expression]
          }
        </p>
      </div>
    </div>
  )
}
