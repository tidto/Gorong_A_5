import React, { useState } from 'react'
import FurnitureItemComponent from './FurnitureItem'
import { FurnitureItem } from '../types/furniture'

interface DecorationCanvasProps {
  furnitureItems: FurnitureItem[]
  backgroundColor: string
  onUpdateFurniture: (items: FurnitureItem[]) => void
  onDeleteFurniture: (id: string) => void
}

const BG_COLORS: Record<string, { bg: string; label: string }> = {
  'basic': { bg: 'bg-orange-50', label: '기본' },
  'cozy': { bg: 'bg-amber-100', label: '따뜻함' },
  'calm': { bg: 'bg-blue-100', label: '차분' },
  'fresh': { bg: 'bg-green-100', label: '상큼' },
  'pink': { bg: 'bg-pink-100', label: '핑크' },
}

export default function DecorationCanvas({
  furnitureItems,
  backgroundColor,
  onUpdateFurniture,
  onDeleteFurniture
}: DecorationCanvasProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const item = furnitureItems.find(f => f.id === id)
    if (!item) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const canvasRect = (e.currentTarget?.closest('[data-canvas]') as HTMLElement)?.getBoundingClientRect()
    
    if (canvasRect) {
      setDragOffset({
        x: rect.left - canvasRect.left,
        y: rect.top - canvasRect.top
      })
    }
    
    setDraggedItemId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-orange-300')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-orange-300')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-orange-300')

    if (!draggedItemId) return

    const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const newX = e.clientX - canvasRect.left - dragOffset.x
    const newY = e.clientY - canvasRect.top - dragOffset.y

    const updatedItems = furnitureItems.map(item =>
      item.id === draggedItemId
        ? { ...item, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
        : item
    )

    onUpdateFurniture(updatedItems)
    setDraggedItemId(null)
  }

  const bgColor = BG_COLORS[backgroundColor]?.bg || 'bg-orange-50'

  return (
    <div className="flex flex-col gap-4">
      {/* 배경색 선택 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">방 배경</p>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(BG_COLORS).map(([key, { bg, label }]) => (
            <button
              key={key}
              onClick={() => onUpdateFurniture(furnitureItems)}
              className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all
                ${backgroundColor === key 
                  ? 'border-orange-500' 
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              <div className={`w-full h-6 rounded ${bg} mb-1`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 캔버스 */}
      <div
        data-canvas
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full h-80 ${bgColor} rounded-xl border-4 border-dashed border-gray-300
          shadow-inner transition-all
        `}
      >
        {/* 가구 아이템들 */}
        {furnitureItems.map(item => (
          <FurnitureItemComponent
            key={item.id}
            item={item}
            onDragStart={handleDragStart}
            onDelete={onDeleteFurniture}
            isDragging={draggedItemId === item.id}
          />
        ))}

        {/* 빈 상태 메시지 */}
        {furnitureItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p className="text-center">
              <p className="text-3xl mb-2">📦</p>
              가구를 추가해서 꾸며보세요!
            </p>
          </div>
        )}
      </div>

      {/* 정보 */}
      <p className="text-xs text-gray-500 text-center">
        💡 팁: 가구를 드래그해서 위치를 이동할 수 있습니다
      </p>
    </div>
  )
}
