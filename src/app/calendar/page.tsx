import { redirect } from 'next/navigation'

// The camp calendar is a tab on /events — "what is the camp doing" is one question.
export default function CalendarRedirectPage() {
  redirect('/events?view=calendar')
}
