import React from 'react'

interface InputProps {
  type?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  className?: string
  multiline?: boolean
  rows?: number
  disabled?: boolean
  label?: string
}

export default function Input({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  onKeyPress,
  className = '',
  multiline = false,
  rows = 4,
  disabled = false,
  label,
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          rows={rows}
          disabled={disabled}
          className={`input-field ${className}`}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          disabled={disabled}
          className={`input-field ${className}`}
        />
      )}
    </div>
  )
}
