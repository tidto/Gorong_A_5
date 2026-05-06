import React from 'react'
import { Plus } from 'lucide-react'
import { FurnitureType } from '../types/furniture'

interface FurniturePaletteProps {
  onAddFurniture: (type: FurnitureType) => void
}

const FURNITURE_OPTIONS: Array<{ type: FurnitureType; name: string; emoji: string }> = [
  { type: 'bed', name: '침대', emoji: '🛏️' },
  { type: 'shelf', name: '책장', emoji: '📚' },
  { type: 'toy', name: '장난감', emoji: '🧸' },
  { type: 'rug', name: '카펫', emoji: '🧶' },
  { type: 'plant', name: '식물', emoji: '🌿' },
  { type: 'lamp', name: '램프', emoji: '💡' },
  { type: 'window', name: '창문', emoji: '🪟' },
  { type: 'picture', name: '액자', emoji: '🖼️' },
]

export default function FurniturePalette({ onAddFurniture }: FurniturePaletteProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🛋️ 가구 추가</h3>
      <div className="grid grid-cols-2 gap-2">
        {FURNITURE_OPTIONS.map(({ type, name, emoji }) => (
          <button
            key={type}
            onClick={() => onAddFurniture(type)}
            className="flex items-center gap-2 p-2 rounded-lg border-2 border-gray-200 
              hover:border-orange-400 hover:bg-orange-50 transition-all"
          >
            <span className="text-2xl">{emoji}</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-700">{name}</p>
              <Plus className="w-3 h-3 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
