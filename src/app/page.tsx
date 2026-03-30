import Link from 'next/link'
import Image from 'next/image'
import { CountdownTimer } from '@/components/countdown-timer'

const modules = [
  {
    href: '/intake',
    icon: '📝',
    title: 'Register',
    description: 'Start here. 9-step intake covering identity, arrival, shelter, infrastructure, participation, skills, build week, safety, and bio.',
    status: 'Required',
    statusColor: 'text-red-400',
  },
  {
    href: '/profile',
    icon: '👤',
    title: 'Your Profile',
    description: 'Four-tab hub: bio & photo uploads, camper details, your personal shift schedule, and the full team schedule.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/campers',
    icon: '🐀',
    title: 'Campers Directory',
    description: 'Search by name, playa name, or email. View photos, bios, shelter info, and build week / kitchen participation.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/map',
    icon: '🏕️',
    title: 'Camp Map',
    description: 'Interactive camp map with spot selection, zone assignments, and real-time camper placement.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/layout-view',
    icon: '🗺️',
    title: 'Camp Layout',
    description: 'Zoomable 2D grid view with layer toggles for tents, shade, kitchen, and zones — color-coded by shelter type.',
    status: 'View Only',
    statusColor: 'text-blue-400',
  },
  {
    href: '/events',
    icon: '🗓️',
    title: 'Events Calendar',
    description: 'Pre-burn gatherings, fundraisers, shopping trips, and socials — color-coded across 6 event categories.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/kitchen',
    icon: '🍳',
    title: 'Kitchen Shifts',
    description: 'Sign-up sheet, role definitions, shift coverage, and scheduling across deli, prep, grill, assembly, runners, and more.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/schedule',
    icon: '📅',
    title: 'Your Schedule',
    description: 'All Shifts and My Schedule tabs with email lookup, status badges, and date/time sorting. Show up.',
    status: 'Active',
    statusColor: 'text-green-400',
  },
  {
    href: '/build-week',
    icon: '🔨',
    title: 'Build Week',
    description: 'Four tabs: phased tasks with progress tracking, resource management, issue log, and builder coordination info.',
    status: 'Upcoming',
    statusColor: 'text-yellow-400',
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
    <div className="min-h-screen bg-[#111]">
      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Hero — Graffiti deli mural (street1.jpg) */}
      <section className="relative overflow-hidden nyc-photo-section">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Images/nyc/street1.jpg')" }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 md:py-36">
          <div className="flex items-center justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-block mb-4 px-3 py-1 bg-[#fccc0a] text-black text-xs font-black uppercase tracking-[0.3em]">
                Est. Black Rock City
              </div>
              <h1 className="text-6xl md:text-8xl font-graffiti tracking-tight text-[#fccc0a] nyc-spray mb-2">
                NYC DELI
              </h1>
              <div className="nyc-tag-stripe w-56 mb-6" />
              <p className="text-xl md:text-2xl font-semibold text-white nyc-stencil mb-2">
                Burning Man 2026 &bull; Black Rock City
              </p>
              <p className="text-lg text-gray-200 max-w-2xl mb-8 leading-relaxed">
                Hot New York Deli food on the playa. A 70&deg; cooling center for thousands.
                And a kind, safe home base for your Burning Man adventure.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/intake"
                  className="inline-flex items-center px-8 py-4 bg-[#fccc0a] text-black font-black tracking-wide text-lg uppercase hover:bg-[#ffd93d] transition-all border-2 border-[#fccc0a] shadow-[4px_4px_0px_0px_rgba(252,204,10,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(252,204,10,0.4)] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  Register Now
                </Link>
                <a
                  href="https://www.instagram.com/campnycdeli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-transparent text-white font-semibold tracking-wide text-sm hover:bg-white/10 transition-all border-2 border-white/60 hover:border-white"
                >
                  @campnycdeli
                </a>
              </div>
            </div>
            <div className="hidden md:block flex-shrink-0">
              <div className="p-3 border-2 border-white/20 bg-black/50 backdrop-blur-sm rotate-2 hover:rotate-0 transition-transform">
                <Image
                  src="/Images/logo.png"
                  alt="NYC Deli Rats Logo"
                  width={240}
                  height={240}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rainbow tag stripe divider */}
      <div className="nyc-tag-stripe" />

      {/* Our Mission — Concrete wall with grime */}
      <section className="relative nyc-grime nyc-concrete-wall py-14">
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="nyc-stripe w-24 mx-auto mb-4" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#fccc0a] mb-4">
              Our Mission
            </h2>
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-100">
              Our camp&apos;s gift to playa is <span className="text-[#fccc0a] nyc-neon-subtle">hot New York Deli food</span> served 
              for two hours per day, six days during Burning Man — Friday through Sunday. Over the entire 
              Burn, NYC Deli serves nutritious food to approximately <span className="text-[#fccc0a] nyc-neon-subtle">5,500 people</span>.
            </p>
            <p className="text-lg text-gray-300 mt-4 leading-relaxed">
              We also provide a public <span className="text-[#fccc0a]">70&deg; cooling center</span> in a dedicated 
              100-person circus tent during daylight hours, cumulatively serving several thousand more 
              burners during the event.
            </p>
            <p className="text-base text-gray-400 mt-6 italic">
              The playa appreciates our camp&apos;s gifts and we have fun delivering them!
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/40">
                5,500 meals served
              </span>
              <span className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/40">
                Public cooling center
              </span>
              <span className="px-4 py-2 bg-yellow-500/10 text-[#fccc0a] border border-yellow-500/40">
                ~70 person camp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Food graffiti wall break (street2.jpg) */}
      <section className="relative overflow-hidden nyc-photo-section h-64 md:h-80">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Images/nyc/street2.jpg')" }}
        />
        <div className="relative z-10 flex items-center justify-center h-full">
          <h2 className="font-graffiti text-4xl md:text-6xl text-[#fccc0a] nyc-spray tracking-wider">
            FOOD IS LOVE
          </h2>
        </div>
      </section>

      <div className="nyc-tag-stripe" />

      {/* Camp Overview — Brick wall */}
      <section className="relative py-16 px-4 nyc-brick-wall nyc-grime">
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
            About Camp
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            Camp NYC Deli at Burning Man 2026 will be a ~70 person camp: 70% veteran burners and 
            30% brand new burners. This is by design — to create space on-playa for new burners 
            in a friendly, veteran-majority camp.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-black/70 border border-white/10 backdrop-blur-sm nyc-poster">
              <div className="text-5xl font-black text-[#fccc0a] mb-2 nyc-neon-subtle">~70</div>
              <div className="font-black uppercase tracking-[0.2em] text-sm text-white">Campers</div>
              <div className="text-xs text-gray-400 mt-1">Tight-knit community</div>
            </div>
            <div className="text-center p-6 bg-black/70 border border-white/10 backdrop-blur-sm nyc-poster">
              <div className="text-5xl font-black text-[#fccc0a] mb-2 nyc-neon-subtle">70%</div>
              <div className="font-black uppercase tracking-[0.2em] text-sm text-white">Veteran Burners</div>
              <div className="text-xs text-gray-400 mt-1">Experienced playa wisdom</div>
            </div>
            <div className="text-center p-6 bg-black/70 border border-white/10 backdrop-blur-sm nyc-poster">
              <div className="text-5xl font-black text-[#fccc0a] mb-2 nyc-neon-subtle">30%</div>
              <div className="font-black uppercase tracking-[0.2em] text-sm text-white">New Burners</div>
              <div className="text-xs text-gray-400 mt-1">Welcome to the dust</div>
            </div>
          </div>
        </div>
      </section>

      {/* Camp Amenities — Deli Menu Board */}
      <section className="relative py-16 px-4 nyc-tagged nyc-grime bg-[#111]">
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
            Camp Amenities
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            Camp NYC Deli strives to provide our campers a kind, safe and nurturing home 
            to enable your healthy Burning Man adventure in the desert.
          </p>
          
          <div className="max-w-5xl mx-auto nyc-menu-board p-6 md:p-10 relative">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 nyc-awning h-3 w-full max-w-[calc(100%-16px)] opacity-80" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {amenities.map((item) => (
                <div key={item.text} className="flex items-start gap-3 p-3 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <span className="text-sm font-medium nyc-chalk">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-yellow-500/10 border-2 border-[#fccc0a]/40 p-6">
              <h3 className="font-black uppercase text-sm mb-2 text-[#fccc0a]">RV Services Available</h3>
              <p className="text-sm text-gray-300">
                RVs can be provided power, potable water, and grey-water removal. There will be an 
                additional charge per RV receiving extra services. All vehicles parked in camp require 
                prior discussion with Brian before playa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="nyc-tag-stripe" />

      {/* Camp Fees & Tickets — Concrete wall */}
      <section className="relative py-16 px-4 nyc-concrete-wall nyc-grime nyc-drips">
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-12 text-[#fccc0a] nyc-stencil">
            Camp Fees &amp; Tickets
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-black/80 border-2 border-white/10 p-6 nyc-poster">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full nyc-line-yellow" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Event Week</span>
              </div>
              <h3 className="text-xl font-black text-white mb-1">Event Week Camper</h3>
              <p className="text-sm text-gray-400 mb-4">Arriving for the event</p>
              <div className="text-4xl font-black text-[#fccc0a] mb-4 nyc-neon-subtle">$900</div>
              <ul className="text-sm space-y-2 text-gray-300">
                <li>All camp amenities included</li>
                <li>Daily meal during 6 days of food service</li>
                <li>Can be split into two payments: 5/1 and 6/1</li>
              </ul>
            </div>

            <div className="bg-black/80 border-2 border-green-500/30 p-6 nyc-poster">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full nyc-line-green" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Builder</span>
              </div>
              <h3 className="text-xl font-black text-white mb-1">Builder</h3>
              <p className="text-sm text-gray-400 mb-4">22 spots — come early, build camp</p>
              <div className="text-4xl font-black text-green-400 mb-4">$450</div>
              <ul className="text-sm space-y-2 text-gray-300">
                <li>50% off camp fee</li>
                <li>Free housing at Fernley Build House</li>
                <li>Camp transports you, your gear &amp; food to playa</li>
                <li>All camp amenities included</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <div className="bg-black/70 border border-white/10 p-6">
              <h3 className="font-black uppercase text-sm mb-3 text-[#fccc0a]">Payment Schedule</h3>
              <ul className="text-sm space-y-2 text-gray-300">
                <li><strong className="text-white">Due:</strong> May 1, 2026</li>
                <li><strong className="text-white">Split option:</strong> Half on 5/1, half on 6/1</li>
              </ul>
            </div>
            <div className="bg-black/70 border border-white/10 p-6">
              <h3 className="font-black uppercase text-sm mb-3 text-[#fccc0a]">Refund Policy</h3>
              <ul className="text-sm space-y-2 text-gray-300">
                <li><strong className="text-white">Before 7/1:</strong> Full refund on request</li>
                <li><strong className="text-white">After 7/1:</strong> No refunds — camp has pre-paid OSS vendors</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-blue-500/10 border border-blue-400/30 p-6 text-center">
              <h3 className="font-black uppercase text-sm mb-2 text-blue-400">Need a Ticket?</h3>
              <p className="text-sm text-gray-300">
                If you still need a ticket, NYC Deli can help source you a face-value ticket buying 
                opportunity. Tickets are not included with the Camp Fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Arrival & Departure — Subway tile wall (subway-tile.jpg) */}
      <section className="relative py-16 px-4 overflow-hidden nyc-photo-section">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Images/nyc/subway-tile.jpg')" }}
        />
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-12 text-[#fccc0a] nyc-stencil">
            Arrival &amp; Departure
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-black/80 border-l-4 border-[#fccc0a] p-6 backdrop-blur-sm">
              <h3 className="text-lg font-black text-[#fccc0a] mb-3">Required Arrival</h3>
              <p className="text-sm font-bold text-white">
                All campers must arrive in camp by Event Sunday at 12pm.
              </p>
              <p className="text-sm text-gray-300 mt-3">
                For camp cohesion and to give everyone time to get acquainted and enjoy the event.
              </p>
              <div className="bg-yellow-500/10 p-3 border border-[#fccc0a]/30 text-sm text-gray-200 mt-3">
                <strong className="text-[#fccc0a]">Note:</strong> &ldquo;Weekend Warriors&rdquo; who only want to attend from Wed/Thu through Sunday 
                cannot meet this requirement.
              </div>
            </div>

            <div className="bg-black/80 border-l-4 border-[#ff6319] p-6 backdrop-blur-sm">
              <h3 className="text-lg font-black text-[#ff6319] mb-3">Required Departure</h3>
              <p className="text-sm font-bold text-white">
                All campers must stay through 2pm on Exodus Monday.
              </p>
              <p className="text-sm text-gray-300 mt-3">
                To fairly share the work in putting camp back into the containers. Strike is usually 
                done by 1:30pm. Then campers are transported in our camp dualie to their 4pm or later 
                Burner Express buses.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-black/80 border-l-4 border-green-500 p-6 backdrop-blur-sm">
              <h3 className="font-black uppercase text-sm mb-3 text-green-400">Optional: 1-2 Bonus Days on Playa</h3>
              <p className="text-sm text-gray-200">
                The vast majority of our campers come in on Build Friday or Saturday on the Burner Express 
                Bus. Arriving early means you skip the 3-12 hour gate line on Event Sunday, get an extra 
                24-48 hours to see Black Rock City built, meet your fellow campers, and get acclimated 
                to playa. Highly recommended but optional.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="nyc-tag-stripe" />

      {/* Tent Guidelines — Dark industrial */}
      <section className="py-16 px-4 bg-[#111]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
            Tent Guidelines
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            Camp builds 10.5&apos; tall shade over every tent. To conserve scarce communal shade, 
            here are the maximum tent footprint dimensions (width x length in feet).
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
            {tentGuidelines.map((item) => (
              <div key={item.people} className="text-center bg-[#1a1a1a] border border-white/10 p-4 hover:border-[#fccc0a]/50 transition-colors nyc-poster">
                <div className="text-2xl font-black text-[#fccc0a] mb-1 nyc-neon-subtle">{item.dimensions}</div>
                <div className="text-xs font-black uppercase tracking-[0.15em] text-gray-300">{item.people}</div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 p-4">
              <p className="text-sm text-gray-200">
                <strong className="text-green-400">Good news:</strong> Thanks to shade and air conditioning in camp, you do not need 
                an expensive RV, Shiftpod or Bell Tent. A standup Coleman tent or used Kodiak tent are great!
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 p-4">
              <p className="text-sm text-gray-200">
                <strong className="text-red-400">Please do not buy</strong> a new Shiftpod or Bell Tent. Each takes up space that 
                4 tents could fit in. If you already own one, we&apos;ll work with it. But please buy a 
                square or rectangular footprint tent if buying new.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Build Week — Graffiti hero with spray splatters */}
      <section className="relative py-16 px-4 nyc-graffiti-hero nyc-grime nyc-drips">
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
            Build Week (Optional)
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            22 of NYC Deli&apos;s 70 campers will build camp. Half-price camp fee, free housing,
            and camp handles your transport logistics.
          </p>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-black/70 border-2 border-[#fccc0a]/30 p-6 nyc-poster backdrop-blur-sm">
              <h3 className="font-black uppercase text-lg mb-4 text-[#fccc0a]">Builder Perks</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">&#10003;</span>
                  <span><strong className="text-white">$450 camp fee</strong> (half the regular price)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">&#10003;</span>
                  <span><strong className="text-white">Free housing</strong> at the Fernley Build House prior to the Burn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">&#10003;</span>
                  <span><strong className="text-white">Camp transports</strong> builders, their gear, and their food into playa</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="font-bold text-sm uppercase mb-2 text-[#fccc0a]">Builder Arrival Timeline</h4>
                <p className="text-sm text-gray-300">
                  Fly into Reno Build Sunday or Monday &rarr; Uber to Fernley Build House &rarr; Go on-playa 
                  Build Tuesday morning. All builders must be at the Fernley Build House by Build Monday 
                  night with all personal shopping completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer Commitment — Tagged wall with color splashes */}
      <section className="relative py-16 px-4 nyc-tagged bg-[#111]">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="nyc-stripe w-24 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-4 text-[#fccc0a] nyc-stencil">
              Volunteer Commitment
            </h2>
            <p className="text-lg text-gray-200 mb-6">
              All campers volunteer <strong className="text-[#fccc0a]">three 2.5-hour shifts</strong> during burn week to make
              our playa gift and camp happen. As Burning Man camps go, this is a very reasonable 
              volunteer requirement.
            </p>
            <p className="text-sm text-gray-500 italic">
              You&apos;ll be asked to be sober during your shifts. There&apos;s only three of them.
            </p>
          </div>
        </div>
      </section>

      <div className="nyc-tag-stripe" />

      {/* Modules Grid — Brick wall with poster cards */}
      <section className="relative py-16 px-4 nyc-brick-wall nyc-grime">
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
            Camp System Modules
          </h2>
          <p className="text-center text-gray-300 mb-12">
            Nine modules to manage your burn — registration, profile, directory, maps, events, kitchen, schedule, and build week.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, i) => (
              <Link key={module.href} href={module.href} className="group">
                <div
                  className="h-full bg-black/80 border border-white/10 p-6 nyc-poster"
                  style={{ transform: `rotate(${i % 2 === 0 ? '-0.5' : '0.5'}deg)` }}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-4xl">{module.icon}</span>
                    <span className={`text-xs font-black uppercase ${module.statusColor}`}>
                      {module.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">{module.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{module.description}</p>
                  <span className="inline-block mt-4 text-sm font-bold text-[#fccc0a] group-hover:text-[#ffd93d]">
                    Go to {module.title} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Important Dates — Subway schedule board */}
      <section className="bg-[#0a0a0a] py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center text-[#fccc0a] mb-12 nyc-neon-subtle">
            Critical Dates
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { date: 'May 1', label: 'Camp Fees Due', desc: 'First payment', line: 'nyc-line-yellow' },
              { date: 'Jul 1', label: 'Refund Deadline', desc: 'No refunds after this', line: 'nyc-line-red' },
              { date: 'Aug 23', label: 'Build Week Starts', desc: 'Early arrivals only', line: 'nyc-line-green' },
              { date: 'Aug 30', label: 'Burn Starts', desc: 'Gates open', line: 'nyc-line-orange' },
              { date: 'Sep 7', label: 'Exodus Monday', desc: 'Stay through 2pm', line: 'nyc-line-purple' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={`w-8 h-8 rounded-full ${item.line} mx-auto mb-3 flex items-center justify-center`}>
                  <div className="w-4 h-4 rounded-full bg-[#0a0a0a]" />
                </div>
                <div className="text-3xl font-black text-white mb-2">
                  {item.date}
                </div>
                <div className="font-black uppercase tracking-[0.15em] text-sm mb-1 text-gray-300">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="nyc-tag-stripe" />

      {/* What Happens After Registration */}
      <section className="relative py-16 px-4 nyc-concrete-wall nyc-grime">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-8 text-[#fccc0a] nyc-stencil">
            What Happens After Registration
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#fccc0a] flex items-center justify-center font-black text-lg text-black flex-shrink-0">1</div>
              <div>
                <h3 className="font-bold text-white">Registration Reviewed</h3>
                <p className="text-sm text-gray-400">Each entry is reviewed by Camp Lead Brian.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#fccc0a] flex items-center justify-center font-black text-lg text-black flex-shrink-0">2</div>
              <div>
                <h3 className="font-bold text-white">Zoom Interview</h3>
                <p className="text-sm text-gray-400">You&apos;ll get an email to schedule a short 20-30 min Zoom with Brian to talk about your burn.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#fccc0a] flex items-center justify-center font-black text-lg text-black flex-shrink-0">3</div>
              <div>
                <h3 className="font-bold text-white">Photo Album</h3>
                <p className="text-sm text-gray-400">You&apos;ll receive a link to a private Google Photos album with pictures from Burning Man 2025 so you can see what camp looks like and the general vibe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Graffiti bodega awning */}
      <section className="relative py-16 px-4 overflow-hidden font-nunito">
        <div className="absolute inset-0 bg-[#fccc0a]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }} />
        <div className="nyc-awning h-2 absolute top-0 left-0 right-0" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-black">
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
            className="inline-flex items-center px-8 py-4 bg-black text-[#fccc0a] font-black tracking-wide text-lg uppercase hover:bg-gray-900 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
          >
            Start Registration &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}
