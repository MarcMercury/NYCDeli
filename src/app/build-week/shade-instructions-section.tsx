'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  CAMP_GRID_GUIDES,
  COMPLETE_SET_SLUG,
  SHADE_SHEET_TEXT,
} from '@/lib/shade-instructions'

export default function ShadeInstructionsSection() {
  const [open, setOpen] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* ─── Shade structure field guides ─── */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              Shade Structure Erection
            </p>
            <p className="text-[11px] text-gray-500">
              Six illustrated field guides — print landscape, one per build stage.
            </p>
          </div>
          <a
            href={`/api/shade-instructions/${COMPLETE_SET_SLUG}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
          >
            📄 Download Complete Set ({SHADE_SHEET_TEXT.length} sheets)
          </a>
        </div>

        <div className="divide-y divide-gray-200 border border-gray-200">
          {SHADE_SHEET_TEXT.map(sheet => {
            const isOpen = open === sheet.slug
            return (
              <div key={sheet.slug}>
                <div className="flex items-center gap-2 px-3 py-2 bg-white">
                  <span className="flex-shrink-0 w-9 h-9 bg-red-700 text-white flex items-center justify-center text-[11px] font-black">
                    {sheet.code}
                  </span>
                  <button
                    onClick={() => setOpen(isOpen ? null : sheet.slug)}
                    className="flex-1 text-left hover:opacity-70 transition-opacity"
                    aria-expanded={isOpen}
                  >
                    <p className="text-xs font-bold">{sheet.title.replace(/ — FIELD GUIDE.*/i, '')}</p>
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
                    <p className="text-[11px] italic text-gray-500 py-1.5">{sheet.subtitle}</p>
                    <div className="space-y-2">
                      {sheet.panels.map((panel, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-700 text-white flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <div className="leading-relaxed">
                            <span className="font-bold">{panel.title}</span>
                            <span className="text-gray-600"> — {panel.lines.join(' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                        Quick checklist
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {sheet.checklist.map(item => (
                          <span key={item} className="text-[11px] text-gray-700">
                            ☑ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Camp grid layout guides ─── */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider">Laying Out the Camp Grid</p>
        <p className="text-[11px] text-gray-500 mb-1.5">
          Survey and flagging guides — run these before any structure goes up.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {CAMP_GRID_GUIDES.map(guide => (
            <div key={guide.slug} className="border border-gray-200 bg-white">
              <button
                onClick={() => setZoomed(guide.image)}
                className="block w-full relative aspect-[1426/1103] bg-gray-50 hover:opacity-90 transition-opacity"
                aria-label={`Enlarge ${guide.title}`}
              >
                <Image
                  src={guide.image}
                  alt={guide.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-contain"
                />
              </button>
              <div className="p-2 border-t border-gray-200">
                <p className="text-xs font-bold">{guide.title}</p>
                <p className="text-[11px] text-gray-500">{guide.summary}</p>
                <div className="flex gap-1.5 mt-1.5">
                  <a
                    href={guide.image}
                    download
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide border-2 border-black bg-yellow-300 hover:bg-yellow-400 transition-colors"
                  >
                    ⬇ PNG
                  </a>
                  <a
                    href={guide.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide border-2 border-black bg-white hover:bg-gray-100 transition-colors"
                  >
                    Open full size ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {zoomed && (
        <button
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          aria-label="Close preview"
        >
          <span className="relative w-full max-w-6xl aspect-[1426/1103]">
            <Image src={zoomed} alt="Camp grid field guide" fill className="object-contain" />
          </span>
        </button>
      )}
    </div>
  )
}
