import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

const modules = [
  {
    href: '/intake',
    icon: '📝',
    title: 'Register',
    description: 'Start here. Fill out your info so we know who you are and what you need.',
    status: 'Required',
    statusColor: 'text-red-600',
  },
  {
    href: '/layout-view',
    icon: '🗺️',
    title: 'Camp Layout',
    description: "See where your tent goes. Spoiler: where we put it, not where you want it.",
    status: 'View Only',
    statusColor: 'text-blue-600',
  },
  {
    href: '/kitchen',
    icon: '🍳',
    title: 'Kitchen Ops',
    description: "Sandwiches don't make themselves. Learn the roles, see the schedule.",
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/schedule',
    icon: '📅',
    title: 'Your Schedule',
    description: "Check your shifts. Show up. Don't be the person who doesn't show up.",
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/build-week',
    icon: '🔨',
    title: 'Build Week',
    description: 'Early arrival coordination. Tasks, checklists, and controlled chaos.',
    status: 'Upcoming',
    statusColor: 'text-yellow-600',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-yellow-400 border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-6xl md:text-8xl">🐀</span>
              <span className="text-6xl md:text-8xl">🥪</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black mb-4">
              NYC Deli Rats
            </h1>
            <p className="text-xl md:text-2xl font-bold text-black/80 mb-2">
              Burning Man 2026 • Black Rock City
            </p>
            <p className="text-lg text-black/70 max-w-2xl mb-8">
              This is the coordination system that ensures camp functions immediately upon arrival.
              Not a social platform. Not a vibe check. A military-grade spreadsheet with attitude.
            </p>
            <Link
              href="/intake"
              className="inline-flex items-center px-8 py-4 bg-black text-yellow-400 font-black uppercase tracking-wider text-lg hover:bg-gray-900 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              📝 Register Now
            </Link>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-400 mb-4">
              What This Is
            </h2>
            <p className="text-xl md:text-2xl font-medium leading-relaxed">
              A <span className="text-yellow-400">temporary coordination engine</span> that 
              collects structured camper data, translates it into real-world spatial and 
              operational decisions, and eliminates ambiguity before arrival.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500">
                ✓ Collect structured data
              </span>
              <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500">
                ✓ Assign responsibilities
              </span>
              <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500">
                ✓ Eliminate ambiguity
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            System Modules
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Each module feeds the others. No data exists in isolation.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link key={module.href} href={module.href} className="group">
                <Card className="h-full transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <span className="text-4xl">{module.icon}</span>
                      <span className={`text-xs font-bold uppercase ${module.statusColor}`}>
                        {module.status}
                      </span>
                    </div>
                    <CardTitle className="mt-4">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm font-bold text-yellow-600 group-hover:text-yellow-700">
                      Go to {module.title} →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Important Dates */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center text-yellow-400 mb-12">
            Critical Dates
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { date: 'Aug 1', label: 'Registration Deadline', desc: 'No exceptions' },
              { date: 'Aug 23', label: 'Build Week Starts', desc: 'Early arrivals only' },
              { date: 'Aug 30', label: 'Burn Starts', desc: 'Gates open' },
              { date: 'Sep 7', label: 'Exodus', desc: 'Leave no trace' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-3xl font-black text-yellow-400 mb-2">
                  {item.date}
                </div>
                <div className="font-bold uppercase tracking-wider text-sm mb-1">
                  {item.label}
                </div>
                <div className="text-xs text-gray-400">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-yellow-400 border-t-4 border-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black uppercase tracking-wider mb-4">
            Don&apos;t Make Us Chase You
          </h2>
          <p className="text-lg mb-8 text-black/80">
            Complete your registration now. Every field matters. Every deadline is real.
            This is how we avoid chaos. Help us help you.
          </p>
          <Link
            href="/intake"
            className="inline-flex items-center px-8 py-4 bg-black text-yellow-400 font-black uppercase tracking-wider text-lg hover:bg-gray-900 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
          >
            Start Registration →
          </Link>
        </div>
      </section>
    </div>
  )
}
