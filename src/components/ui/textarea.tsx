'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helpText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const textareaId = id || React.useId()
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-bold uppercase tracking-wider text-black mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "w-full px-4 py-2.5 text-black bg-white border-2 border-black resize-none",
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
)
Textarea.displayName = 'Textarea'

export { Textarea }
