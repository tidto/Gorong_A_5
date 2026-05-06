import { useEffect, useMemo, useState } from 'react'
import { Layout, Fit, Alignment, useRive } from 'rive-react'

interface RiveCatCanvasProps {
  furColor: string
  outfit: string
  accessory: string
  expression: string
}

const STATE_MACHINE_NAME = 'CatMachine'
const RIVE_FILE_PATH = '/cat-customizer.riv'

const COLOR_MAP: Record<string, number> = {
  orange: 0,
  black: 1,
  white: 2,
  gray: 3,
  brown: 4,
}

const OUTFIT_MAP: Record<string, number> = {
  basic: 0,
  hat: 1,
  sunglasses: 2,
  tie: 3,
  scarf: 4,
  crown: 5,
}

const ACCESSORY_MAP: Record<string, number> = {
  none: 0,
  necklace: 1,
  badge: 2,
  bracelet: 3,
  earring: 4,
}

const EXPRESSION_MAP: Record<string, number> = {
  happy: 0,
  excited: 1,
  thinking: 2,
  sleepy: 3,
  angry: 4,
  cool: 5,
}

const INPUT_ALIASES = {
  furColor: ['furColor', 'fur_color', 'color', 'catColor', 'FurColor'],
  outfit: ['outfit', 'cloth', 'costume', 'look', 'Outfit'],
  accessory: ['accessory', 'acc', 'item', 'prop', 'Accessory'],
  expression: ['expression', 'face', 'mood', 'emotion', 'Expression'],
}

export default function RiveCatCanvas({
  furColor,
  outfit,
  accessory,
  expression,
}: RiveCatCanvasProps) {
  const [missingInputs, setMissingInputs] = useState<string[]>([])

  const { rive, RiveComponent } = useRive({
    src: RIVE_FILE_PATH,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  })

  const stateMachineInputs = useMemo(() => {
    if (!rive) return []
    try {
      const inputs = rive.stateMachineInputs(STATE_MACHINE_NAME)
      return Array.isArray(inputs) ? inputs : []
    } catch {
      return []
    }
  }, [rive])

  const resolveInput = (aliases: string[]) => {
    if (!Array.isArray(stateMachineInputs) || stateMachineInputs.length === 0) {
      return null
    }
    const lowerAliases = aliases.map((a) => a.toLowerCase())
    return stateMachineInputs.find((input) =>
      lowerAliases.includes(input.name.toLowerCase())
    )
  }

  useEffect(() => {
    if (!rive) return

    const missing: string[] = []

    const colorInput = resolveInput(INPUT_ALIASES.furColor)
    const outfitInput = resolveInput(INPUT_ALIASES.outfit)
    const accessoryInput = resolveInput(INPUT_ALIASES.accessory)
    const expressionInput = resolveInput(INPUT_ALIASES.expression)

    if (colorInput) colorInput.value = COLOR_MAP[furColor] ?? 0
    else missing.push('furColor')

    if (outfitInput) outfitInput.value = OUTFIT_MAP[outfit] ?? 0
    else missing.push('outfit')

    if (accessoryInput) accessoryInput.value = ACCESSORY_MAP[accessory] ?? 0
    else missing.push('accessory')

    if (expressionInput) expressionInput.value = EXPRESSION_MAP[expression] ?? 0
    else missing.push('expression')

    setMissingInputs(missing)
  }, [rive, stateMachineInputs, furColor, outfit, accessory, expression])

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl bg-orange-50">
      <RiveComponent />
      {missingInputs.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/70 px-3 py-2 text-xs text-white">
          Rive 입력 일부를 찾지 못했습니다: {missingInputs.join(', ')}. state machine `{STATE_MACHINE_NAME}` 또는 입력 이름을 확인해 주세요.
        </div>
      )}
    </div>
  )
}
