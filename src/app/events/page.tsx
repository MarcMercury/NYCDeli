import { EventsCalendar } from '@/components/events-calendar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pre-Burn Events | NYC Deli Rats 2026',
  description: 'Camp events calendar from now until the Burn.',
}

export default function EventsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-yellow-400 border-b-4 border-black py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
            Pre-Burn Events
          </h1>
          <p className="text-lg text-black/70 max-w-2xl">
            Camp meetups, planning sessions, fundraisers, and more — from now until we hit the playa.
          </p>
        </div>
      </section>

      {/* Calendar */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <EventsCalendar />
        </div>
      </section>

      {/* Legend */}
      <section className="pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-50 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Category Legend
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'General', color: 'bg-gray-200 text-gray-800' },
                { label: 'Social', color: 'bg-purple-200 text-purple-800' },
                { label: 'Planning', color: 'bg-blue-200 text-blue-800' },
                { label: 'Fundraiser', color: 'bg-green-200 text-green-800' },
                { label: 'Build', color: 'bg-orange-200 text-orange-800' },
                { label: 'Shopping', color: 'bg-pink-200 text-pink-800' },
              ].map((cat) => (
                <span
                  key={cat.label}
                  className={`text-xs font-medium px-2 py-1 rounded ${cat.color}`}
                >
                  {cat.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
