import React, { useRef } from 'react'
import { GripHorizontal, Trash2 } from 'lucide-react'
import { FurnitureItem } from '../types/furniture'

interface FurnitureItemComponentProps {
  item: FurnitureItem
  onDragStart: (e: React.DragEvent, id: string) => void
  onDelete: (id: string) => void
  isDragging?: boolean
}

export default function FurnitureItemComponent({
  item,
  onDragStart,
  onDelete,
  isDragging = false
}: FurnitureItemComponentProps) {
  const itemRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={itemRef}
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className={`
        absolute cursor-move
        hover:ring-2 hover:ring-orange-400 rounded-lg transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        group
      `}
      style={{
        left: `${item.position.x}px`,
        top: `${item.position.y}px`,
        width: `${item.size.width}px`,
        height: `${item.size.height}px`,
      }}
    >
      <div className="relative w-full h-full">
        <div className={`
          w-full h-full flex items-center justify-center text-4xl
          rounded-lg transition-all
          ${item.color ? `bg-${item.color}-100` : 'bg-gray-100'}
        `}>
          {item.emoji}
        </div>
        
        {/* 드래그 핸들 */}
        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripHorizontal className="w-4 h-4 text-gray-500" />
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={() => onDelete(item.id)}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 
            transition-opacity bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        {/* 아이템 이름 */}
        <div className="absolute -bottom-6 left-0 text-xs text-gray-600 whitespace-nowrap">
          {item.name}
        </div>
      </div>
    </div>
  )
}
