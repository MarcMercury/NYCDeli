'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function AdminError({
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
        <h2 className="text-2xl font-black uppercase mb-4">Admin Error</h2>
        <p className="text-gray-600 mb-6">
          Something went wrong in the admin panel. Try refreshing.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  )
}
