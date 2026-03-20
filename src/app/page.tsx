import Link from 'next/link'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { CountdownTimer } from '@/components/countdown-timer'

const modules = [
  {
    href: '/intake',
    icon: '📝',
    title: 'Register',
    description: 'Start here. 9-step intake form covering identity, shelter, skills, safety, and more.',
    status: 'Required',
    statusColor: 'text-red-600',
  },
  {
    href: '/profile',
    icon: '👤',
    title: 'Your Profile',
    description: 'Your bio, photos, camper details and shift assignments — all in one place.',
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/campers',
    icon: '🐀',
    title: 'Campers Directory',
    description: 'Searchable directory of your fellow Deli Rats. Browse profiles and photos.',
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/map',
    icon: '🏕️',
    title: 'Camp Map',
    description: 'Interactive camp layout with zone assignments and camper placement.',
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/layout-view',
    icon: '🗺️',
    title: 'Camp Layout',
    description: 'Auto-placed shelters on a grid with kitchen, common, and shade zones.',
    status: 'View Only',
    statusColor: 'text-blue-600',
  },
  {
    href: '/events',
    icon: '🗓️',
    title: 'Events Calendar',
    description: 'Pre-burn gatherings, fundraisers, shopping trips, socials — all color-coded.',
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/kitchen',
    icon: '🍳',
    title: 'Kitchen Shifts',
    description: '6 shift categories with role assignments. Sign up and keep the deli running.',
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/schedule',
    icon: '📅',
    title: 'Your Schedule',
    description: "All your shift assignments in one view. Show up. Don't be that person.",
    status: 'Active',
    statusColor: 'text-green-600',
  },
  {
    href: '/build-week',
    icon: '🔨',
    title: 'Build Week',
    description: 'Tasks by phase, resource tracking, issue log, and builder coordination.',
    status: 'Upcoming',
    statusColor: 'text-yellow-600',
  },
]

const amenities = [
  { icon: '💧', text: 'Potable water at multiple fill-up points' },
  { icon: '🚿', text: '3 showers per camper during the Burn including grey-water removal' },
  { icon: '🚽', text: 'Private camp-only porto' },
  { icon: '🍳', text: 'Full kitchen with running water, four 36\" grills, microwave, coffeemakers & more' },
  { icon: '⛺', text: '10.5\' tall shade structure over every tent and most of camp' },
  { icon: '🥪', text: 'Daily meal during the 6 days of food service' },
  { icon: '❄️', text: 'Private air-conditioned 20x40 camp-only sleep & social tent' },
  { icon: '🧊', text: 'Ice machines making 700 lbs of ice per day' },
  { icon: '🌡️', text: 'Public 70° cooling center in a dedicated 20x60 circus tent' },
  { icon: '🥶', text: '30\' refrigerated truck keeps your food & drink at 33°' },
  { icon: '🚲', text: 'Optional on-playa bike rental and return in camp' },
  { icon: '🏙️', text: 'Private 20x40 roof deck with fantastic views of the city' },
  { icon: '🔌', text: 'Power in every tent for charging devices or swamp coolers' },
  { icon: '🤫', text: 'We choose our neighbors — quiet block at night so you can sleep' },
  { icon: '🗑️', text: '30\' covered dumpster' },
]

const tentGuidelines = [
  { people: 'Solo', dimensions: '10 x 10' },
  { people: 'Two People', dimensions: '10 x 12.5' },
  { people: 'Three People', dimensions: '10 x 15' },
  { people: 'Four People', dimensions: '10 x 17.5' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Hero Section */}
      <section className="bg-yellow-400 border-b-4 border-black font-nunito">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="flex items-center justify-between gap-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-black mb-4">
                NYC Deli
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-black/80 mb-2">
                Burning Man 2026 • Black Rock City
              </p>
              <p className="text-lg text-black/70 max-w-2xl mb-8 leading-relaxed">
                Hot New York Deli food on the playa. A 70° cooling center for thousands.
                And a kind, safe home base for your Burning Man adventure. 🥯🥶
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/intake"
                  className="inline-flex items-center px-8 py-4 bg-black text-yellow-400 font-bold tracking-wide text-lg rounded-md hover:bg-gray-900 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  📝 Register Now
                </Link>
                <a
                  href="https://www.instagram.com/campnycdeli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white text-black font-semibold tracking-wide text-sm rounded-md hover:bg-gray-100 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  📸 @campnycdeli
                </a>
              </div>
            </div>
            <div className="hidden md:block flex-shrink-0">
              <Image
                src="/Images/logo.png"
                alt="NYC Deli Rats Logo"
                width={240}
                height={240}
                className="rounded-md"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-400 mb-4">
              Our Mission
            </h2>
            <p className="text-xl md:text-2xl font-medium leading-relaxed">
              Our camp&apos;s gift to playa is <span className="text-yellow-400">hot New York Deli food</span> served 
              for two hours per day, six days during Burning Man — Friday through Sunday. Over the entire 
              Burn, NYC Deli serves nutritious food to approximately <span className="text-yellow-400">5,500 people</span>.
            </p>
            <p className="text-lg text-gray-300 mt-4 leading-relaxed">
              We also provide a public <span className="text-yellow-400">70° cooling center</span> in a dedicated 
              100-person circus tent during daylight hours, cumulatively serving several thousand more 
              burners during the event.
            </p>
            <p className="text-base text-gray-400 mt-6 italic">
              The playa appreciates our camp&apos;s gifts and we have fun delivering them! 🥯🥶
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500">
                🥪 5,500 meals served
              </span>
              <span className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500">
                🥶 Public cooling center
              </span>
              <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500">
                ⛺ ~70 person camp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Camp Overview */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            About Camp
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Camp NYC Deli at Burning Man 2026 will be a ~70 person camp: 70% veteran burners and 
            30% brand new burners. This is by design — to create space on-playa for new burners 
            in a friendly, veteran-majority camp.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-5xl font-black text-yellow-500 mb-2">~70</div>
              <div className="font-bold uppercase tracking-wider text-sm">Campers</div>
              <div className="text-xs text-gray-500 mt-1">Tight-knit community</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-yellow-500 mb-2">70%</div>
              <div className="font-bold uppercase tracking-wider text-sm">Veteran Burners</div>
              <div className="text-xs text-gray-500 mt-1">Experienced playa wisdom</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-yellow-500 mb-2">30%</div>
              <div className="font-bold uppercase tracking-wider text-sm">New Burners</div>
              <div className="text-xs text-gray-500 mt-1">Welcome to the dust</div>
            </div>
          </div>
        </div>
      </section>

      {/* Camp Amenities */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            Camp Amenities
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Camp NYC Deli strives to provide our campers a kind, safe and nurturing home 
            to enable your healthy Burning Man adventure in the desert.
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {amenities.map((item) => (
              <div key={item.text} className="flex items-start gap-3 p-4 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-yellow-50 border-2 border-yellow-400 p-6">
              <h3 className="font-black uppercase text-sm mb-2">RV Services Available</h3>
              <p className="text-sm text-gray-700">
                RVs can be provided power, potable water, and grey-water removal. There will be an 
                additional charge per RV receiving extra services. All vehicles parked in camp require 
                prior discussion with Brian before playa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Camp Fees & Tickets */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-12">
            Camp Fees & Tickets
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Event Week Camper</CardTitle>
                <CardDescription>Arriving for the event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-black mb-4">$900</div>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• All camp amenities included</li>
                  <li>• Daily meal during 6 days of food service</li>
                  <li>• Can be split into two payments: 5/1 and 6/1</li>
                </ul>
              </CardContent>
            </Card>

            <Card variant="success">
              <CardHeader>
                <CardTitle>Builder</CardTitle>
                <CardDescription>22 spots — come early, build camp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-black mb-4">$450</div>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• 50% off camp fee</li>
                  <li>• Free housing at Fernley Build House</li>
                  <li>• Camp transports you, your gear & food to playa</li>
                  <li>• All camp amenities included</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-black p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black uppercase text-sm mb-3">💰 Payment Schedule</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li><strong>Due:</strong> May 1, 2026</li>
                <li><strong>Split option:</strong> Half on 5/1, half on 6/1</li>
              </ul>
            </div>
            <div className="bg-white border-2 border-black p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black uppercase text-sm mb-3">🔄 Refund Policy</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li><strong>Before 7/1:</strong> Full refund on request</li>
                <li><strong>After 7/1:</strong> No refunds — camp has pre-paid OSS vendors</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-blue-50 border-2 border-blue-400 p-6 text-center">
              <h3 className="font-black uppercase text-sm mb-2">🎫 Need a Ticket?</h3>
              <p className="text-sm text-gray-700">
                If you still need a ticket, NYC Deli can help source you a face-value ticket buying 
                opportunity. Tickets are not included with the Camp Fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Arrival & Departure Requirements */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-12">
            Arrival & Departure
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card variant="warning">
              <CardHeader>
                <CardTitle>✈️ Required Arrival</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-bold">
                  All campers must arrive in camp by Event Sunday at 12pm.
                </p>
                <p className="text-sm text-gray-700">
                  For camp cohesion and to give everyone time to get acquainted and enjoy the event.
                </p>
                <div className="bg-yellow-50 p-3 border border-yellow-300 text-sm">
                  <strong>Note:</strong> &ldquo;Weekend Warriors&rdquo; who only want to attend from Wed/Thu through Sunday 
                  cannot meet this requirement.
                </div>
              </CardContent>
            </Card>

            <Card variant="warning">
              <CardHeader>
                <CardTitle>🚪 Required Departure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-bold">
                  All campers must stay through 2pm on Exodus Monday.
                </p>
                <p className="text-sm text-gray-700">
                  To fairly share the work in putting camp back into the containers. Strike is usually 
                  done by 1:30pm. Then campers are transported in our camp dualie to their 4pm or later 
                  Burner Express buses.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-green-50 border-2 border-green-400 p-6">
              <h3 className="font-black uppercase text-sm mb-3">✨ Optional: 1-2 Bonus Days on Playa</h3>
              <p className="text-sm text-gray-700">
                The vast majority of our campers come in on Build Friday or Saturday on the Burner Express 
                Bus. Arriving early means you skip the 3-12 hour gate line on Event Sunday, get an extra 
                24-48 hours to see Black Rock City built, meet your fellow campers, and get acclimated 
                to playa. Highly recommended but optional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tent Guidelines */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            Tent Guidelines
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Camp builds 10.5&apos; tall shade over every tent. To conserve scarce communal shade, 
            here are the maximum tent footprint dimensions (width x length in feet).
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
            {tentGuidelines.map((item) => (
              <div key={item.people} className="text-center bg-white border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-2xl font-black text-yellow-500 mb-1">{item.dimensions}</div>
                <div className="text-xs font-bold uppercase tracking-wider">{item.people}</div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-green-50 border-2 border-green-400 p-4">
              <p className="text-sm text-gray-700">
                <strong>Good news:</strong> Thanks to shade and air conditioning in camp, you do not need 
                an expensive RV, Shiftpod or Bell Tent. A standup Coleman tent or used Kodiak tent are great!
              </p>
            </div>
            <div className="bg-red-50 border-2 border-red-400 p-4">
              <p className="text-sm text-gray-700">
                <strong>Please do not buy</strong> a new Shiftpod or Bell Tent. Each takes up space that 
                4 tents could fit in. If you already own one, we&apos;ll work with it. But please buy a 
                square or rectangular footprint tent if buying new.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Build Week */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            Build Week (Optional)
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            22 of NYC Deli&apos;s 70 campers will build camp. Half-price camp fee, free housing,
            and camp handles your transport logistics.
          </p>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black uppercase text-lg mb-4">Builder Perks</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>$450 camp fee</strong> (half the regular price)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Free housing</strong> at the Fernley Build House prior to the Burn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Camp transports</strong> builders, their gear, and their food into playa</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm uppercase mb-2">Builder Arrival Timeline</h4>
                <p className="text-sm text-gray-700">
                  Fly into Reno Build Sunday or Monday → Uber to Fernley Build House → Go on-playa 
                  Build Tuesday morning. All builders must be at the Fernley Build House by Build Monday 
                  night with all personal shopping completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer Commitment */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-black uppercase tracking-wider mb-4">
              Volunteer Commitment
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              All campers volunteer <strong>three 2.5-hour shifts</strong> during burn week to make
              our playa gift and camp happen. As Burning Man camps go, this is a very reasonable 
              volunteer requirement.
            </p>
            <p className="text-sm text-gray-500 italic">
              You&apos;ll be asked to be sober during your shifts. There&apos;s only three of them.
            </p>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
            Camp System Modules
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Everything you need to manage your burn — registration, shifts, maps, events, and more.
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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { date: 'May 1', label: 'Camp Fees Due', desc: 'First payment' },
              { date: 'Jul 1', label: 'Refund Deadline', desc: 'No refunds after this' },
              { date: 'Aug 23', label: 'Build Week Starts', desc: 'Early arrivals only' },
              { date: 'Aug 30', label: 'Burn Starts', desc: 'Gates open' },
              { date: 'Sep 7', label: 'Exodus Monday', desc: 'Stay through 2pm' },
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

      {/* What Happens After Registration */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-wider text-center mb-8">
            What Happens After Registration
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center font-black text-lg flex-shrink-0">1</div>
              <div>
                <h3 className="font-bold">Registration Reviewed</h3>
                <p className="text-sm text-gray-600">Each entry is reviewed by Camp Lead Brian.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center font-black text-lg flex-shrink-0">2</div>
              <div>
                <h3 className="font-bold">Zoom Interview</h3>
                <p className="text-sm text-gray-600">You&apos;ll get an email to schedule a short 20-30 min Zoom with Brian to talk about your burn.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center font-black text-lg flex-shrink-0">3</div>
              <div>
                <h3 className="font-bold">Photo Album</h3>
                <p className="text-sm text-gray-600">You&apos;ll receive a link to a private Google Photos album with pictures from Burning Man 2025 so you can see what camp looks like and the general vibe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-yellow-400 border-t-4 border-black font-nunito">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Ready to Join?
          </h2>
          <p className="text-lg mb-4 text-black/80 leading-relaxed">
            Friends and partners traveling together must each register individually.
          </p>
          <p className="text-base mb-8 text-black/60 leading-relaxed">
            Complete your registration now. Every field matters. Every deadline is real.
          </p>
          <Link
            href="/intake"
            className="inline-flex items-center px-8 py-4 bg-black text-yellow-400 font-bold tracking-wide text-lg rounded-md hover:bg-gray-900 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
          >
            Start Registration →
          </Link>
        </div>
      </section>
    </div>
  )
}
