import React from 'react'
import { Dog, Accessibility, Languages } from 'lucide-react'

interface IconLabelProps {
  type: 'barrierFree' | 'guideDog' | 'foreigners' | 'wheelchair' | 'visualImpaired' | 'hearingImpaired'
  label?: string
  className?: string
}

export default function IconLabel({ type, label, className = '' }: IconLabelProps) {
  const iconConfig = {
    barrierFree: {
      icon: <Accessibility className="w-4 h-4" />,
      label: label || '배리어프리',
      color: 'bg-green-100 text-green-700',
    },
    guideDog: {
      icon: <Dog className="w-4 h-4" />,
      label: label || '안내견 가능',
      color: 'bg-orange-100 text-orange-700',
    },
    foreigners: {
      icon: <Languages className="w-4 h-4" />,
      label: label || '외국인 환영',
      color: 'bg-blue-100 text-blue-700',
    },
    wheelchair: {
      icon: <Accessibility className="w-4 h-4" />,
      label: label || '휠체어 접근',
      color: 'bg-purple-100 text-purple-700',
    },
    visualImpaired: {
      icon: <Accessibility className="w-4 h-4" />,
      label: label || '시각장애인 지원',
      color: 'bg-yellow-100 text-yellow-700',
    },
    hearingImpaired: {
      icon: <Accessibility className="w-4 h-4" />,
      label: label || '청각장애인 지원',
      color: 'bg-pink-100 text-pink-700',
    },
  }

  const config = iconConfig[type]

  return (
    <span className={`icon-label ${config.color} ${className}`}>
      {config.icon}
      <span className="text-xs font-medium">{config.label}</span>
    </span>
  )
}
