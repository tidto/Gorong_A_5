import React from 'react'
import { ChevronRight } from 'lucide-react'

interface CardProps {
  title?: string
  description?: string
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  image?: string
  tags?: string[]
}

export default function Card({
  title,
  description,
  children,
  onClick,
  className = '',
  image,
  tags = [],
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer ${className}`}
    >
      {image && (
        <div className="w-full h-40 mb-3 rounded-lg overflow-hidden bg-gray-200">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {title && (
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
