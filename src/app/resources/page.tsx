'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ResourceEditRow } from '@/types/database'
import BrcDirectory from '@/components/brc-directory'
import WhatsOn from '@/components/whats-on'

/* ------------------------------------------------------------------ */
/*  Data types                                                        */
/* ------------------------------------------------------------------ */
type ResourceCategory =
  | 'burning-man-101'
  | 'packing'
  | 'camp-info'
  | 'camp-amenities'
  | 'volunteering'
  | 'community'
  | 'videos'
  | 'external-links'

interface Resource {
  title: string
  slug?: string
  category: ResourceCategory
  content: string
  tags: string[]
  link?: string
}

/* ------------------------------------------------------------------ */
/*  Category metadata                                                 */
/* ------------------------------------------------------------------ */
const CATEGORIES: Record<ResourceCategory, { label: string; icon: string; color: string }> = {
  'burning-man-101': { label: 'Burning Man 101', icon: '🔥', color: 'bg-orange-200 text-orange-800' },
  packing: { label: 'Packing & Prep', icon: '🎒', color: 'bg-blue-200 text-blue-800' },
  'camp-info': { label: 'NYC Deli Camp Info', icon: '🥪', color: 'bg-yellow-200 text-yellow-800' },
  'camp-amenities': { label: 'Camp Amenities', icon: '🏕️', color: 'bg-green-200 text-green-800' },
  volunteering: { label: 'Volunteering & Shifts', icon: '🤝', color: 'bg-purple-200 text-purple-800' },
  community: { label: 'Community & Guidelines', icon: '❤️', color: 'bg-pink-200 text-pink-800' },
  videos: { label: 'Videos & Media', icon: '🎬', color: 'bg-red-200 text-red-800' },
  'external-links': { label: 'External Links', icon: '🔗', color: 'bg-gray-200 text-gray-800' },
}

/* ------------------------------------------------------------------ */
/*  Resources data                                                    */
/* ------------------------------------------------------------------ */
const RESOURCES: Resource[] = [
  /* ---- Burning Man 101 ---- */
  {
    title: 'The 10 Principles of Burning Man',
    category: 'burning-man-101',
    tags: ['principles', 'culture', 'values', 'etiquette'],
    content: `
1. **Radical Inclusion** — Anyone may be a part of Burning Man.
2. **Gifting** — Burning Man is devoted to the act of gift giving. Gifts are unconditional.
3. **Decommodification** — No commercial sponsorships, transactions, or advertising.
4. **Radical Self-Reliance** — Discover, exercise, and rely on your inner resources.
5. **Radical Self-Expression** — No one other than the individual can determine its content. Respect the rights and liberties of others.
6. **Communal Effort** — Creative cooperation and collaboration.
7. **Civic Responsibility** — Assume responsibility for public welfare.
8. **Leaving No Trace** — Leave the land in a better state than when you found it.
9. **Participation** — Transformative change can occur only through deeply personal participation.
10. **Immediacy** — Immediate experience is the most important touchstone of value.`,
  },
  {
    title: 'What Is Burning Man?',
    category: 'burning-man-101',
    tags: ['overview', 'intro', 'first-time', 'new burner', '2026'],
    content: `Burning Man is an annual gathering in the Black Rock Desert of Nevada, creating a temporary city (Black Rock City) dedicated to community, art, self-expression, and self-reliance. **Burning Man 2026 by the numbers:** 1,400 theme camps, 5,000 art pieces, and 1,000 art cars (Mutant Vehicles). Attendance is expected to be ~80,000 cumulative across Build Week and the event. Burning Man typically runs for a week at the end of August through early September.`,
  },
  {
    title: 'Black Rock City Survival Guide',
    category: 'burning-man-101',
    tags: ['survival', 'safety', 'first-time', 'heat', 'dust', 'whiteouts'],
    content: `Key survival tips for the playa:
• **Hydrate constantly** — Drink at least 1.5 gallons of water per day.
• **Dust storms (whiteouts)** — Always carry goggles and a dust mask. When a whiteout hits, stop, sit down, cover your face, and wait it out.
• **Sun protection** — Wear sunscreen (SPF 50+), a wide-brim hat, and UV-blocking sunglasses.
• **Temperature swings** — Days can reach 100°F+ while nights drop to the 40s°F. Layer up!
• **Playa foot** — Keep your feet dry. Playa dust is alkaline and can cause chemical burns. Rinse and moisturize feet daily.
• **Buddy system** — Use it, especially at night. Tell someone where you're going.`,
  },
  {
    title: 'MOOP — Matter Out Of Place',
    category: 'burning-man-101',
    tags: ['moop', 'leave no trace', 'trash', 'cleanup', 'environment'],
    content: `Leave No Trace is a core principle. MOOP is anything on the ground that shouldn't be there — glitter, cigarette butts, feathers, zip tie ends, sequins, etc.
• **Avoid bringing MOOP-prone items**: glitter, loose feathers, styrofoam, confetti.
• **Carry a MOOP bag** at all times to pick up debris.
• **MOOP sweep** your camp area daily.
• Our camp provides contractor trash bags, two large trash cans, and a 30-foot dumpster.`,
  },

  /* ---- Packing ---- */
  {
    title: 'Packing Philosophy',
    category: 'packing',
    tags: ['packing', 'philosophy', 'self-reliance', 'preparation'],
    content: `"Radical Self-Reliance" — Pack for Shelter, Survival, and Style. Think in three categories:
• **Must Have** — survival essentials
• **Nice to Have** — comfort items
• **Optional** — fun extras
Remember the gifting culture: bring gifts, not barter items. And don't duplicate items NYC Deli already provides (kitchen, shade, electricity, etc.).`,
  },
  {
    title: 'Absolute Essentials Packing List',
    category: 'packing',
    tags: ['packing list', 'essentials', 'ticket', 'water', 'shelter', 'goggles', 'mask'],
    content: `**Documents & Entry**
• Ticket, vehicle/car pass, government ID

**Water & Hydration**
• 1.5 liters minimum for the bus/car trip in
• Electrolyte packets, reusable water bottle/CamelBak

**Shelter & Sleep**
• Tent or structure (camp provides 10.5' shade over your tent & a tarp underneath)
• Sleeping bag rated to 30°F, sleeping pad or air mattress, pillow

**Dust Protection**
• Goggles (ski/swim goggles work great)
• Dust masks / N95 respirators
• Lip balm with SPF

**Lighting & Safety**
• Headlamp with extra batteries
• EL wire or LED lights for your body & bike at night
• Bike lock & bike lights (front + back)

**Food & Drink**
• Personal food (camp provides breakfast Mon–Sat when serving)
• Cooler or containers for ice
• Reusable plate, cup, utensils`,
  },
  {
    title: 'Clothing & Costumes Guide',
    category: 'packing',
    tags: ['clothing', 'costumes', 'layers', 'boots', 'what to wear'],
    content: `**Practical Basics**
• Layers: light daywear + warm night layers (fleece, hoodie)
• Multiple pairs of socks (feet get dusty)
• Comfortable closed-toe boots for walking on playa
• Sun hat or wide-brim hat

**Fun Stuff**
• "Wow" outfits, accessories, costumes
• LED/glow accessories for nighttime visibility
• Faux fur coats for cold nights

**Hygiene**
• Body wipes (for days you skip the shower)
• Playa foot prep: vinegar rinse, moisturizer
• Sunscreen SPF 50+

**DO NOT BRING**
• Glitter (MOOP nightmare)
• Loose feathers (MOOP)
• Native American headdresses (culturally insensitive)
• Blackface (absolutely not)`,
  },
  {
    title: 'Gifting & Community Guide',
    category: 'packing',
    tags: ['gifting', 'gifts', 'community', 'playa gifts'],
    content: `What makes a great playa gift? **Uniqueness, utility, and sincerity.**

**Great gift ideas:**
• Homemade snacks or treats
• Acts of service (helping someone set up camp, giving directions)
• Charm, conversation, and genuine connection
• Music — play an instrument or DJ
• Cold drinks on a hot day
• Handmade jewelry, stickers, or small art pieces
• Sunscreen application help
• Misting with a spray bottle

Remember: Burning Man has a **gifting economy**, not a barter economy. Give freely without expectation of return.`,
  },
  {
    title: 'Pre-Departure & Re-Entry Tips',
    category: 'packing',
    tags: ['departure', 'packing tips', 're-entry', 'decompression', 'rental car'],
    content: `**Packing Tips**
• Label everything — bins, bags, gear
• Use 27-gallon HDX tubs for NYC Container ($50 each)
• Take a photo of your packed setup for reference

**Re-Entry & Decompression**
• Plan for decompression — the "real world" feels weird after the burn
• Connect with campmates who understand the experience
• Expect to be dusty and tired for days

**Rental Cars**
• Clean your rental car THOROUGHLY — playa dust gets everywhere
• Budget for a deep-clean car wash
• Some rental companies charge hundreds for excessive dust/dirt`,
  },

  /* ---- Camp Info ---- */
  {
    title: 'NYC Deli Camp History',
    category: 'camp-info',
    tags: ['history', 'camp', 'loveburn', 'brian', 'founding'],
    content: `Brian started NYC Deli at LoveBurn 2022 and the camp has attended LoveBurn and Burning Man every year since. The playa loves our food gift and we have a lot of fun giving it!

**Two concrete examples of how much Burning Man & LoveBurn appreciate us and our playa gift:**
• **LoveBurn Miami** gives NYC Deli ½-price tickets — we're the only camp that gets that.
• **BMORG (Burning Man Org)** told NYC Deli to "just do it, we trust you" when it comes to running our city block. Usually a Camp Lead has to ask BMORG Placement permission for nearly anything — getting a "blank check" from Placement is unheard of for BM camps, and an implicit vote of confidence in how NYC Deli ran its superblock in 2024-2025.`,
  },
  {
    title: 'Camp Size & Recruiting',
    category: 'camp-info',
    tags: ['camp size', 'campers', 'recruiting', 'population', 'waitlist'],
    content: `**Recruiting Update:** NYC Deli has **80 campers signed up**. Historically ~70 will actually go by the time late August comes. The Google Form for camp registration is still open as a **waitlist**.

We strive to bring exactly the number of campers needed to fulfill our service-promise and gifts to playa: no more, no less.

**Why ~70-80 people?** That's the number of kind, dedicated volunteers required to make camp work with **3× 2.5-hour volunteer shifts per person** during the event. As Burning Man camps go, that's not a lot of work — many camps want far more volunteer hours from you, and often campers don't find that out until they're already in the desert. NYC Deli tries to be straightforward about work because Brian has been in camps that worked him to proverbial death.

**Gentle disclaimer:** The 3× 2.5-hour shift commitment is exclusive of Build and Strike. Choosing to come in early for Build is optional, and everyone participates in Strike.`,
  },
  {
    title: 'HUBS — Humans Uniting for Better Sustainability',
    category: 'camp-info',
    tags: ['hubs', 'sister camps', 'infrastructure', 'cost sharing', 'village', 'sustainability'],
    content: `HUBS (Humans Uniting for Better Sustainability) is a fancy backronym for NYC Deli's infrastructure cost-sharing model: one BM camp with a lot of infrastructure (us) cost-shares that backend gear with other camps — saving everyone money and reducing the number of heavy vehicles that come to playa, which is safer and greener.

**Key facts:**
• **7 HUBS sister camps** share infrastructure costs, keeping our camp fee at $900 ($450 for Builders arriving before Build Tuesday)
• Our set of amenities in other camps usually costs ~$2,500
• BMORG knows about this and has approved what we're doing
• HUBS sister camp members are their own camps — they won't be walking through NYC Deli willy-nilly. HUBS Camp Leads may walk around our camp to find Brian or Beck.
• For veteran Burners: HUBS replaced Villages. Villages have been history since 2024.

**Heads-up about discretion:** When talking to outside-of-camp burners on-playa, be careful about going too far talking about NYC Deli's amenities. Many BM camps and especially open campers have very spartan home-bases. Be kind, use your judgement, and please avoid rubbing it in their face that we have amenities like a private bathroom and showers.`,
  },
  {
    title: 'Camp Fees & Refund Policy',
    category: 'camp-info',
    tags: ['fees', 'camp fees', 'refund', 'payment', 'deadline', 'money'],
    content: `**Camp Fee:** $900 ($450 for Builders arriving before Build Tuesday)

Thank you everyone for paying camp fees promptly. This lets Brian pay vendors early — they appreciate it, and vendor appreciation leads to enhanced service on-playa (e.g. United pumps the rented portos of their earliest payers first; they made that explicit this year).

**Payment Deadlines:**
• Camp fees can be split into two payments: 5/1 and 6/1
• For campers who paid half their camp fee already, the **second half is due 6/1**

**Refund Policy:**
• **No refunds after 7/1** — camp fee money is already with vendors by 7/1
• To request a refund, DM Brian

**Where do your camp fees go?** Representative sample of major purchases for camp:
• **10,000 gallons** of potable water + **3,000-gallon water tank rental** (Temen Logistics)
• Rented Porto + daily cleaning/pumping service (United Site Services)
• 100 high-quality NYC Deli aprons (Broken Arrow Printing)
• To/from playa transport of 4× 20' storage containers + annual storage and access at Peik Construction in West Reno
• Annual service visits for the camp dualie pickup truck, refrigerated truck, and towed 125 kW generator
• Insurance for the vehicles`,
  },
  {
    title: 'What Camp Brings to Playa — Big Logistics',
    category: 'camp-info',
    tags: ['logistics', 'truck', 'generator', 'water tank', 'containers', 'shade'],
    content: `NYC Deli brings serious infrastructure:
• 4× 20'×8'×8' full storage containers
• **Treats** — the 30-foot refrigerated truck
• **DUA-LIPA** — the dualie pickup truck
• 1× **125 kW** generator + heavy distribution gear
• 1× 3,000-gallon water tank + 1× 1,500-gallon backup tank
• 1,000 gallons of grey-water capacity
• Camp shade over all tents, kitchen, eating, and activity areas`,
  },
  {
    title: 'SparklePony Express — Camp Art Car',
    category: 'camp-info',
    tags: ['art car', 'sparklepony', 'mutant vehicle', 'lucifer', 'paul dedood'],
    content: `NYC Deli hosts an art car! The **SparklePony Express** is a sparkly unicorn built atop a jumbo electric golf cart, seating 4-5 passengers. She belongs to NYC Deli camper Lucifer (Paul DeDood).

• Lucifer decides anything to do with the SparklePony
• He has been known to offer rides and even playa tours to Deli campers who are helpful and ask nicely!

Over 500 Mutant Vehicles (art/sound cars) attend Burning Man each year.`,
  },
  {
    title: 'Bike Rentals — Dust Rentals',
    category: 'camp-info',
    tags: ['bike', 'bicycle', 'rental', 'dust rentals', 'transportation', 'e-bike', 'mechanic'],
    content: `NYC Deli will offer optional bikes picked up and dropped off in camp again — this will be our **3rd year** offering this. We'll be renting from **Dust Rentals** again.

**Important:** The Burning Man 2026 order page on Dust Rentals' site is not live yet. Brian will let everyone know when the rental option is available to buy.

**Sizing:**
• Riders **5'3" or taller** → default **medium** bike size works
• Riders **shorter than 5'3"** → order a **small** bike

**Cost & deposit:**
• Each rental charges a **$100 refundable-within-30-days security deposit**
• You provide your own lock — any lock will do, it does not need to be NYC-level

**Buy vs. rent:** Renting is the convenience play — you avoid the big hassle of getting a bike into and out of Black Rock City.

**Bike mechanics — free rental:** This year **one free bike rental** will go to any bike mechanic among us who is willing to help campers fix their bikes if they break. Camp also has a bike repair kit in **Tooltown**, the 20' storage container devoted to tools.

**E-Bikes & E-Trikes:** Available for rental too, but pricing is high. You must be **5'3" or taller** to use them (otherwise your feet won't reach the ground).

**On-playa tips:**
• Always lock your bike — bike theft is real on playa
• Add lights (front + back) for night visibility — it's required in BRC
• If you miss the rental deadline, DM Brian — he has a side-deal with Dust Rentals to ensure nobody is left behind`,
  },

  /* ---- Amenities ---- */
  {
    title: 'Full Camp Amenities List',
    category: 'camp-amenities',
    tags: ['amenities', 'kitchen', 'shower', 'electricity', 'shade', 'tent'],
    content: `**Kitchen & Food**
• Refrigerated box truck with 17-gallon bins for food/drink storage
• Full kitchen with running hot & cold water + grey-water disposal
• Two twin-burner electric stoves, two coffeemakers, two microwaves, air convection oven
• Kitchen implements and 3 sets of pots & pans
• Daily breakfast Mon–Sat on service days

**Comfort & Shelter**
• 10.5' shade over your tent + tarp under your tent
• **Siberia:** 20×30 chill tent kept at 70°F during the day, optionally heated at night (camp use)
• **Staten Island:** 20×40 chill tent kept at 70°F during the day (public use)
• Full-length mirrors in chill tents
• 40×40 roof deck for camp use

**Hygiene**
• 3 heated showers in a private side-opening container (daily for Builders)
• Mirror and sink with running water in shower container
• Private camp porto cleaned and pumped daily

**Utilities**
• Electricity throughout camp
• Electricity in your tent (bring an outdoor-rated extension cord)
• Basic DJ setup

**Swag & Decor**
• NYC Deli apron for each camper
• Color-fast 3×5 stickers for each camper
• Camp flags/banners, RGB floodlights, LED chaser lights

**Trash & MOOP**
• 30' camp dumpster
• Two large trash cans
• Contractor trash bags for each camper`,
  },
  {
    title: 'Tent Spots',
    slug: 'tent',
    category: 'camp-amenities',
    tags: ['tent', 'camping', 'shelter', 'spot', 'reservation'],
    content: `**Your Home on the Playa**

Each camper gets a designated tent spot with:
• **10.5' shade canopy** over your tent (provided by camp)
• **Ground tarp** under your tent (provided by camp)
• **Electricity** available at your spot — bring an outdoor-rated extension cord

**Tent Size Guidelines:**
• Measure your tent footprint (width × length) before arrival
• Spots vary in size — check the Camp Map to see which spots fit your tent
• If your tent doesn't fit any available spots, DM Brian for help

**Tips:**
• Stake everything down securely — playa winds can reach 70+ mph
• Bring extra ratchet straps and rebar stakes
• Seal seams with tape to keep dust out
• A shade tarp on top of your tent makes a huge difference`,
  },
  {
    title: 'Kitchen',
    slug: 'kitchen',
    category: 'camp-amenities',
    tags: ['kitchen', 'cooking', 'food', 'meals', 'breakfast'],
    content: `**NYC Deli Full Kitchen**

Our kitchen is one of the best on playa — a full professional-grade setup:
• **Refrigerated box truck** with 17-gallon bins for food/drink storage
• **Running hot & cold water** with grey-water disposal
• **Two twin-burner electric stoves**, two coffeemakers, two microwaves
• **Air convection oven** for baking and roasting
• **Kitchen implements** and 3 sets of pots & pans
• **Daily breakfast** Mon–Sat on service days

**Kitchen Shifts:**
Campers sign up for 2.5-hour kitchen shifts that include prepping, cooking, serving, and cleanup.

**Rules:**
• Clean as you go — leave the kitchen better than you found it
• Label your personal food with your name and date
• Report any equipment issues immediately`,
  },
  {
    title: 'Grill Station',
    slug: 'grill',
    category: 'camp-amenities',
    tags: ['grill', 'bbq', 'cooking', 'propane', 'grilling'],
    content: `**Camp Grill Station**

Our grill station is part of the kitchen zone:
• Gas grill with propane management
• Used for camp meals and special cookouts
• Temperature monitoring required during use

**Safety:**
• Never leave the grill unattended while lit
• Keep propane tanks upright and in shade
• Report any gas smell immediately to a Camp Lead`,
  },
  {
    title: 'Food Prep Area',
    slug: 'prep_area',
    category: 'camp-amenities',
    tags: ['prep', 'food prep', 'chopping', 'sanitation', 'cooking'],
    content: `**Food Preparation Station**

Dedicated area for prepping meals:
• Cutting boards, knives, and prep tools provided
• Sanitation supplies available
• Portioning station for meal service

**Guidelines:**
• Wash hands before and after handling food
• Keep raw and cooked foods separate
• Clean and sanitize surfaces after each use`,
  },
  {
    title: 'Food Service Area',
    slug: 'service_area',
    category: 'camp-amenities',
    tags: ['service', 'serving', 'food line', 'meals', 'distribution'],
    content: `**Food Service & Distribution Point**

Where camp meals are served to campers and guests:
• Plating and serving station
• Queue management area
• Typically active during breakfast service

**Shift Roles:**
• 🍽️ Plating food
• 🎪 Managing the food line and guiding bike parking
• 🎵 DJ'ing during food service to keep the vibe going`,
  },
  {
    title: 'Storage Areas',
    slug: 'storage',
    category: 'camp-amenities',
    tags: ['storage', 'supplies', 'food storage', 'equipment'],
    content: `**Camp Storage**

Storage areas hold food supplies, equipment, and camp infrastructure:
• Refrigerated truck for perishables
• Dry storage for non-perishables and equipment
• Personal storage bins in the refrigerated truck (17-gallon HDX tubs)

**Tips:**
• Label everything with your name
• Keep storage areas organized — it helps everyone
• Report any issues (leaks, pests, broken containers) to a Camp Lead`,
  },
  {
    title: 'Shade Structures',
    slug: 'shade_structure',
    category: 'camp-amenities',
    tags: ['shade', 'canopy', 'sun protection', 'shelter', 'chill'],
    content: `**Camp Shade Structures**

Shade is life on the playa. NYC Deli provides:
• **10.5' shade canopy** over every tent spot
• **Siberia** — 20×30 chill tent kept at 70°F during the day, heated at night (camp use only)
• **Staten Island** — 20×40 chill tent kept at 70°F during the day (public use)
• **Full-length mirrors** in chill tents
• **40×40 roof deck** for camp use

**Tips:**
• Spend midday (11am–3pm) in shade — that's peak heat
• Drink water constantly even while resting in shade
• Chill tents have limited capacity — be mindful of space`,
  },
  {
    title: 'Common Areas',
    slug: 'common_area',
    category: 'camp-amenities',
    tags: ['common area', 'gathering', 'social', 'community', 'hangout'],
    content: `**Shared Gathering Spaces**

Community spaces where campers and guests hang out:
• Main gathering area for camp meetings and socializing
• Daily 15-minute camp meetings in Siberia after food service (12:30pm)
• Art viewing, music, and general playa vibes

**Etiquette:**
• Clean up after yourself
• Keep noise reasonable during quiet hours
• Be welcoming to visitors — gifting culture applies here too`,
  },
  {
    title: 'Stage & Sound',
    slug: 'stage',
    category: 'camp-amenities',
    tags: ['stage', 'music', 'dj', 'performance', 'sound', 'entertainment'],
    content: `**Performance Stage**

NYC Deli has a stage area with:
• Basic DJ setup provided by camp
• Space for live performances and art
• Sound system for music during food service and events

**DJ'ing:**
• DJ'ing during food service counts as a shift
• Bring your own controller if you have one
• Coordinate with Camp Leads for set times`,
  },
  {
    title: 'Bar Area',
    slug: 'bar',
    category: 'camp-amenities',
    tags: ['bar', 'drinks', 'cocktails', 'beverages', 'social'],
    content: `**Camp Bar**

A social hub for drinks and conversation:
• Bring your own alcohol/drinks — this is a gifting culture, not a commercial bar
• Share drinks and make new friends
• Cups provided — bring a reusable cup too

**Remember:**
• Stay hydrated — alternate drinks with water
• No opiates in camp
• Be responsible and look out for each other`,
  },
  {
    title: 'Art Car Pad',
    slug: 'art_car',
    category: 'camp-amenities',
    tags: ['art car', 'mutant vehicle', 'transportation', 'playa ride'],
    content: `**Art Car (Mutant Vehicle) Parking**

Designated area for art car parking:
• Art cars (Mutant Vehicles) must be DMV-registered on playa
• Parking pad keeps vehicles organized and safe
• Check camp schedule for art car ride-alongs

**Tips:**
• Never approach a moving art car from behind
• Always ask the driver before boarding
• Hold on tight and follow all safety instructions`,
  },
  {
    title: 'Porta Potties',
    slug: 'porta_potty',
    category: 'camp-amenities',
    tags: ['porta potty', 'bathroom', 'toilet', 'restroom', 'hygiene'],
    content: `**Private Camp Porta Potties**

NYC Deli has its own private portos:
• **Cleaned and pumped daily** — much better than the public ones
• Located within the camp boundary for easy access

**Etiquette:**
• Close the lid after use
• Don't put anything in the porto besides waste and toilet paper
• Report any issues (full, broken, no TP) to a Camp Lead
• The public portos along the streets are available too, but ours are nicer!`,
  },
  {
    title: 'Generator & Power',
    slug: 'generator',
    category: 'camp-amenities',
    tags: ['generator', 'power', 'electricity', 'energy', 'charging'],
    content: `**Camp Power System**

NYC Deli provides electricity throughout camp:
• **Generator-powered** electrical grid serving all tent spots
• Electricity available at your tent — bring an **outdoor-rated extension cord**
• Powers kitchen equipment, lighting, chill tent AC, and sound

**Tips:**
• Don't overload circuits — high-draw items (space heaters, hair dryers) may trip breakers
• Report any electrical issues immediately
• Keep cords off the ground where possible to avoid tripping hazards
• Generator area is restricted — authorized personnel only`,
  },
  {
    title: 'Water Station',
    slug: 'water_station',
    category: 'camp-amenities',
    tags: ['water', 'hydration', 'drinking water', 'refill', 'station'],
    content: `**Water Distribution Point**

Stay hydrated — it's the #1 survival rule on playa:
• Camp water station for refilling bottles and CamelBaks
• Drink at least **1.5 gallons of water per day**
• Running water available in the kitchen and shower areas

**Tips:**
• Always carry water with you when leaving camp
• If your pee isn't clear, you're not drinking enough
• Electrolyte packets help with hydration in extreme heat`,
  },
  {
    title: 'First Aid Station',
    slug: 'first_aid',
    category: 'camp-amenities',
    tags: ['first aid', 'medical', 'safety', 'health', 'emergency'],
    content: `**Medical / First Aid Station**

Basic first aid supplies available in camp:
• Bandages, antiseptic, burn cream, pain relievers
• Playa foot treatment supplies (vinegar rinse, moisturizer)
• Sunscreen and aloe vera

**Emergencies:**
• For serious medical emergencies, call **911** or go to **Rampart** (BRC's medical facility at 9:00 & Esplanade)
• Camp Leads have basic first aid training
• Always inform someone if you're feeling unwell`,
  },
  {
    title: 'Fire Pit',
    slug: 'fire_pit',
    category: 'camp-amenities',
    tags: ['fire pit', 'fire', 'campfire', 'gathering', 'night'],
    content: `**Communal Fire Area**

A gathering spot for evening socializing:
• Elevated fire pit (all burns must be off the ground on playa)
• Capacity for ~20 people around the fire
• Perfect for stories, music, and star-gazing

**Safety:**
• Never leave a fire unattended
• Keep flammable materials away from the pit
• No burning trash — that's MOOP
• Fire must be fully extinguished before everyone leaves`,
  },
  {
    title: 'Camp Entrances',
    slug: 'entrance',
    category: 'camp-amenities',
    tags: ['entrance', 'entry', 'gate', 'welcome', 'access'],
    content: `**Camp Entry Points**

Designated entrances and exits for the camp:
• Main entrance facing the street side
• Welcome visitors with the gifting spirit
• Bike parking near entrances

**Tips:**
• Lock your bike at entrances — bike theft is common on playa
• Add lights to your bike (front + back) for night visibility
• Guide visitors to the public areas (Staten Island chill tent, service area)`,
  },
  {
    title: 'Shower Container',
    slug: 'shower',
    category: 'camp-amenities',
    tags: ['shower', 'hygiene', 'water', 'clean', 'bathroom'],
    content: `**Heated Showers**

One of the most valued amenities at NYC Deli:
• **3 heated showers** in a private side-opening container
• **Mirror and sink** with running water in the shower container
• Daily showers for Build Team members; scheduled access for all campers

**Etiquette:**
• Keep showers quick (5 minutes max) so everyone gets a turn
• Clean up after yourself — no leaving towels or products behind
• Report any plumbing issues immediately
• Grey water is disposed of properly by camp infrastructure`,
  },
  {
    title: 'Dumpster & Trash',
    slug: 'dumpster',
    category: 'camp-amenities',
    tags: ['dumpster', 'trash', 'waste', 'moop', 'cleanup'],
    content: `**Trash & MOOP Management**

NYC Deli takes Leave No Trace seriously:
• **30-foot camp dumpster** for all camp waste
• **Two large trash cans** placed throughout camp
• **Contractor trash bags** provided for each camper

**Rules:**
• MOOP sweep your tent area daily
• Carry a personal MOOP bag when out on playa
• Sort recyclables when possible
• Don't dump grey water on the ground — use designated disposal`,
  },
  {
    title: 'Bike Parking & Storage',
    slug: 'bike_rack',
    category: 'camp-amenities',
    tags: ['bikes', 'bike rack', 'parking', 'bicycle', 'transportation'],
    content: `**Camp Bike Parking**

Designated areas for bike storage:
• Bike racks near camp entrances
• Camp-built 8-person couch platforms double as gathering spots near bike areas

**Bike Tips:**
• **Always lock your bike** — theft is real on playa
• Add **lights** (front + back) for night riding — it's the law in BRC
• Rent a bike through Dust Rentals (deadline: 7/7, check WhatsApp)
• If you miss the deadline, DM Brian — he has a side-deal with Dust Rentals`,
  },
  {
    title: 'NYC Container — Personal Gear Transport',
    category: 'camp-amenities',
    tags: ['container', 'transport', 'shipping', 'gear', 'nyc container', 'tubs'],
    content: `**NYC Container** is the easiest way to get your personal gear to playa:
• $50 per 27-gallon HDX tub (same price as last year)
• This is the best logistics deal available — the next cheapest option is double the cost
• Sign up details posted in WhatsApp Announcements
• Camp provides reasonable assistance loading in/out at NYC Container`,
  },

  /* ---- Volunteering ---- */
  {
    title: 'Volunteer Shift Overview',
    category: 'volunteering',
    tags: ['shifts', 'volunteering', 'work', 'food service', 'dj', 'manager'],
    content: `Each camper commits to **3× 2.5-hour shifts** during the event.

**Shift signup:** A spreadsheet will be posted later May for you to choose **when** you want to do your 3 shifts and **what** you'll do.

**Most common roles:**
• 🍕 Preparing food
• 🍽️ Serving food
• 🎪 Entertaining/managing the food line + guiding bike parking to NYC Deli's public bike racks
• 🎵 DJ'ing during food service

**Special role — Camp Day/Night Manager:**
• Must have burned before
• **Day:** 10am–4pm — **Night:** 4pm–10pm
• Counts as **2 shifts**

**Shift etiquette:**
• Show up **10 minutes before** your shift starts
• Be **sober** for your shift
• Shifts are just 2.5 hours long and there's only 3 of them — you've got this!`,
  },
  {
    title: 'How to Shine in Camp',
    category: 'volunteering',
    tags: ['tips', 'shine', 'community', 'kindness', 'etiquette'],
    content: `• **Be kind first and always**, even when tired
• Be understanding if someone else is tired and can't be 100% their best
• Show up for shifts 10 minutes early and be sober
• Try to be helpful in general — we all make camp together
• Be understanding about weather delays or things not getting done on time
  — "Mankind makes plans and the Playa Goddess (who has a twisted sense of humor) laughs at our plans sometimes"
• Don't be a creep
• Don't be an asshole`,
  },

  /* ---- Community & Guidelines ---- */
  {
    title: 'NYC Deli Community Guidelines',
    category: 'community',
    tags: ['guidelines', 'community', 'politics', 'religion', 'tolerance', 'inclusion'],
    content: `NYC Deli is an **apolitical and tolerant home** for all campers regardless of race, sex, gender, religion, sexual orientation, or national origin.

**Simple rules (like an old-school bar):** "No politics, no religion" — this leads to happy bars and happy camps.

**Common-sense guidelines:**
• Obviously, please do not espouse a particular religion in camp.
• Several wars have happened in the last 3 years and they are ongoing. Our joke deli had nothing to do with it. Nothing our joke deli does at Burning Man will change anything about it. Nothing we do or say will change anything about it.
• **Political activism:** Radical Self-Expression applies — but here's one suggestion: bring political activism in art form. Burning Man is an art festival first! Yes to art — camp will even help you bring it however we reasonably can.

**What not to do:** Wear pins that may anger people, fly flags that may anger people, or say political things meant to provoke others to anger — especially if unsolicited or delivered in an intolerant or mean-spirited way. That rubs burners the wrong way and they will radically self-express back to you in a disproportionate manner. "There's no burner like a righteously angered burner" (unofficial 12th Burning Man Principle).

**Tip:** Radical Self-Expression is a core Burning Man Principle, but there is no Burning Man Principle that will protect you from the social consequences of your radical self-expression!

If anyone feels disrespected before, during, or after the burn, please confidentially talk to a Camp Lead or Brian so we can assess the situation and possibly take corrective action.

**TLDR:** NYC Deli is a chosen village and family during prep, Build, and event week. Please make an effort to get along — especially with people who have different views than you do.`,
  },
  {
    title: 'Consent Guidelines',
    category: 'community',
    tags: ['consent', 'safety', 'respect', 'boundaries'],
    content: `Consent is paramount at Burning Man and in our camp:
• **Always ask before touching anyone** — even for hugs
• "No" is a complete sentence — respect it immediately
• Consent can be withdrawn at any time
• Being intoxicated does not equal consent
• If someone seems too intoxicated to consent, they cannot consent
• Look out for your campmates and fellow burners
• Report any issues to a Camp Lead or Brian immediately`,
  },
  {
    title: 'Drug & Alcohol Guidelines',
    category: 'community',
    tags: ['drugs', 'alcohol', 'substance', 'safety', 'opiates'],
    content: `NYC Deli's focus is on providing a **kind and nurturing environment**, service to playa — not necessarily on drugs and alcohol.

**That said, it's Burning Man:**
• There will be drugs and alcohol everywhere
• People in camp partake in both — but nobody will ever force you
• If you choose to use substances, **be responsible**
• **No opiates.** If you need opiates to have a good time, NYC Deli is not the camp for you (DM Brian for a full refund)
• Stay hydrated, eat food, and look out for each other
• Know your limits and have a buddy system`,
  },
  {
    title: 'Romantic Pursuits in Camp',
    category: 'community',
    tags: ['romance', 'dating', 'consent', 'relationships', 'community', 'guidelines'],
    content: `Brian prefers Deli campers find new special friends **outside of camp** because "we're just a deli, man." That said, attractions to fellow Deli campers can happen — here's how to handle it:

• If you are romantically interested in someone in camp, you may **politely and romantically ask them once** about it.
• If they do **not enthusiastically reciprocate** your romantic interest, **drop it**.
• Do **not** chase them.
• Do **not** leave them gifts.
• There are 70,000 horn-dogs on-playa. Go find one!

**Hard rule:** Anyone under 18 is off-limits for romance. In this camp and anywhere else. Anyone breaking this rule: Brian will figuratively bring the rope and see you hang.`,
  },
  {
    title: 'Camp Events & Social Gatherings',
    category: 'community',
    tags: ['events', 'social', 'picnic', 'movie night', 'dinner', 'central park', 'sheeps meadow'],
    content: `**Optional NYC Deli Pre-Burn Events** (to get better acquainted with each other):
• **Camp Picnic — Sunday May 17 @ 1pm in Sheep's Meadow, Central Park** (weather permitting)
• A **3rd Camp Picnic** will be held in July, date TBD
• Camp build days to make bike racks and 8-person couch platforms for the public picnic area
• Movie nights at Brian's loft in Bushwick
• Friday night dinners at Brian's loft (they're Shabbat dinners but non-sectarian — you don't need to be Jewish and no religion is evident)

**On-Playa Events:**
• 3 sunset trips (optional)
• Short 15-minute daily meetings in Siberia following food service and cleanup (12:30pm, required)`,
  },
  {
    title: 'Camp Amenity Etiquette',
    category: 'community',
    tags: ['amenities', 'etiquette', 'discretion', 'courtesy'],
    content: `**Be mindful when talking to burners outside camp:**
• Many BM camps and open campers have spartan setups
• Be kind, use judgment, and avoid "rubbing it in their face"
• Camp amenities are made by all of us — especially Build Team

**Understanding & patience:**
• If an amenity is delayed or being repaired, be patient
• We are all volunteers making our home on playa
• Our home is not a restaurant or hotel`,
  },

  /* ---- Videos & Media ---- */
  {
    title: 'Burning Man Official — What Is Burning Man?',
    category: 'videos',
    tags: ['video', 'intro', 'official', 'overview'],
    content: 'The official Burning Man overview video explaining the culture, art, and community.',
    link: 'https://burningman.org/about/',
  },
  {
    title: 'Burning Man Survival Guide (Official)',
    category: 'videos',
    tags: ['video', 'survival', 'guide', 'preparation', 'safety'],
    content: 'The official Burning Man Survival Guide — essential reading for all attendees, especially first-timers.',
    link: 'https://survival.burningman.org/',
  },
  {
    title: 'Burning Man First-Timer\'s Guide',
    category: 'videos',
    tags: ['video', 'first-time', 'new burner', 'tips', 'preparation'],
    content: 'Comprehensive first-timer resources from the Burning Man organization, covering everything from tickets to what to expect.',
    link: 'https://burningman.org/event/preparation/first-timers-guide/',
  },
  {
    title: 'Playa Events — What\'s Happening at Burning Man',
    category: 'videos',
    tags: ['events', 'schedule', 'playa events', 'art', 'performances'],
    content: 'Browse the full schedule of events, performances, workshops, and activities happening at Burning Man.',
    link: 'https://playaevents.burningman.org/',
  },

  /* ---- Aggregated Packing Resources (from past camp planning docs) ---- */
  {
    title: 'Comprehensive Personal Packing Checklist',
    category: 'packing',
    tags: ['packing list', 'checklist', 'detailed', 'tent', 'bedding', 'clothing', 'bikes', 'food', 'gear'],
    content: `A detailed, categorized packing checklist compiled from experienced campers. Use this alongside the Absolute Essentials list.

**Tent Setup**
• Tent (measure footprint before arrival)
• Carpet or rug for tent floor
• Bed sheet (to cover bed during the day — keeps dust off)
• Hanging clip lights or LED string lights
• 25-foot (min) outdoor extension cord
• Clothing rack
• Hangers
• Portable evaporative cooler (optional but amazing)
• Painter shoe covers (for running into the tent with shoes on)

**Bedding & Sleep**
• Sleeping bag rated to 30°F
• Air mattress or sleeping pad
• Pillows
• Sleep mask & earplugs
• Noise-cancelling earbuds (optional)
• Rechargeable battery-operated fan
• Warm sleepwear

**Costumes & Clothing**
• Goggles (ski or swim style)
• Dust masks / N95 respirators
• Boots/shoes (plus a backup pair)
• Camp sandals / shower sandals
• Hats & scarves (for warmth and sun)
• Boonie hat or wide-brim hat
• Utility belt / fanny pack
• Backpack or hydration pack
• Glow items / LED accessories for nighttime
• Thermal top and bottoms (nights get cold!)
• Lots of socks
• Safety pins
• Hanging organizer for accessories
• Warm jacket or faux fur coat for night
• Fun outfits and costumes — go wild

**Bikes & Mobility**
• Bike lock (digit lock recommended — no key to lose)
• Bike lights (front headlight + rear)
• Bike decorations (helps you find yours in a sea of bikes)
• Bike basket (insulated is a bonus)
• Bike totem or flag (helps locate your bike at large events)

**Food & Cooking**
• Reusable utensils (fork, knife, spoon)
• Reusable plate, cup, and bowl
• Non-perishable snacks: dried mango, nuts, protein bars (ones that won't melt)
• Trash bags + ziploc bags
• Coffee (camp has coffeemakers)

**Water & Hydration**
• Refillable water bottles / CamelBak
• Electrolyte tablets or mixes (LMNT, Nuun, etc.)

**Documents & Essentials**
• Burning Man ticket + vehicle/bus pass
• ID / license & health insurance card
• Laminated copy of ID (attach to your cup)
• Credit card / cash (you shouldn't need money on playa, but just in case)
• Phone + portable charger + waterproof case
• Event map/guide

**Playa Gear & Fun**
• Journal / burn journal
• Drinks tumbler with lid (pro tip: tape a copy of your ID to it)
• Dust/waterproof phone case
• Camera (disposable or polaroid — great for gifting photos)
• Parasol umbrellas (extras make great playa gifts)
• Portable speaker
• Batteries — AA and AAA
• Large mirror (to share with tentmates)
• Name / contact info tags (laminated)
• Face gems, body glitter (non-MOOP types only!)

**MOOP & Leave No Trace**
• MOOP bags (carry one at all times)
• Vinegar spray (for cleaning)`,
  },
  {
    title: 'Always Carry on Playa',
    category: 'packing',
    tags: ['carry', 'essentials', 'on-body', 'must have', 'daily carry', 'safety'],
    content: `These items should be on you (or in your pack) at **all times** when out on playa:

• **Goggles** — dust storms hit without warning
• **Dust mask** — protect your lungs
• **Water** — at least one full bottle, always
• **Snacks** — you burn more calories than you think
• **Flashlight or headlamp** — playa is pitch black at night
• **Toilet paper / tissues** — portos run out
• **Cup with ID** — your ticket to drinks everywhere (copy of ID taped on)
• **Sunscreen** — reapply every 2 hours
• **Lip balm** with SPF — your lips will crack without it
• **Basic first aid** — a couple bandaids, some ibuprofen
• **Thermal top** — for when temperature drops at night
• **Contacts / glasses** — if you need them
• **Hand sanitizer** — portos don't have sinks

**Pro tip:** A fanny pack or utility belt keeps all of this accessible without a bulky backpack.`,
  },
  {
    title: 'First Aid & Playa Health Guide',
    category: 'packing',
    tags: ['first aid', 'medicine', 'health', 'playa foot', 'hygiene', 'otc', 'vitamins', 'womens health'],
    content: `**Over-the-Counter Meds to Pack**
Build a shared first aid stash or bring your own supply:
• Emergency-C or Emergen-C packets
• Ibuprofen (Advil) — for headaches, inflammation, general pain
• Acetaminophen (Tylenol) — alternate with ibuprofen
• Excedrin — for stronger headaches
• Benadryl — for allergic reactions, also helps with sleep
• Zyrtec or similar daily antihistamine — dust is relentless
• Allergy eye drops
• Saline nasal spray — keeps nasal passages from drying and cracking

**First Aid Supplies**
• Bandaids (assorted sizes)
• Neosporin / antibiotic ointment
• Alcohol wipes
• Lens wipes (for goggles and glasses)
• Aloe vera / burn cream
• Sunscreen SPF 50+

**Playa Foot Prevention & Treatment**
The alkaline playa dust causes chemical burns on your feet (and hands):
• Vinegar or witch hazel + a container your feet and hands fit into — soak daily
• Add a little vinegar to your baby wipes and spray bottle
• Moisturizer after soaking
• Antibiotic ointment for any cracks

**Recovery & Vitamins**
• Daily multivitamins
• Recovery vitamin packs
• Emergen-C or similar immune support
• Pill container — consolidate all meds into one organizer

**Women's Health on the Playa**
The dust and dehydration can wreak havoc — come prepared:
• Female urination device (pee standing up — game changer for portos)
• Vaginal wipes for dust cleanup (pH-balanced)
• Boric acid suppositories (for pH balance)
• Monistat cream (the dust changes everything)
• Diaper cream for skin irritation or rash
• Condoms / personal items

**General Hygiene**
• Body wipes / shower wipes (for days between showers)
• Face/makeup wipes
• Witch hazel body wipes
• Biodegradable soap
• Lotion — lots of it (travel-size packs are great)
• Quick-dry towels
• Portable mirror
• Hand sanitizer (travel size, multiple)
• Wet wipes (make sure they're biodegradable)
• Spray bottle for misting yourself and others (great playa gift)`,
  },
  /* ---- Expanded Packing: Stitch's Veteran Knowledge ---- */
  {
    title: 'Cooling, Warming & Comfort Accessories',
    category: 'packing',
    tags: ['cooling', 'warming', 'parasol', 'mister', 'hand warmers', 'comfort', 'heat', 'cold'],
    content: `Desert temps swing from 100°F+ during the day to the 40s at night. Gear up for both.

**Cooling**
• Spray bottle / mister — mist yourself and others (add a little lemon juice or vinegar to help with the alkalinity). Makes a great playa gift.
• Gel eye mask or gel neckerchief you can chill in your cooler — this can really help when overheated
• Chinese parasol or umbrella — rain or shine, your personal shade follows you
• Portable evaporative cooler — for your tent (see Shopping Links)

**Warming**
• Rechargeable hand warmers (or chemical ones as backup)
• Warm gloves or mittens — nights are cold
• Fleece or fur hat for nighttime
• Long underwear / thermal base layers
• Down or synthetic-down jacket, vest, or similar — it can get really cold at night
• Polypro or wool socks for cold nights`,
  },
  {
    title: 'Shelter Options — Know Your Home',
    category: 'packing',
    tags: ['tent', 'shift pod', 'hexayurt', 'rv', 'shelter', 'housing', 'home', 'shade'],
    content: `You have options. Pick what works for your comfort level and budget. NYC Deli provides 10.5' shade over your tent spot and a ground tarp — but you bring the structure.

**Option 1: Tent**
The classic. Get one with minimal mesh — ideally one that closes completely. You'll want enough room for costumes (they take space). Seal seams with tape to keep dust out.

**Option 2: Shift Pod**
Very popular modern option. Reflective, insulated, and relatively quick to set up. [shiftpod.com](https://shiftpod.com/shiftpod/)

**Option 3: Hexayurt**
DIY insulated shelter built from rigid insulation panels. Cooler than tents, cheaper than RVs. Plans available at [Hexayurt Playa Guide](http://www.appropedia.org/Hexayurt_playa)

**Option 4: Vehicle (RV, Van, Car)**
Rental companies have Burning Man limitations & the ones that allow it book up very early in the spring. Plan ahead. Cover all windows with foil-faced bubble wrap or tarps — dramatically cuts generator use for AC.

**Option 5: Shipping Box (advanced)**
Giant wooden crates (e.g. 5'×8'×4') you can pack gear into, then assemble and decorate and live in.

**All Shelters:**
• Stake everything down securely — playa winds can reach 70+ mph
• Separate shade structure over your tent makes a huge difference
• More enclosed = less dust inside (but hotter during the day without cooling)`,
  },
  {
    title: 'Home Setup & Organization',
    category: 'packing',
    tags: ['bedding', 'air mattress', 'organization', 'carpet', 'pillow', 'sleeping', 'mirror', 'wardrobe'],
    content: `Your playa home is your sanctuary. An organized space = better sleep = better burn.

**Bed Setup**
• Air mattress + pump OR futon mattress (if you have space)
• Insulation blanket (wool) between you and the air mattress — air inside gets very cold at night and very warm during the day
• Double-case your pillows — keeps playa dust out
• Sleeping bag rated to 30°F
• Tarp/plastic cover to put over your bed — playa WILL get in no matter how dust-proof your home is

**Organization**
• Clear plastic hanging wardrobe — hang/fold clean clothing inside
• Clear plastic shoe organizer for over the door — great for goggles, lip balm, lighters, saline, etc.
• Collapsible clothing rack (~$50 ones collapse flat and fast)
• Small 3-4 drawer plastic organizer — great bedside storage
• Carpet/floor mat — keeps dust down and makes home nicer. Roll up and wait to shake out till you're home. Tape off edges to prevent unraveling.

**Vibes**
• Full-length mirror — great to see your whole outfit (secure it to avoid breakage)
• Small personal mirror for makeup
• Tapestries, decorations — make your home feel like your own little Shangri-La
• Small white board for outside your tent — leave notes, post your schedule
• Clip lights or LED string lights inside`,
  },
  {
    title: 'Night Safety & Lighting Guide',
    category: 'packing',
    tags: ['night', 'lighting', 'led', 'el wire', 'headlamp', 'visibility', 'safety', 'guylines'],
    content: `Playa at night is DARK. If you can't be seen, you can get hit by bikes or art cars. This is not optional — it's survival.

**Personal Lighting (MUST)**
• Headlamp + extra batteries
• LED lights or EL wire to decorate yourself — be VISIBLE FROM ALL DIRECTIONS
• Flashlight or camp night light
• Consider energy-efficient, reusable LED or EL wire over single-use glow sticks

**Camp Lighting (MUST)**
• Lighting for anchors & guylines — people WILL trip over them otherwise. Solar-powered twinkle lights work great. Put these up as soon as structures go up.
• LED solar lawn lights — fit over rebar nicely

**Where to buy:** Cool Neon, Al Lasher's Electronics Berkeley, glimmergear.com for LED wristbands

**Pro tips:**
• EL wire is brighter when batteries are fresh — bring spares
• Night dust storms happen — don't rely solely on seeing others, make sure THEY can see YOU
• Solar-charge your lights during the day`,
  },
  {
    title: 'Tools & Hardware Checklist',
    category: 'packing',
    tags: ['tools', 'rebar', 'tape', 'hammer', 'hardware', 'sledge', 'zip ties', 'setup', 'build'],
    content: `You're building a temporary home in a desert. Come prepared like you mean it.

**Staking & Anchoring (MUST)**
• Rebar — 2' straight pieces for tent, guylines, and structures. Everything must be secured!
• 5 lb. sledge hammer for pounding rebar
• Rebar end covers — tennis balls (cut across the logo so you find them next year), plastic end caps, or solar lights
• Rebar puller — hook with eye, large vise grips, or dedicated stake puller
• Alternative: 3/8"×14" lag bolts you screw in/out with an impact driver
• Extra rope/clothesline/parachute cord (150' parachute line rated to 300 lbs)
• Guy line covers — foam pipe insulation or cut pool noodles

**Essential Tools**
• Pliers (needle nose, regular, & vise grips)
• Screwdrivers (flat & Phillips)
• Swiss Army knife / multitool
• Scissors & safety pins
• Tape — duct, electrical, & masking (masking for defacing logos)
• Zip ties (long and short) — can be used in all kinds of ways
• Work gloves — heavy duty
• Gorilla Glue 2 oz — saved many a broken boot sole on playa
• Butane lighters
• Wire clippers

**Batteries & Power**
• Extra batteries for EVERYTHING (lots of AA and D)
• Consider rechargeable batteries with solar charger
• 12V car inverter / cigarette lighter power converter
• Camera charger
• Heavy duty extension cords (if camp has power)
• Power strips

**Nice-to-Have**
• Bungee cords / tie-downs (extra)
• Battery cordless drill + extra batteries & charger (keep batteries out of heat!)
• Small broom to sweep dust out of tent
• Sewing kit for repairs
• Compressed air for camera equipment
• Cheap watch for time-telling
• Tool box or bucket — nice to have it all in one place
• Magnet sweeper/rake — picks up metal debris, great for MOOP sweep

**Safety (MUST)**
• Fire extinguisher ×2 — one for cooking area, one for sleeping area
• Car emergency kit — jumper cables, tow cable, flares, reflective triangle, tire inflator`,
  },
  {
    title: 'Personal Food & Drink Planning',
    category: 'packing',
    tags: ['food', 'drinks', 'meals', 'snacks', 'cooking', 'cooler', 'hydration', 'coffee', 'alcohol'],
    content: `Camp provides breakfast Mon–Sat. For everything else, plan your own food. The trick is picking stuff that survives desert heat and limited cooler space.

**Cooler Strategy**
• 1-2 coolers depending on length of stay (make sure it has a spigot to drain water)
• Blocks to raise cooler off the ground — heat transfers from the playa, raising it helps ice last
• Extra blanket wrapped around cooler for insulation
• Container for perishables inside cooler (large Tupperware or small trash can) — acts like a cool box keeping veggies cool but not drowning. They last way longer.
• Debbie Meyer Green Bags for fruits & vegetables — they actually work
• Pro tip: Freeze 24 personal water bottles in a separate cooler with dry ice (OFF THE GROUND and WRAPPED IN A BLANKET). Transfer melted ones to the dry-ice cooler, frozen ones into your food cooler. Works 5-6 days without buying ice.

**Hydration (MUST)**
• Emergen-C / electrolyte packets — you WILL need these
• Coconut water — great for staying hydrated
• Pedialyte — great for hangovers and staying well hydrated
• Coffee/Tea — instant options (Chi in a box, Starbucks VIA, etc.)
• Energy shots (5-hour energy, GU gels)
• Gatorade powder mix
• Water: ~2-2.5 gallons per person per day (includes bathing)

**Meal Ideas**
• Pre-made meals (pasta, empanadas) — good for first day when you're still setting up
• Bacon & eggs, bread (keep in Tupperware in cooler — lasts all week)
• PB&J, granola, yogurt
• Chili, instant rice, lentils, heat-and-serve packets (Tasty Bites)
• Vacuum-sealed restaurant meals — partially freeze, vacuum seal, fully freeze. On playa: boil in pot for 5-10 minutes.
• Quinoa (pre-make at home)

**Snacks (MUST)**
• Hard boiled eggs (pre-boil & peel at home — perfect protein)
• Organic baby food pouches (Ella's Kitchen brand) — moist, easy to get down when you think you can't eat but know you need to
• Pickles — help balance your body in the high-alkaline environment
• Nuts, protein bars, fruit roll-ups
• Chips and salsa, hummus — the salt tastes amazing out there
• Jerky (beef, turkey, tofu)
• Clif Shot blocks — calories + electrolytes + caffeine when you can't eat

**Drinks**
• Canned beer (cans = less trash than bottles, and there's recycling camp)
• Booze in plastic handles — great gift to bring to party places
• Box wine/saki — box = less trash
• Flask + flask funnel
• Thermos — hot tea or chocolate for cold nights on playa

**Kitchen Essentials (if camp doesn't have)**
• Cooler, cookware, cutting board, knife
• Trash bags (contractor grade) — Pack it in, Pack it out!
• Mesh bags / cheap colander with lid to dry wet trash (keeps trash from smelling)
• Biodegradable soap, sponge, towel
• Zip lock bags (1 gal and 1 qt) — for food and dust protection
• Olive oil — does wonders cleaning playa dust off objects`,
  },
  {
    title: 'Car & Travel Prep',
    category: 'packing',
    tags: ['car', 'driving', 'travel', 'rental', 'air filter', 'speed limit', 'gate road'],
    content: `Most Burning Man accidents happen from people driving to and from without enough sleep. Get rest before the long drive.

**On the Road**
• Once you get off HWY 80, KEEP TO THE SPEED LIMIT. Cops are ready to take your money if you give them any reason.
• Once on Gate Road, keep to 10 mph — people get pulled over constantly before reaching camp.
• Road map / offline directions — don't count on cell service.

**Protect Your Car**
• Set AC to RECIRCULATE at the entrance gate sign. This prevents the intake from consuming playa dust. Skip this and the first time you turn on the AC at home it'll blast playa dust everywhere.
• Cover ALL interior car surfaces with blankets, towels, or sheets. This will cut post-playa cleaning time by more than half.
• New air filter — take a spare to replace the dust-clogged one as soon as you leave playa. Adds miles to your engine and MPG.
• Lock your car and close windows when not in it. Theft happens on playa just like everywhere else.
• Cardboard for car windows — enough to black them out for privacy/sleeping.

**Rental Cars**
• Clean your rental car THOROUGHLY — budget for a deep-clean car wash
• Some rental companies charge hundreds for excessive dust
• Companies that allow BM trips book up early spring — plan ahead

**Before Departure (service your vehicle)**
• Fill up all tanks
• Check tires, fluids, belts
• The older your vehicle, the more important this is
• Keep car key in ONE place and tell others where it is`,
  },
  {
    title: 'Post-Playa Recovery & Cleanup',
    category: 'packing',
    tags: ['post playa', 're-entry', 'cleaning', 'depression', 'recovery', 'decompression', 'trash'],
    content: `Coming home is harder than you think. Plan for it.

**Decompression**
• Allow at least 2 days before taking on any responsibilities — you need time to ground yourself
• Connect with campmates who understand the experience
• Expect extremely vivid dreams and a lot of needed sleep
• "Wait three weeks before you make any life-changing decisions" — Arctic Monkey's Post-Playa Decompression Guide
• Post-Playa Depression (PPD) is real. Burning Man shakes up something deep in you, no matter how strong you are. Reach out to burner friends who get it.

**Cleaning**
• Spray club soda & wipe to remove alkaline dust from car/RV interior and exterior. Use a clean cotton cloth and change sides often — no streaking.
• Add a splash of white vinegar to laundry (with regular detergent) to break down alkaline playa dust
• Leather: clean with vinegar/water solution, then rub down with mink oil
• Clean the hell out of your bike — pull apart, clean moving bits, grease them up, reassemble (or take to a bike shop)
• Clean shoes ASAP — playa dust destroys leather and rubber over time

**Trash Disposal**
• Dispose of your trash properly. A lot of dumping (intentional and unintentional) happens everywhere on and off playa.
• Use drop-off centers for trash & recycling along routes from Black Rock City (open 24 hours following the event) — separate recycling from garbage
• Make sure to leave room in your vehicle for outbound trash. Pack it in, Pack it out.
• Try to grab an extra bag or two of someone who left it behind — it happens more than it should.

**Integration**
• Think about what changed in you and what you want to bring into daily life
• The lessons of Burning Man can be applied to the default world — that's the real gift`,
  },
  {
    title: 'Lessons Learned from Veteran Burners',
    category: 'burning-man-101',
    tags: ['lessons', 'best practices', 'advice', 'veteran', 'wisdom', 'safety', 'tips', 'moop'],
    content: `Hard-won wisdom from burners who've done this many times. Read it before you go — thank us later.

**The Big Ones**
• DON'T BRING ANYTHING YOU'RE NOT WILLING TO LOSE — including relationships and your life. Theft happens. Stuff gets misplaced. People change. If you can't afford to lose it, leave it home.
• Come with an open mind and open heart. Let go of any agenda or expectations — you will be right where you need to be.
• BE GENTLE WITH YOURSELF AND OTHERS, especially at the end. Fuses run short. People say and do things from a stressed place. Don't take it personally.
• You don't always get the burn you want — you get the burn you need.

**Practical Wisdom**
• Take everything out of packaging BEFORE you leave — less garbage to carry home. Label with Sharpie if needed.
• Make sure to leave room in your vehicle for outbound trash.
• Lock your car. Close the windows. Even in camp.
• Put contact info labels on your camera, CamelBak, bike, phone, and anything you love. People WANT to return things but don't know how.
• Print out passes, ticket confirmations, etc. Don't count on cell service or WiFi.
• Keep car key in one safe place. Tell others traveling with you where it is.

**Playa Culture**
• Ask before taking someone's picture — not just people who are nude, but anyone you're focusing on.
• Be awesome to Porta Potty cleaning crews — only body stuff in the portos, and maybe gift them a cold drink. One year a worker got injured by something sharp going through the vacuum tube.
• If you have lost someone or carry baggage, bring something that represents it and place it in the Temple to burn on Sunday night. Ask friends who aren't attending if they want you to bring something on their behalf.
• At sunset, take a moment and howl as it disappears behind the mountains.
• Whatever you've been scared to try — give it a shot (as long as it doesn't harm anyone else).

**Emotional Prep**
• The environment will tax you emotionally and physically to the point of fight or flight. It's an excellent opportunity to look at how you deal with stress.
• Most burners have some kind of emotional release in the first couple of days. It's part of the transition — embrace it.
• Let others know if you're having a hard time. Ask for what you need.
• Whatever is natural for you, that's the type of burn you'll have.

**Law Enforcement**
• Your state's cannabis laws DO NOT apply at Burning Man — you are on FEDERAL land.
• Never consent to a search. Say: "I do not consent to a search." Even if you have nothing to hide.
• If asked where your camp is, say you don't remember or ask "Do you have a warrant?" Don't lead cops to your camp.
• All prescription medication must be in its prescription bottle with your name on it.`,
  },
  {
    title: 'Pre-Departure Task Checklist',
    category: 'packing',
    tags: ['pre-departure', 'checklist', 'tasks', 'before leaving', 'preparation', 'planning'],
    content: `Don't just pack — handle your life before you disappear into the desert for a week+.

**Must Do**
• Get rest before the long drive — most BM accidents happen from sleep-deprived driving
• Notify someone of your plans — where you're going, how long, when to expect you back, and how to reach you on playa (camp name, etc.)
• Make arrangements for pets and plants
• Save energy — turn off AC, electronics, appliances
• Set up email auto-response
• Print/download maps, passes, and guides (don't count on connectivity)
• Get cash from ATM (for ice — $3/bag, and emergencies)
• Charge all batteries and devices

**Nice to Do**
• Clean out perishables from fridge
• Pay bills — don't want anything cancelled while you're gone
• Take out garbage
• Put mail on hold (especially if out longer than a week)

**Smart Prep**
• Write down every event and the locations of people you want to connect with in a small notebook — fits in your personal bag
• Bring stamps & postcards — Burning Man has a fully-functioning postal service!
• Take a photo of your packed setup for reference when repacking`,
  },
  {
    title: 'Bathing & Hygiene Setup',
    category: 'packing',
    tags: ['bathing', 'shower', 'hygiene', 'solar shower', 'baby wipes', 'towel', 'toiletries'],
    content: `Camp has heated showers, but you still need your own hygiene kit. The alkaline dust will destroy your skin if you don't stay on top of it.

**Bathing Essentials**
• Towel (quick-dry type) — bring two if you have space
• Solar shower bag (3 gal, heats to 120°+ in a few hours) — backup if camp showers are busy
• Water catch bin — for under shower (use one of your bins that you don't need during the week)
• Teva's / flip flops / water shoes for in and after the shower
• Spare shower nozzle

**Daily Hygiene**
• Baby wipes — this is your quick bath. You'll use a LOT.
• Basic toiletries — toothbrush, toothpaste, biodegradable soap, deodorant
• Shampoo, conditioner, hair brush, comb
• Hand sanitizer — keep a small one with you at all times (on your bike, etc.)
• Kleenex / small tissue packs — for when the porto is out of TP (happens a lot). Only 1-ply TP goes in portos.

**Skin Survival**
• Vinegar or witch hazel + container your feet & hands fit into — the alkaline desert will tear up your skin. Vinegar/witch hazel neutralizes it. Witch hazel smells way better.
• Add vinegar to baby wipes and spray bottles
• Moisturizer — bring multiple (by bed, in your bag, etc.)
• Bag Balm — apply to hands and feet before hitting playa, then once daily. Prevents dehydration and swelling.
• Neosporin for dry cracked noses — apply to inner edge of nostrils, let capillary action pull it in. Prevents nosebleeds.

**Ladies**
• Tampons or menstrual cup (DivaCup, Moon Cup, Lunette) — even if it's not your time, it may surprise you. DO NOT put tampons in port-o-potties — carry a personal trash bag.
• Yeast infection cream/pill — the dust changes everything
• Non-applicator tampons = less trash

**Nose & Sinus Care**
• Dust masks rated N-95 (bring 4+)
• NOSK personal air filtration or nasal filters (WoodyKnows, First Defense)
• Neti pot & saline (not table salt)
• Saline nasal spray
• Boogie Wipes — basically baby wipes for the nose
• Essential oils — peppermint, rosemary, eucalyptus (2-3 drops in your dust mask, voila — you can breathe again)`,
  },
  {
    title: 'Recommended Playa Gear — Shopping Links',
    category: 'external-links',
    tags: ['shopping', 'amazon', 'gear', 'products', 'cooler', 'health', 'buy'],
    content: `Helpful product links sourced from past camper shopping lists. These are not endorsements — just things that worked well on playa.

**Tent Comfort**
• Portable Evaporative Cooler (Hessaire MC12V) — keeps your tent liveable during the day

**Women's Health & Hygiene**
• Female Urination Device — essential for porto comfort
• AZO Boric Acid Suppositories — vaginal pH support
• Good Clean Love Moisturizing Wipes — pH-balanced wipes for dust cleanup
• Diaper Cream (hypoallergenic, phthalate/paraben-free) — for skin irritation and rash

**General Tips for Shopping:**
• Buy in bulk and split with campmates — saves money and weight
• Travel-size packs of wipes, sanitizer, and lotion are easier to carry on playa
• Check Amazon wishlists from experienced burners for more ideas
• Sign up for the camp's container shipping to avoid checking oversized luggage`,
    link: 'https://www.homedepot.com/p/Hessaire-900-CFM-2-Speed-Portable-Evaporative-Cooler-for-350-sq-ft-in-Gray-MC12V/327848113',
  },

  /* ---- External Links ---- */
  {
    title: 'Burning Man Official Website',
    category: 'external-links',
    tags: ['official', 'burning man', 'website', 'bmorg'],
    content: 'The official website for all things Burning Man — news, events, tickets, art, and community.',
    link: 'https://burningman.org/',
  },
  {
    title: 'Burning Man Survival Guide',
    category: 'external-links',
    tags: ['survival', 'guide', 'safety', 'preparation', 'desert'],
    content: 'Essential reading before attending. Covers health, safety, weather, and desert survival.',
    link: 'https://survival.burningman.org/',
  },
  {
    title: 'ePlaya — Burning Man Community Forums',
    category: 'external-links',
    tags: ['forum', 'community', 'discussion', 'eplaya', 'advice'],
    content: 'The official Burning Man community forum — great for advice, camp coordination, ride shares, and discussions.',
    link: 'https://eplaya.burningman.org/',
  },
  {
    title: 'Burning Man Journal / Blog',
    category: 'external-links',
    tags: ['blog', 'journal', 'news', 'stories', 'updates'],
    content: 'Stories, updates, and news from the Burning Man community year-round.',
    link: 'https://journal.burningman.org/',
  },
  {
    title: 'Black Rock City Map & City Plan',
    category: 'external-links',
    tags: ['map', 'city plan', 'layout', 'streets', 'placement'],
    content: 'Interactive map and city plan for Black Rock City, including camp placements and art installations.',
    link: 'https://burningman.org/event/preparation/maps/',
  },
  {
    title: 'Dust Rentals — Bike Rentals for Burning Man',
    category: 'external-links',
    tags: ['bike', 'rental', 'dust rentals', 'transportation', 'playa bike'],
    content: 'Rent bikes for Burning Man with on-playa pickup and dropoff. NYC Deli campers should rent by the posted deadline.',
    link: 'https://dustrentals.com/',
  },
  {
    title: 'Burning Man Ticket Info',
    category: 'external-links',
    tags: ['tickets', 'admission', 'purchase', 'sale', 'cost'],
    content: 'Official ticket information, sale dates, and policies for Burning Man.',
    link: 'https://tickets.burningman.org/',
  },
  {
    title: 'Leave No Trace — Burning Man',
    category: 'external-links',
    tags: ['leave no trace', 'moop', 'environment', 'cleanup', 'principles'],
    content: 'Burning Man\'s Leave No Trace commitment and how participants can minimize environmental impact.',
    link: 'https://burningman.org/event/preparation/leaving-no-trace/',
  },
  {
    title: 'r/BurningMan — Reddit Community',
    category: 'external-links',
    tags: ['reddit', 'community', 'forum', 'advice', 'tips', 'discussion'],
    content: 'Active Reddit community for Burning Man discussions, advice, photos, and stories from past and future burners.',
    link: 'https://www.reddit.com/r/BurningMan/',
  },
  {
    title: 'Burning Man YouTube Channel',
    category: 'external-links',
    tags: ['youtube', 'video', 'art', 'documentary', 'official'],
    content: 'Official Burning Man YouTube channel with documentaries, art features, principle talks, and event highlights.',
    link: 'https://www.youtube.com/@burningman',
  },
  {
    title: 'Burner Express Bus — Getting To & From )',
    category: 'external-links',
    tags: ['transport', 'bus', 'burner express', 'travel', 'reno', 'sf'],
    content: 'Transportation for you and all your stuff to and from Black Rock City from SF or Reno. Great option if you don\'t want to drive.',
    link: 'https://burnerexpress.burningman.org/',
  },
  {
    title: 'Burning Man Information Radio (BMIR 94.5 FM)',
    category: 'external-links',
    tags: ['radio', 'bmir', 'info', 'schedule', 'playa'],
    content: 'Essential information on the playa with as close to accurate info about travel times, gates, and events. Tune in for announcements, music, and PSAs. You can even submit PSAs or give interviews.',
    link: 'https://bmir.org/',
  },
  {
    title: 'Rockstar Librarian Burning Man Music Guide',
    category: 'external-links',
    tags: ['music', 'sound camps', 'dj', 'guide', 'schedule', 'events'],
    content: 'All your playa music info in one place. Lists sound camp music schedules and events — a gift to the citizens of Black Rock City. Available for download pre-gate each year. Print a copy!',
    link: 'http://www.rockstarlibrarian.com/',
  },
  {
    title: 'First-Timer\'s Guide to Burning Man (Official)',
    category: 'external-links',
    tags: ['first time', 'newbie', 'guide', 'preparation', 'new burner'],
    content: 'The official first-timer guide. Good idea to re-read every year just to refresh, even for veterans.',
    link: 'https://burningman.org/event/preparation/first-timers-guide/',
  },
  {
    title: 'Emotional Survival Guide to Burning Man',
    category: 'external-links',
    tags: ['emotional', 'mental health', 'survival', 'stress', 'feelings'],
    content: 'The environment will tax you emotionally and physically to the point of fight or flight. This is an excellent guide for understanding and managing the emotional intensity of the burn.',
    link: 'https://www.huffpost.com/entry/burning-man-survival-guide_b_3769346',
  },
  {
    title: '10 Tips for Staying Healthy at Burning Man',
    category: 'external-links',
    tags: ['health', 'tips', 'wellness', 'hydration', 'safety'],
    content: 'Practical health tips from medical professionals about surviving and thriving in the harsh desert environment.',
    link: 'https://www.onemedical.com/blog/live-well/healthy-burning-man/',
  },
  {
    title: 'Burning Man Lost & Found',
    category: 'external-links',
    tags: ['lost', 'found', 'center camp', 'missing items'],
    content: 'Located at Center Camp. Please take anything you find there so people can get their treasures back. Label your stuff!',
    link: 'https://burningman.org/event/preparation/black-rock-city-guide/infrastructure/lost-and-found/',
  },
  {
    title: 'Post-Playa Decompression & PPD Resources',
    category: 'external-links',
    tags: ['post playa', 'depression', 'ppd', 'decompression', 're-entry', 'mental health'],
    content: 'Coping with the post-Burning Man blues is real. Articles and guides for managing PPD (Post-Playa Depression) and integrating the lessons of Burning Man into the default world.',
    link: 'https://www.fest300.com/magazine/coping-with-the-post-burning-man-blues',
  },
  {
    title: 'Trash & Recycling Drop-Off Points',
    category: 'external-links',
    tags: ['trash', 'recycling', 'drop-off', 'leave no trace', 'waste', 'moop'],
    content: 'Communities and local businesses along all routes from Black Rock City offer 24-hour drop-off centers following Burning Man. Separate recycling from garbage. Pack it in, pack it out.',
    link: 'https://burningman.org/event/preparation/playa-living/trash-recycling/',
  },
  {
    title: 'Gray Water Elimination & Evaporation',
    category: 'external-links',
    tags: ['gray water', 'evaporation', 'waste', 'disposal', 'water management'],
    content: 'If your camp doesn\'t have gray water infrastructure, you\'ll need to manage it yourself. The evapotron is a popular option — lots of DIY designs available.',
    link: 'https://sites.google.com/site/evapotrons/graywater-experience-and-advice',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function toResourceKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
type MainTab = 'guide' | 'directory' | 'events'

const MAIN_TABS: { key: MainTab; label: string; icon: string; blurb: string }[] = [
  { key: 'guide', label: 'Camp Guide', icon: '📖', blurb: 'NYC Deli & Burning Man know-how' },
  { key: 'directory', label: 'BRC Directory', icon: '🔥', blurb: 'Camps, art & mutant vehicles' },
  { key: 'events', label: "What's On", icon: '📅', blurb: 'Live playa events calendar' },
]

export default function ResourcesPage() {
  const [mainTab, setMainTab] = useState<MainTab>('guide')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const scrolledRef = useRef(false)

  // Admin editing state
  const [isAdmin, setIsAdmin] = useState(false)
  const [edits, setEdits] = useState<Record<string, ResourceEditRow>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editLink, setEditLink] = useState('')
  const [saving, setSaving] = useState(false)

  // Load admin status and resource edits
  const loadEdits = useCallback(async () => {
    const supabase = createClient()

    // Check admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single() as unknown as { data: { role: string } | null }
      setIsAdmin(profile?.role === 'admin')
    }

    // Load all edits
    const { data: editRows } = await supabase
      .from('resource_edits')
      .select('*') as unknown as { data: ResourceEditRow[] | null }

    if (editRows) {
      const map: Record<string, ResourceEditRow> = {}
      for (const row of editRows) {
        map[row.resource_key] = row
      }
      setEdits(map)
    }
  }, [])

  useEffect(() => {
    loadEdits()
  }, [loadEdits])

  // Merge static resources with DB edits
  const mergedResources = useMemo(() => {
    return RESOURCES.map(r => {
      const key = toResourceKey(r.title)
      const edit = edits[key]
      if (!edit) return { ...r, _key: key }
      return {
        ...r,
        _key: key,
        title: edit.title ?? r.title,
        content: edit.content ?? r.content,
        link: edit.link ?? r.link,
      }
    })
  }, [edits])

  // Deep link: #directory / #events jump to those tabs; a category key or a
  // resource slug opens the Camp Guide tab focused on that item.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return

    if (hash === 'directory' || hash === 'events') {
      setMainTab(hash)
      return
    }

    // Check if hash matches a category key first
    if (hash in CATEGORIES) {
      setMainTab('guide')
      setActiveCategory(hash as ResourceCategory)
    } else {
      const matchingResource = RESOURCES.find(r => r.slug === hash)
      if (matchingResource) {
        setMainTab('guide')
        setActiveCategory(matchingResource.category)
        setOpenSlug(hash)
        scrolledRef.current = false
      }
    }
  }, [])

  // Scroll to the opened resource after render
  useEffect(() => {
    if (openSlug && !scrolledRef.current) {
      const el = document.getElementById(`resource-${openSlug}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        scrolledRef.current = true
      }
    }
  }, [openSlug])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return mergedResources.filter((r) => {
      const matchesCategory = activeCategory === 'all' || r.category === activeCategory
      if (!matchesCategory) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [search, activeCategory, mergedResources])

  // Start editing a resource
  function startEditing(resource: Resource & { _key: string }) {
    const key = resource._key
    const edit = edits[key]
    setEditingKey(key)
    setEditTitle(edit?.title ?? resource.title)
    setEditContent(edit?.content ?? resource.content)
    setEditLink(edit?.link ?? resource.link ?? '')
  }

  // Save edit to DB
  async function saveEdit() {
    if (!editingKey) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        resource_key: editingKey,
        title: editTitle,
        content: editContent,
        link: editLink || null,
        edited_by: user?.id || null,
      }

      // Upsert: insert if new, update if exists
      const existing = edits[editingKey]
      if (existing) {
        await supabase
          .from('resource_edits')
          .update(payload as never)
          .eq('id' as never, existing.id)
      } else {
        await supabase
          .from('resource_edits')
          .insert(payload as never)
      }

      await loadEdits()
      setEditingKey(null)
    } catch (err) {
      console.error('Failed to save resource edit:', err)
    } finally {
      setSaving(false)
    }
  }

  // Revert edit (delete from DB)
  async function revertEdit(resourceKey: string) {
    const existing = edits[resourceKey]
    if (!existing) return
    const supabase = createClient()
    await supabase
      .from('resource_edits')
      .delete()
      .eq('id' as never, existing.id)
    await loadEdits()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-yellow-400 border-b-4 border-black pt-12 pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
            Resources
          </h1>
          <p className="text-lg text-black/70 max-w-2xl">
            One page can&apos;t possibly tell you everything you need to know about Burning Man and NYC Deli, so talk to people, engage, ask, question, be resourceful on your own. Do NOT rely on this page alone — it&apos;s just some shit that others thought was helpful at some point.
          </p>
        </div>
      </section>

      {/* Top-level tabs (sticky so they stay reachable while scrolling) */}
      <div className="sticky top-0 z-20 bg-yellow-400 border-b-4 border-black shadow-[0_4px_0_0_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 flex gap-0" role="tablist" aria-label="Resource sections">
          {MAIN_TABS.map((t) => {
            const active = mainTab === t.key
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setMainTab(t.key)}
                className={`flex-1 px-3 py-3 text-left border-r-2 border-black last:border-r-0 -mb-1 border-b-4 transition-colors ${
                  active
                    ? 'bg-black text-yellow-400 border-b-yellow-400'
                    : 'bg-yellow-400 text-black/70 border-b-transparent hover:bg-yellow-300'
                }`}
              >
                <span className="block text-sm md:text-base font-black uppercase tracking-tight leading-none">
                  {t.icon} {t.label}
                </span>
                <span className={`hidden sm:block text-[11px] font-medium mt-1 leading-tight ${active ? 'text-yellow-200/80' : 'text-black/50'}`}>
                  {t.blurb}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── BRC Directory tab (Burning Man Public API) ── */}
      {mainTab === 'directory' && (
        <section className="py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <BrcDirectory />
          </div>
        </section>
      )}

      {/* ── What's On tab — Playa Events feed (Burning Man Public API) ── */}
      {mainTab === 'events' && (
        <section className="py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <WhatsOn />
          </div>
        </section>
      )}

      {/* ── Camp Guide tab (static curated resources) ── */}
      {mainTab === 'guide' && (
      <>
      {/* Search & Filters */}
      <section className="py-8 px-4 border-b-2 border-black/10">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input
              type="text"
              placeholder="Search resources… (e.g. packing, shifts, gifting, MOOP, shower)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-black text-sm font-medium bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black transition-all ${
                activeCategory === 'all'
                  ? 'bg-black text-yellow-400'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              All ({RESOURCES.length})
            </button>
            {(Object.entries(CATEGORIES) as [ResourceCategory, (typeof CATEGORIES)[ResourceCategory]][]).map(
              ([key, cat]) => {
                const count = RESOURCES.filter((r) => r.category === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black transition-all ${
                      activeCategory === key
                        ? 'bg-black text-yellow-400'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {cat.icon} {cat.label} ({count})
                  </button>
                )
              }
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-bold text-gray-500">No resources found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                {filtered.length} resource{filtered.length !== 1 ? 's' : ''} found
              </p>
              {filtered.map((resource, idx) => {
                const cat = CATEGORIES[resource.category]
                const rKey = resource._key
                const hasEdit = !!edits[rKey]
                const isEditing = editingKey === rKey
                return (
                  <details
                    key={idx}
                    id={resource.slug ? `resource-${resource.slug}` : undefined}
                    open={resource.slug === openSlug || isEditing || undefined}
                    className="group border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] open:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 list-none">
                      <span className="text-lg shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm uppercase tracking-wide text-black truncate">
                          {resource.title}
                          {hasEdit && <span className="ml-2 text-[9px] text-amber-600 font-normal normal-case">(edited)</span>}
                        </h3>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={e => { e.preventDefault(); startEditing(resource) }}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-gray-300 bg-gray-50 hover:bg-yellow-100 hover:border-black rounded transition-colors"
                          title="Edit this resource"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <span
                        className={`hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cat.color}`}
                      >
                        {cat.label}
                      </span>
                      <span className="text-gray-400 group-open:rotate-90 transition-transform text-sm">
                        ▶
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-black/10">
                      {isEditing ? (
                        /* ── Inline Edit Form ── */
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Content <span className="text-[9px] font-normal text-gray-500">(supports **bold** markdown)</span>
                            </label>
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              rows={12}
                              className="w-full px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono resize-y"
                            />
                          </div>
                          {resource.link !== undefined && (
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Link URL</label>
                              <input
                                type="url"
                                value={editLink}
                                onChange={e => setEditLink(e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                placeholder="https://..."
                              />
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black bg-green-400 hover:bg-green-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-colors"
                            >
                              {saving ? 'Saving...' : '💾 Save'}
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black bg-gray-100 hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors"
                            >
                              Cancel
                            </button>
                            {hasEdit && (
                              <button
                                onClick={async () => { await revertEdit(rKey); setEditingKey(null) }}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-red-500 text-red-600 bg-red-50 hover:bg-red-100 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.3)] transition-colors ml-auto"
                              >
                                ↩ Revert to Original
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* ── Normal Display ── */
                        <>
                          <div
                            className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line [&_strong]:text-black"
                            dangerouslySetInnerHTML={{
                              __html: resource.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ')
                                .trim(),
                            }}
                          />
                          {resource.link && (
                            <a
                              href={resource.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              🔗 Visit Link
                            </a>
                          )}
                          {resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {resource.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setSearch(tag)}
                                  className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors cursor-pointer"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>
      </section>
      </>
      )}

      {/* Footer CTA */}
      <section className="pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-50 border-2 border-black p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
            <p className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-1">
              Have a question not covered here?
            </p>
            <p className="text-sm text-gray-400">
              DM Brian on WhatsApp or ask in the camp chat — no question is too small.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
