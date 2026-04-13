'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, type, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = error ? `${inputId}-error` : undefined
    const helpId = helpText && !error ? `${inputId}-help` : undefined
    const describedBy = errorId || helpId || undefined
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-bold uppercase tracking-wider text-black mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full px-4 py-2.5 text-black bg-white border-2 border-black",
            "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400",
            "placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed",
            "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
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
Input.displayName = 'Input'

export { Input }
