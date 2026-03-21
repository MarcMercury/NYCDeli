export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-r-transparent" />
        <p className="mt-4 text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  )
}
