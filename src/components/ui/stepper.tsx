'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (index: number) => void
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && index <= currentStep
          
          return (
            <React.Fragment key={step.id}>
              <div 
                className={cn(
                  "flex flex-col items-center",
                  isClickable && "cursor-pointer"
                )}
                onClick={() => isClickable && onStepClick(index)}
              >
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center font-bold text-lg border-2 border-black",
                    isCompleted && "bg-green-400 text-black",
                    isCurrent && "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                    !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    isCurrent ? "text-black" : "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-1 mx-2 border-t-2 border-dashed",
                    index < currentStep ? "border-green-400" : "border-gray-300"
                  )} 
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  className?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  label, 
  showPercentage = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1">
          {label && (
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-bold text-black">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden">
        <div
          className="h-full bg-yellow-400 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export { Stepper, ProgressBar }
export type { Step, StepperProps, ProgressBarProps }
