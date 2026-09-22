import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { MyDeliPanel } from '@/components/my-deli-panel'

export default function PendingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-wider">
            ⏳ Hold Tight, Rat
          </CardTitle>
          <CardDescription>
            Your application is in the review pile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Camp leadership will review your registration and either approve or deny access.
            You&apos;ll get full access to the camp system once approved.
          </p>
          <p className="text-gray-500 text-sm">
            Your registration has been received — sit tight while Brian reviews it.
          </p>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Questions? Hit up Brian.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* An account is yours whether or not you're in an event yet. */}
      <MyDeliPanel />
    </div>
  )
}
