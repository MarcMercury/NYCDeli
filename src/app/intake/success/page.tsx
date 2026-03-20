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
            Your registration has been submitted and will be reviewed by Camp Lead Brian.
          </p>
          
          <div className="bg-yellow-50 border-2 border-yellow-400 p-4">
            <h3 className="font-bold uppercase text-sm mb-2">What Happens Next</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>✓ Your registration is now being reviewed</li>
              <li>→ You&apos;ll receive an email to schedule a short 20-30 min Zoom with Brian to talk about your burn</li>
              <li>→ You&apos;ll also get a link to a private Google Photos album from Burning Man 2025 so you can see what camp looks like</li>
              <li>→ After the Zoom, Brian will confirm your spot and next steps</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-2 border-blue-400 p-4">
            <h3 className="font-bold uppercase text-sm mb-2">Key Reminders</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>💰 Camp fees ($900 or $450 for builders) are due May 1, 2026</li>
              <li>📅 All campers must arrive by Event Sunday at 12pm</li>
              <li>🚪 All campers must stay through 2pm on Exodus Monday</li>
              <li>🎫 Need a ticket? Brian can help source face-value opportunities</li>
            </ul>
          </div>

          <div className="bg-gray-50 border-2 border-gray-300 p-4">
            <h3 className="font-bold uppercase text-sm mb-2">Check Your Email</h3>
            <p className="text-sm text-gray-600">
              Keep an eye on your inbox for the Zoom scheduling link and photo album. 
              If you don&apos;t hear back within a few days, reach out.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/login" className="w-full">
            <Button className="w-full">
              🔑 Sign In to Your Account
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
