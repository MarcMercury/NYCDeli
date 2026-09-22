import { redirect } from 'next/navigation'

/**
 * The applicant queue is now a filter on the unified directory, so that a
 * decision made here and a decision made in the CRM cannot disagree.
 */
export default function ApplicantsRedirect() {
  redirect('/admin/people?status=applicant')
}
