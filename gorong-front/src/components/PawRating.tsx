import React from 'react'

type PawRatingProps = {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
}

const sizeClass = {
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
}

function PawIcon({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex h-full w-full items-center justify-center">
      <span className={`absolute bottom-[7px] h-[18px] w-[20px] rounded-[45%] ${active ? 'bg-orange-500' : 'bg-orange-200'}`} />
      <span className={`absolute left-[4px] top-[7px] h-[8px] w-[8px] rounded-full ${active ? 'bg-orange-500' : 'bg-orange-200'}`} />
      <span className={`absolute left-[11px] top-[3px] h-[8px] w-[8px] rounded-full ${active ? 'bg-orange-500' : 'bg-orange-200'}`} />
      <span className={`absolute right-[11px] top-[3px] h-[8px] w-[8px] rounded-full ${active ? 'bg-orange-500' : 'bg-orange-200'}`} />
      <span className={`absolute right-[4px] top-[7px] h-[8px] w-[8px] rounded-full ${active ? 'bg-orange-500' : 'bg-orange-200'}`} />
    </span>
  )
}

export default function PawRating({ value, onChange, readOnly = false, size = 'md' }: PawRatingProps) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((current) => {
        const active = current <= value
        const className = `${sizeClass[size]} rounded-full border ${active ? 'border-orange-300 bg-orange-50' : 'border-orange-100 bg-white'}`

        if (readOnly || !onChange) {
          return (
            <span key={current} className={className}>
              <PawIcon active={active} />
            </span>
          )
        }

        return (
          <button
            key={current}
            type="button"
            className={`${className} transition-transform hover:-translate-y-0.5`}
            onClick={() => onChange(current)}
            aria-label={`${current}점`}
          >
            <PawIcon active={active} />
          </button>
        )
      })}
    </div>
  )
}
