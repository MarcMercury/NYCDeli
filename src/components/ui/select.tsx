'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helpText?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helpText, options, placeholder, id, ...props }, ref) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const errorId = error ? `${selectId}-error` : undefined
    const helpId = helpText && !error ? `${selectId}-help` : undefined
    const describedBy = errorId || helpId || undefined
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-bold uppercase tracking-wider text-black mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full px-4 py-2.5 text-black bg-white border-2 border-black appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400",
            "disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer",
            "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.5rem]",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || helpText) && (
          <p 
            id={errorId || helpId}
            className={cn(
              "mt-1 text-xs",
              error ? "text-red-600 font-medium" : "text-gray-600"
            )}
            role={error ? "alert" : undefined}
          >
            {error || helpText}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
