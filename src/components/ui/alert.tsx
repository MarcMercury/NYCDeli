'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
}

const Alert: React.FC<AlertProps> = ({ 
  className, 
  variant = 'info', 
  title,
  children,
  ...props 
}) => {
  const variants = {
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    success: 'bg-green-50 border-green-500 text-green-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    error: 'bg-red-50 border-red-500 text-red-900',
  }

  const icons = {
    info: '💡',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  }
  
  return (
    <div
      className={cn(
        "border-2 border-l-4 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
        variants[variant],
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex gap-3">
        <span className="text-lg flex-shrink-0">{icons[variant]}</span>
        <div>
          {title && (
            <h4 className="font-bold uppercase tracking-wider text-sm mb-1">
              {title}
            </h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

export { Alert }
