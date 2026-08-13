'use client'

import { useState } from 'react'
import {
  COMPLETE_SET_SLUG,
  SHADE_INSTRUCTION_SHEETS,
  type InstructionBlock,
} from '@/lib/shade-instructions'

function Blocks({ blocks }: { blocks: InstructionBlock[] }) {
  const stepNumbers: number[] = []
  let counter = 0
  for (const b of blocks) {
    if (b.type === 'h') counter = 0
    if (b.type === 'step') counter += 1
    stepNumbers.push(counter)
  }

  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h':
            return (
              <p
                key={i}
                className="text-[11px] font-black uppercase tracking-wider border-b border-gray-300 pb-1 pt-2"
              >
                {b.text}
              </p>
            )
          case 'p':
            return (
              <p key={i} className="text-xs text-gray-700 leading-relaxed">
                {b.text}
              </p>
            )
          case 'bullet':
            return (
              <p key={i} className="text-xs text-gray-700 leading-relaxed pl-4 -indent-3">
                • {b.text}
              </p>
            )
          case 'step': {
            return (
              <div key={i} className="flex gap-2 text-xs">
                <span className="flex-shrink-0 w-5 h-5 bg-black text-white flex items-center justify-center text-[10px] font-bold">
                  {stepNumbers[i]}
                </span>
                <div className="leading-relaxed">
                  <span className="font-bold">{b.title}</span>
                  {b.text && <span className="text-gray-600"> — {b.text}</span>}
                </div>
              </div>
            )
          }
          case 'kv':
            return (
              <div key={i} className="flex gap-3 text-xs border-b border-gray-100 py-1">
                <span className="font-bold w-40 flex-shrink-0">{b.label}</span>
                <span className="text-gray-700">{b.value}</span>
              </div>
            )
          case 'note':
            return (
              <p
                key={i}
                className="text-xs font-bold bg-amber-50 border-l-4 border-amber-500 px-3 py-2 my-2"
              >
                {b.text}
              </p>
            )
          case 'divider':
            return <hr key={i} className="border-gray-200 my-2" />
          case 'space':
            return <div key={i} className="h-2" />
        }
      })}
    </div>
  )
}

export default function ShadeInstructionsSection() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        The full erection sequence, split into printable field sheets. Download the complete set for
        the build binder, or grab a single sheet for the crew running that stage.
      </p>

      <a
        href={`/api/shade-instructions/${COMPLETE_SET_SLUG}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
      >
        📄 Download Complete Set ({SHADE_INSTRUCTION_SHEETS.length} sheets, PDF)
      </a>

      <div className="divide-y divide-gray-200 border border-gray-200 mt-2">
        {SHADE_INSTRUCTION_SHEETS.map(sheet => {
          const isOpen = open === sheet.slug
          return (
            <div key={sheet.slug}>
              <div className="flex items-center gap-2 px-3 py-2 bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : sheet.slug)}
                  className="flex-1 text-left hover:opacity-70 transition-opacity"
                  aria-expanded={isOpen}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {sheet.code}
                  </span>
                  <p className="text-xs font-bold">{sheet.title}</p>
                  <p className="text-[11px] text-gray-500">{sheet.summary}</p>
                </button>
                <a
                  href={`/api/shade-instructions/${sheet.slug}`}
                  className="flex-shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wide border-2 border-black bg-yellow-300 hover:bg-yellow-400 transition-colors"
                >
                  ⬇ PDF
                </a>
                <button
                  onClick={() => setOpen(isOpen ? null : sheet.slug)}
                  className="flex-shrink-0 text-gray-300 text-xs px-1"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                >
                  {isOpen ? '▾' : '▸'}
                </button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3 bg-gray-50">
                  {sheet.subtitle && (
                    <p className="text-[11px] italic text-gray-500 pt-1 pb-2">{sheet.subtitle}</p>
                  )}
                  <Blocks blocks={sheet.blocks} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
