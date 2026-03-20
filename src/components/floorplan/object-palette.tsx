'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { OBJECT_TEMPLATES, CATEGORY_LABELS, type ObjectTemplate } from './object-templates'
import type { FloorplanObjectType } from '@/types/database'

interface ObjectPaletteProps {
  onDragStart: (template: ObjectTemplate) => void
}

export function ObjectPalette({ onDragStart }: ObjectPaletteProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('structures')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = Object.keys(CATEGORY_LABELS) as Array<ObjectTemplate['category']>

  const filteredTemplates = searchQuery
    ? OBJECT_TEMPLATES.filter(
        t =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : OBJECT_TEMPLATES

  const groupedTemplates = categories.reduce(
    (acc, cat) => {
      acc[cat] = filteredTemplates.filter(t => t.category === cat)
      return acc
    },
    {} as Record<string, ObjectTemplate[]>
  )

  function handleDragStart(e: React.DragEvent, template: ObjectTemplate) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'new-object',
      objectType: template.type as FloorplanObjectType,
    }))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(template)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧰 Objects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search objects..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {/* Categories */}
        {categories.map(cat => {
          const items = groupedTemplates[cat] || []
          if (items.length === 0) return null
          const isExpanded = expandedCategory === cat || !!searchQuery
          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCategory(isExpanded && !searchQuery ? null : cat)}
                className="w-full text-left text-xs font-black uppercase tracking-wider py-1.5 px-2 bg-gray-100 border-2 border-black hover:bg-gray-200 transition-colors flex items-center justify-between"
              >
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  {items.map(template => (
                    <div
                      key={template.type}
                      draggable
                      onDragStart={e => handleDragStart(e, template)}
                      className="flex flex-col items-center gap-1 p-2 border-2 border-gray-300 bg-white cursor-grab hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:cursor-grabbing transition-all select-none"
                      title={template.description}
                    >
                      <span className="text-lg">{template.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                        {template.label}
                      </span>
                      <div
                        className="w-full h-1 rounded-full"
                        style={{ backgroundColor: template.defaultColor }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Drag hint */}
        <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider pt-2">
          Drag objects onto the grid
        </p>
      </CardContent>
    </Card>
  )
}
