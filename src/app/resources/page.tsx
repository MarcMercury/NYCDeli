'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

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
    tags: ['overview', 'intro', 'first-time', 'new burner'],
    content: `Burning Man is an annual gathering in the Black Rock Desert of Nevada, creating a temporary city (Black Rock City) dedicated to community, art, self-expression, and self-reliance. In 2025, over 1,400 theme camps, 5,000 art pieces, and hundreds of art cars (Mutant Vehicles) participated. The event typically runs for a week at the end of August through early September.`,
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
    content: `NYC Deli was founded by Brian at LoveBurn 2022 and has attended LoveBurn and Burning Man every year since. The playa loves our food gift and we have a lot of fun giving it!

**Recognition:**
• LoveBurn Miami offered NYC Deli campers half-price tickets in 2026 to induce us to return.
• BMORG told NYC Deli to "just do it, we trust you" when it comes to administering 60% of our superblock — an unprecedented vote of confidence. Getting this "blank check" from Placement is virtually unheard of for BM camps.`,
  },
  {
    title: 'Camp Size & Recruiting',
    category: 'camp-info',
    tags: ['camp size', 'campers', 'recruiting', 'population'],
    content: `NYC Deli targets ~70-80 campers each year — the number needed to fulfill our service promise and playa gifts: no more, no less.

**Why 70-80?** That's the number of dedicated people required to cover camp's **3× 2.5-hour volunteer shifts** during the event. Compared to many camps, this is a light volunteer commitment — many camps demand far more hours and campers don't find that out until they're in the desert.

**Note:** The 3× 2.5-hour shift commitment is separate from Build and Strike. Early arrival for Build is optional; everyone participates in Strike.`,
  },
  {
    title: 'HUBS — Humans Uniting for Better Sustainability',
    category: 'camp-info',
    tags: ['hubs', 'sister camps', 'infrastructure', 'cost sharing', 'village', 'sustainability'],
    content: `HUBS (Humans Uniting for Better Sustainability) is NYC Deli's infrastructure cost-sharing model. One BM camp with significant infrastructure shares backend gear with other camps — saving everyone money and reducing heavy vehicles on playa (safer and greener).

**Key facts:**
• 4 HUBS sister camps share infrastructure costs, keeping our camp fee at $800 ($500 for Builders)
• Without HUBS, our amenity level would typically cost $2,000+
• BMORG approves of and encourages this model
• HUBS sister camp members have their own separate camps and won't walk through ours
• HUBS replaced the old "Village" model`,
  },
  {
    title: 'Camp Fees & Refund Policy',
    category: 'camp-info',
    tags: ['fees', 'camp fees', 'refund', 'payment', 'deadline', 'money'],
    content: `**Camp Fee:** $800 ($500 for Builders arriving before Build Wednesday)

**Payment Deadlines:**
• If paying in two installments: second half due 7/1
• Campers joining after 6/15: full fee due 7/1
• Two-payment plans: final payment due 7/15

**Refund Policy:**
• No refunds after 7/15 — camp fee money is already with vendors by then
• To request a refund, DM Brian

**Where do fees go?** Example purchases:
• 8,200 gallons of potable water + 3,000-gallon tank rental (Temen Logistics)
• Porto rental + daily cleaning/pumping (United Site Services)
• 100 high-quality NYC Deli aprons (Broken Arrow Printing)
• To/from playa transport of 4× storage containers + annual storage (Peik Construction)`,
  },
  {
    title: 'What Camp Brings to Playa — Big Logistics',
    category: 'camp-info',
    tags: ['logistics', 'truck', 'generator', 'water tank', 'containers', 'shade'],
    content: `NYC Deli brings serious infrastructure:
• 4× 20'×8'×8' full storage containers
• "Treats" — a 30-foot refrigerated truck
• 1× dualie pickup truck
• 1× 120KW generator + heavy distribution gear
• 1× 3,000-gallon water tank + 1× 5,000-gallon backup tank
• 1,000 gallons of grey-water capacity
• Camp shade over all populated, eating, and activity areas`,
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
    tags: ['bike', 'bicycle', 'rental', 'dust rentals', 'transportation'],
    content: `Rent a bike through **Dust Rentals** for on-playa transportation.

• Rental deadline: 7/7 (check WhatsApp Announcements for details)
• If you can't rent by the deadline, DM Brian — he has a side-deal with Dust Rentals to ensure nobody is left behind
• Bikes include on-playa pickup and dropoff
• Always lock your bike and add lights (front + back) for night visibility`,
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
    tags: ['shifts', 'volunteering', 'work', 'food service', 'dj'],
    content: `Each camper commits to **3× 2.5-hour shifts** during the event.

**Shift signup:** A spreadsheet will be posted (check WhatsApp) for you to choose when and what you'll do.

**Common roles:**
• 🍕 Preparing food
• 🍽️ Serving food
• 🎪 Entertaining/managing the food line + guiding bike parking
• 🎵 DJ'ing during food service

**Special role — Camp Day/Night Manager:**
• Must have burned before
• Worth 2 shifts
• DM Brian for details

**Shift etiquette:**
• Show up 10 minutes before your shift starts
• Be sober for your shift
• They're only 2.5 hours — you've got this!`,
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
    content: `NYC Deli is an **a-political and tolerant home** for all campers regardless of race, sex, gender, religion, romantic orientation, or national origin.

**Simple rules (like an old-school bar):** "No politics, no religion" leads to a happy camp.

**Guidelines:**
• Don't espouse a particular religion in camp
• Political activism is best expressed through art — Burning Man is an art festival first
• Camp will even help you bring art!
• Avoid pins, flags, or verbal political activism likely to anger others, especially if unsolicited
• Radical Self-Expression is a BM principle, but there's no principle protecting you from social consequences of that expression
• If anyone feels disrespected, confidentially talk to a Camp Lead or Brian

**TLDR:** NYC Deli is a chosen village and family. Please make an effort to get along.`,
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
    title: 'Camp Events & Social Gatherings',
    category: 'community',
    tags: ['events', 'social', 'picnic', 'movie night', 'dinner', 'central park'],
    content: `**On-Playa Events:**
• 3 sunset trips (optional)
• Short 15-minute daily meetings in Siberia following food service and cleanup (12:30pm, required)

**Pre-Burn Events (examples from past years):**
• Camp picnics in Sheep's Meadow, Central Park
• Camp build days to make bike racks and 8-person couch platforms for the public picnic area
• Movie nights at Brian's loft in Bushwick
• Friday night dinners at Brian's loft (they're Shabbat dinners but non-sectarian — you don't need to be Jewish and no religion is evident)`,
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
]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function ResourcesPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const scrolledRef = useRef(false)

  // Deep link: if URL has #slug, filter to camp-amenities and open that resource
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const matchingResource = RESOURCES.find(r => r.slug === hash)
      if (matchingResource) {
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
    return RESOURCES.filter((r) => {
      const matchesCategory = activeCategory === 'all' || r.category === activeCategory
      if (!matchesCategory) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [search, activeCategory])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-yellow-400 border-b-4 border-black py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
            Resources
          </h1>
          <p className="text-lg text-black/70 max-w-2xl">
            One page can&apos;t possibly tell you everything you need to know about Burning Man and NYC Deli, so talk to people, engage, ask, question, be resourceful on your own. Do NOT rely on this page alone — it&apos;s just some shit that others thought was helpful at some point.
          </p>
        </div>
      </section>

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
                return (
                  <details
                    key={idx}
                    id={resource.slug ? `resource-${resource.slug}` : undefined}
                    open={resource.slug === openSlug || undefined}
                    className="group border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] open:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 list-none">
                      <span className="text-lg shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm uppercase tracking-wide text-black truncate">
                          {resource.title}
                        </h3>
                      </div>
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
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>
      </section>

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
