import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@/components/ui'

export default function IntakeSuccessPage() {
  return (
    <div className="min-h-screen py-16 px-4 flex items-center justify-center">
      <Card className="max-w-lg w-full" variant="success">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <CardTitle className="text-2xl">You&apos;re In The System</CardTitle>
          <CardDescription className="text-base">
            Don&apos;t ghost us.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-700">
            Your registration has been submitted. We&apos;ve got your dimensions, 
            your dates, and your promises. Now we need you to actually show up.
          </p>
          
          <div className="bg-yellow-50 border-2 border-yellow-400 p-4">
            <h3 className="font-bold uppercase text-sm mb-2">What Happens Next</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✓ Your data is now in the system</li>
              <li>✓ Layout engine will assign your spot</li>
              <li>✓ Scheduling engine will assign your shifts</li>
              <li>→ Check your email for updates</li>
              <li>→ Come back to check your schedule</li>
            </ul>
          </div>

          <div className="bg-gray-50 border-2 border-gray-300 p-4">
            <h3 className="font-bold uppercase text-sm mb-2">Remember</h3>
            <p className="text-sm text-gray-600 italic">
              &ldquo;If you guess, we will treat it as fact. And then judge you for it.&rdquo;
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/schedule" className="w-full">
            <Button className="w-full">
              📅 View Schedule
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="secondary" className="w-full">
              ← Back to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
