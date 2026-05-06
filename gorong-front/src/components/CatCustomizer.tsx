import { useState } from 'react'
import CatCustomizationPanel from './CatCustomizationPanel'
import CatDisplay from './CatDisplay'

export default function CatCustomizer() {
  const [furColor, setFurColor] = useState('orange')
  const [outfit, setOutfit] = useState('basic')
  const [accessory, setAccessory] = useState('none')
  const [expression, setExpression] = useState('happy')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-3xl bg-white p-8 shadow-xl">
        <CatDisplay
          furColor={furColor}
          outfit={outfit}
          accessory={accessory}
          expression={expression}
        />
      </div>
      <div className="lg:col-span-1">
        <CatCustomizationPanel
          furColor={furColor}
          outfit={outfit}
          accessory={accessory}
          expression={expression}
          onFurColorChange={setFurColor}
          onOutfitChange={setOutfit}
          onAccessoryChange={setAccessory}
          onExpressionChange={setExpression}
        />
      </div>
    </div>
  )
}
