import React from 'react'
import { AlertCircle, Check, Shield } from 'lucide-react'

interface AccessibilityBadgeProps {
  type: 'verified' | 'partial' | 'unavailable' | 'info'
  label: string
  description?: string
  className?: string
}

/**
 * 접근성 정보 배지 컴포넌트
 * 배리어프리 상태를 시각적으로 표시
 */
export default function AccessibilityBadge({
  type,
  label,
  description,
  className = '',
}: AccessibilityBadgeProps) {
  const config = {
    verified: {
      icon: <Check className="w-5 h-5" />,
      color: 'bg-green-50 border-green-200 text-green-800',
      bgColor: 'bg-green-100',
    },
    partial: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      bgColor: 'bg-yellow-100',
    },
    unavailable: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-red-50 border-red-200 text-red-800',
      bgColor: 'bg-red-100',
    },
    info: {
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      bgColor: 'bg-blue-100',
    },
  }

  const typeConfig = config[type]

  return (
    <div className={`border rounded-lg p-3 ${typeConfig.color} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${typeConfig.bgColor}`}>
          {typeConfig.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{label}</h4>
          {description && <p className="text-xs mt-1 opacity-75">{description}</p>}
        </div>
      </div>
    </div>
  )
}
