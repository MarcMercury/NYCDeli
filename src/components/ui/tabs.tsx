'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn("border-b-2 border-black", className)}>
      <nav className="flex gap-0" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors",
                "border-2 border-b-0 border-black -mb-[2px]",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-inset",
                isActive 
                  ? "bg-yellow-400 text-black border-b-yellow-400" 
                  : "bg-white text-gray-600 border-b-black"
              )}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

interface TabPanelProps {
  children: React.ReactNode
  tabId: string
  activeTab: string
  className?: string
}

const TabPanel: React.FC<TabPanelProps> = ({ children, tabId, activeTab, className }) => {
  if (tabId !== activeTab) return null
  
  return (
    <div 
      role="tabpanel" 
      className={cn("pt-6", className)}
      aria-labelledby={tabId}
    >
      {children}
    </div>
  )
}

export { Tabs, TabPanel }
export type { Tab, TabsProps, TabPanelProps }
