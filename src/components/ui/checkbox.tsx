'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helpText?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId
    
    return (
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          className={cn(
            "h-5 w-5 mt-0.5 border-2 border-black bg-white cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2",
            "checked:bg-yellow-400 checked:border-black",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="flex-1">
          {label && (
            <label 
              htmlFor={checkboxId}
              className="text-sm font-medium text-black cursor-pointer select-none"
            >
              {label}
            </label>
          )}
          {(error || helpText) && (
            <p className={cn(
              "mt-0.5 text-xs",
              error ? "text-red-600 font-medium" : "text-gray-600"
            )}>
              {error || helpText}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export interface CheckboxGroupProps {
  label?: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  helpText?: string
  required?: boolean
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helpText,
  required,
}) => {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter(v => v !== optionValue))
    }
  }

  return (
    <div className="w-full">
      {label && (
        <p className="block text-sm font-bold uppercase tracking-wider text-black mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
      )}
      <div className="space-y-2 border-2 border-black p-3 bg-gray-50">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
          />
        ))}
      </div>
      {(error || helpText) && (
        <p className={cn(
          "mt-1 text-xs",
          error ? "text-red-600 font-medium" : "text-gray-600"
        )}>
          {error || helpText}
        </p>
      )}
    </div>
  )
}

export { Checkbox, CheckboxGroup }
