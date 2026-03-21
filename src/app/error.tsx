'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-black uppercase mb-4">Something Broke</h2>
        <p className="text-gray-600 mb-6">
          An unexpected error occurred. This has been logged.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  )
}
