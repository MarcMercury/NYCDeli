import React from 'react'

export function Footer() {
  return (
    <footer className="bg-black text-white border-t-4 border-yellow-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐀</span>
            <div>
              <h3 className="font-black text-xl uppercase tracking-wider text-yellow-400">
                NYC Deli Rats
              </h3>
              <p className="text-sm text-gray-400">
                Burning Man 2026 • Black Rock City
              </p>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-400 italic">
              &ldquo;A highly organized New Yorker built a military-grade spreadsheet<br className="hidden md:inline" />
              and then yelled at everyone until they used it correctly.&rdquo;
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          <p>This is a temporary coordination system. Not a social platform. Not a post-event archive.</p>
          <p className="mt-2">© 2026 NYC Deli Rats Camp. Measure your tent. Not vibes.</p>
        </div>
      </div>
    </footer>
  )
}
