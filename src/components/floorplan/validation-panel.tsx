'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { FloorplanObjectRow, FloorplanConfigRow } from '@/types/database'
import { runValidation, type ValidationResult } from './validation-engine'

interface ValidationPanelProps {
  objects: FloorplanObjectRow[]
  config: FloorplanConfigRow
  onSelectObject: (id: string) => void
}

const SEVERITY_STYLES = {
  pass: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  warn: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
  fail: { icon: '❌', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
}

export function ValidationPanel({ objects, config, onSelectObject }: ValidationPanelProps) {
  const results = useMemo(() => runValidation(objects, config), [objects, config])

  const passCount = results.filter(r => r.severity === 'pass').length
  const warnCount = results.filter(r => r.severity === 'warn').length
  const failCount = results.filter(r => r.severity === 'fail').length

  function handleClickResult(result: ValidationResult) {
    if (result.objectIds && result.objectIds.length > 0) {
      onSelectObject(result.objectIds[0])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔍</span>
          <span>BRC Compliance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary bar */}
        <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
          {failCount > 0 && (
            <span className="bg-red-100 text-red-800 px-2 py-0.5 border border-red-300">
              {failCount} fail
            </span>
          )}
          {warnCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 border border-yellow-300">
              {warnCount} warn
            </span>
          )}
          <span className="bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">
            {passCount} pass
          </span>
        </div>

        {/* Results list — failures and warnings first */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {results
            .sort((a, b) => {
              const order = { fail: 0, warn: 1, pass: 2 }
              return order[a.severity] - order[b.severity]
            })
            .map(result => {
              const style = SEVERITY_STYLES[result.severity]
              return (
                <button
                  key={result.id}
                  onClick={() => handleClickResult(result)}
                  className={`w-full text-left px-2 py-1.5 border ${style.border} ${style.bg} hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs flex-shrink-0 mt-0.5">{style.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>
                        {result.label}
                      </p>
                      <p className="text-[10px] text-gray-600 leading-tight">
                        {result.message}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
        </div>

        {results.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            Add objects to see compliance checks
          </p>
        )}
      </CardContent>
    </Card>
  )
}
