// Curated base packing list for Burning Man campers
// Parsed and organized from the comprehensive NYC Deli Rats camp guide
// Priority: 'must' = essential, 'nice' = recommended, 'optional' = luxury/situational

export type PackingPriority = 'must' | 'nice' | 'optional'

export interface BasePackingItem {
  category: string
  item: string
  priority: PackingPriority
  notes?: string
}

export const BASE_PACKING_LIST: BasePackingItem[] = [
  // ═══════════════════════════════════════════
  // TICKETS & DOCUMENTATION
  // ═══════════════════════════════════════════
  { category: 'Tickets & Documentation', item: 'Burning Man ticket (physical)', priority: 'must' },
  { category: 'Tickets & Documentation', item: 'Vehicle pass', priority: 'must' },
  { category: 'Tickets & Documentation', item: 'Photo ID + photocopy for bars', priority: 'must', notes: 'Bars on playa verify drinking age. Keep original locked away, carry photocopy.' },
  { category: 'Tickets & Documentation', item: 'Cash (for ice at Arctica)', priority: 'must', notes: 'Ice is ~$3 per bag/block' },
  { category: 'Tickets & Documentation', item: 'Printed passes (early arrival, confirmations)', priority: 'must', notes: 'Don\'t count on cell/wifi at the gate' },
  { category: 'Tickets & Documentation', item: 'Medical insurance card', priority: 'nice' },
  { category: 'Tickets & Documentation', item: 'Credit cards', priority: 'nice' },
  { category: 'Tickets & Documentation', item: 'Contact info labels for belongings', priority: 'must', notes: 'Put on camera, CamelBak, bike, phone — helps people return lost items' },

  // ═══════════════════════════════════════════
  // WATER & HYDRATION
  // ═══════════════════════════════════════════
  { category: 'Water & Hydration', item: 'Water supply (1.5-2 gal/person/day)', priority: 'must', notes: 'For drinking, cleaning, and light hygiene. Freeze some jugs for cooler travel.' },
  { category: 'Water & Hydration', item: 'Hydration pack (CamelBak 2-3L)', priority: 'must', notes: 'Should be comfortable for all-day wear' },
  { category: 'Water & Hydration', item: 'Reusable cup with lid & carabiner', priority: 'must', notes: 'Clip to belt. Lid prevents dust. Other camps won\'t have cups for you.' },
  { category: 'Water & Hydration', item: 'Electrolyte powder/tabs (Liquid IV, Nuun)', priority: 'must', notes: 'Add to every refill to prevent heat exhaustion' },
  { category: 'Water & Hydration', item: 'Coconut water', priority: 'nice', notes: 'Great for staying hydrated' },
  { category: 'Water & Hydration', item: 'Pedialyte', priority: 'nice', notes: 'Great for hangovers and staying well hydrated' },
  { category: 'Water & Hydration', item: 'Emergen-C packets', priority: 'must' },

  // ═══════════════════════════════════════════
  // SHELTER & SLEEP
  // ═══════════════════════════════════════════
  { category: 'Shelter & Sleep', item: 'Tent / Shiftpod / Hexayurt', priority: 'must', notes: 'The less mesh the better — should close completely. Leave room for costumes!' },
  { category: 'Shelter & Sleep', item: 'Shade structure (Aluminet preferred)', priority: 'must', notes: 'Reflects 70% of heat with airflow. Without shade, tents are ovens by 8 AM.' },
  { category: 'Shelter & Sleep', item: 'Lag bolts 3/8"x14" or heavy rebar stakes', priority: 'must', notes: 'Standard stakes fail in 60mph winds. Lag bolts + impact driver are far more effective.' },
  { category: 'Shelter & Sleep', item: 'Rebar end covers (tennis balls or caps)', priority: 'must', notes: 'Safety requirement — cut across the logo on tennis balls to find them next year' },
  { category: 'Shelter & Sleep', item: 'Impact driver (for lag bolts)', priority: 'must' },
  { category: 'Shelter & Sleep', item: 'Sleeping bag (rated for 40°F)', priority: 'must' },
  { category: 'Shelter & Sleep', item: 'Sleeping pad or cot', priority: 'must', notes: 'Put padding between you and air mattress — air gets cold/hot with temp swings' },
  { category: 'Shelter & Sleep', item: 'Pillows (double-cased to keep out dust)', priority: 'must' },
  { category: 'Shelter & Sleep', item: 'Warm blankets', priority: 'must', notes: 'Insulation blanket between air mattress & bedding is key' },
  { category: 'Shelter & Sleep', item: 'Dust rug/mat for tent entrance', priority: 'must', notes: 'Artificial turf or rug traps dust before it enters' },
  { category: 'Shelter & Sleep', item: 'Battery-powered fan or evaporative cooler', priority: 'nice', notes: 'Rechargeable fan is a game-changer for sleep' },
  { category: 'Shelter & Sleep', item: 'Small brush/dustpan for tent', priority: 'nice' },
  { category: 'Shelter & Sleep', item: 'Battery-powered handheld vacuum', priority: 'nice', notes: 'Game-changer for keeping sleeping area livable' },
  { category: 'Shelter & Sleep', item: 'Tarp/plastic sheet to cover bed', priority: 'nice', notes: 'Dust WILL get in no matter what — this protects your bedding' },
  { category: 'Shelter & Sleep', item: 'Full-length mirror', priority: 'nice', notes: 'Great for checking outfits. Secure it so it doesn\'t break.' },
  { category: 'Shelter & Sleep', item: 'Small personal mirror', priority: 'must' },

  // ═══════════════════════════════════════════
  // CLOTHING - DAYWEAR
  // ═══════════════════════════════════════════
  { category: 'Clothing - Daywear', item: 'Lightweight breathable tops (5+)', priority: 'must', notes: 'Linen, cotton — light fabrics only' },
  { category: 'Clothing - Daywear', item: 'Shorts (3+)', priority: 'must' },
  { category: 'Clothing - Daywear', item: 'Pants/bottoms (2+, linen or cotton)', priority: 'must' },
  { category: 'Clothing - Daywear', item: 'Underwear (10+ pairs, cotton)', priority: 'must' },
  { category: 'Clothing - Daywear', item: 'Socks (10+ pairs, merino wool best)', priority: 'must', notes: 'New pack recommended. Merino stays dry and doesn\'t hold odors like cotton.' },
  { category: 'Clothing - Daywear', item: 'Costumes / fun outfits (3-5, MOOP-free)', priority: 'must', notes: 'No sequins, feathers, or glitter — they become litter. Be creative!' },
  { category: 'Clothing - Daywear', item: 'Cool comfortable PJs', priority: 'must', notes: 'You may be sleeping during the day' },
  { category: 'Clothing - Daywear', item: 'Camp teardown outfit (sealed in ziplock)', priority: 'must' },
  { category: 'Clothing - Daywear', item: 'Drive-home outfit (sealed in ziplock)', priority: 'must' },
  { category: 'Clothing - Daywear', item: 'White outfit (for white party)', priority: 'nice' },
  { category: 'Clothing - Daywear', item: 'Sarongs / kilts', priority: 'nice' },
  { category: 'Clothing - Daywear', item: 'Tutu (yes, everyone)', priority: 'nice', notes: 'Tutu Tuesdays!' },
  { category: 'Clothing - Daywear', item: 'Accessories (scarves, belts, wigs, chains)', priority: 'nice' },

  // ═══════════════════════════════════════════
  // CLOTHING - COLD WEATHER
  // ═══════════════════════════════════════════
  { category: 'Clothing - Cold Weather', item: 'Heavy warm coat (faux fur or down)', priority: 'must', notes: 'Night temps drop to 40°F. This is non-negotiable.' },
  { category: 'Clothing - Cold Weather', item: 'Warm layers / fleece', priority: 'must' },
  { category: 'Clothing - Cold Weather', item: 'Gloves or mittens', priority: 'must' },
  { category: 'Clothing - Cold Weather', item: 'Lightweight jacket / hoodie', priority: 'must', notes: 'For transitional temperatures (dusk/dawn)' },
  { category: 'Clothing - Cold Weather', item: 'Long underwear / thermals', priority: 'nice' },
  { category: 'Clothing - Cold Weather', item: 'Warm hat (fleece or fur)', priority: 'nice' },
  { category: 'Clothing - Cold Weather', item: 'Wool or polypro socks', priority: 'nice' },

  // ═══════════════════════════════════════════
  // FOOTWEAR & ACCESSORIES
  // ═══════════════════════════════════════════
  { category: 'Footwear & Accessories', item: 'Broken-in boots (combat or hiking)', priority: 'must', notes: 'Must be broken in before playa. Avoid mesh — dust fills them instantly.' },
  { category: 'Footwear & Accessories', item: 'Comfortable sandals/flip-flops for camp', priority: 'must' },
  { category: 'Footwear & Accessories', item: 'Party shoes / platform boots', priority: 'nice', notes: 'Stilettos not recommended on playa' },
  { category: 'Footwear & Accessories', item: 'Utility belt / fanny pack / small backpack', priority: 'must', notes: 'For ID, cash, tissue, lip balm — keep essentials on you' },
  { category: 'Footwear & Accessories', item: 'Wide-brim hat for sun', priority: 'must' },
  { category: 'Footwear & Accessories', item: 'Warm beanie', priority: 'must' },
  { category: 'Footwear & Accessories', item: 'Sunglasses (2+ pairs)', priority: 'must' },
  { category: 'Footwear & Accessories', item: 'Scarves / buffs for dust (2+)', priority: 'must' },
  { category: 'Footwear & Accessories', item: 'Bandannas', priority: 'nice', notes: 'Great dust mask + soak in water and wear on neck/head when overheated' },

  // ═══════════════════════════════════════════
  // SUN & DUST PROTECTION
  // ═══════════════════════════════════════════
  { category: 'Sun & Dust Protection', item: 'Sunscreen SPF 50+ (body & face)', priority: 'must' },
  { category: 'Sun & Dust Protection', item: 'Lip balm with SPF 15+', priority: 'must', notes: 'Bring several — by bed, in bag, etc.' },
  { category: 'Sun & Dust Protection', item: 'Sealed goggles (day pair + night pair)', priority: 'must', notes: 'Night dust storms / whiteouts happen!' },
  { category: 'Sun & Dust Protection', item: 'Dust masks / N95 rated (4+)', priority: 'must', notes: 'Add essential oil drops for easier breathing' },
  { category: 'Sun & Dust Protection', item: 'Parasol / umbrella', priority: 'nice', notes: 'Rain or shine — Chinese parasols work great' },
  { category: 'Sun & Dust Protection', item: 'Spray bottle/mister', priority: 'nice', notes: 'Add a little vinegar or lemon juice to help with alkalinity. Great gifting item.' },
  { category: 'Sun & Dust Protection', item: 'Gel eye mask / cooling neckerchief', priority: 'nice', notes: 'Chill in cooler — helps a lot when overheated' },

  // ═══════════════════════════════════════════
  // PERSONAL CARE & HYGIENE
  // ═══════════════════════════════════════════
  { category: 'Personal Care & Hygiene', item: 'Baby wipes / body wipes (lots)', priority: 'must', notes: '"Playa showers" — bring more than you think you need' },
  { category: 'Personal Care & Hygiene', item: 'Toiletries (toothbrush, toothpaste, deodorant)', priority: 'must', notes: 'Try to bring biodegradable products' },
  { category: 'Personal Care & Hygiene', item: 'Shampoo & conditioner', priority: 'must', notes: 'Biodegradable preferred' },
  { category: 'Personal Care & Hygiene', item: 'Towels (2, quick-dry)', priority: 'must' },
  { category: 'Personal Care & Hygiene', item: 'Heavy-duty moisturizer/lotion', priority: 'must', notes: 'Bring several — by bed, in bag, etc.' },
  { category: 'Personal Care & Hygiene', item: 'Hand sanitizer (60%+ alcohol)', priority: 'must', notes: 'Keep a small one on you at all times. Use before every meal.' },
  { category: 'Personal Care & Hygiene', item: 'Vinegar spray bottle (1:4 vinegar:water)', priority: 'must', notes: 'Neutralizes alkaline playa dust on skin/feet. Follow with heavy lotion.' },
  { category: 'Personal Care & Hygiene', item: 'Lubricating eye drops / saline', priority: 'must', notes: 'Dust is extremely drying — use 3-4 times a day even without contacts' },
  { category: 'Personal Care & Hygiene', item: 'Nasal saline spray', priority: 'must', notes: 'Use 3-4 times daily. Essential for dust recovery.' },
  { category: 'Personal Care & Hygiene', item: 'Kleenex / tissue packs', priority: 'must', notes: 'Port-o-potties run out of TP constantly. Only 1-ply in portos!' },
  { category: 'Personal Care & Hygiene', item: 'Ear plugs', priority: 'must', notes: 'For sound camps and sleeping — Burning Man is loud everywhere' },
  { category: 'Personal Care & Hygiene', item: 'Eye shades for sleeping', priority: 'must', notes: 'You will need these no matter how deeply you sleep' },
  { category: 'Personal Care & Hygiene', item: 'Biodegradable soap', priority: 'must' },
  { category: 'Personal Care & Hygiene', item: 'Bag Balm / O\'Keeffe\'s for hands & feet', priority: 'nice', notes: 'Apply before playa and once daily. Prevents dehydration and cracking.' },
  { category: 'Personal Care & Hygiene', item: 'Neti pot & saline', priority: 'nice', notes: 'Cleanses nasal passages — not table salt, use proper saline' },
  { category: 'Personal Care & Hygiene', item: 'Essential oils (peppermint, eucalyptus)', priority: 'nice', notes: 'Drop in dust mask for easier breathing. Great gifting item too.' },
  { category: 'Personal Care & Hygiene', item: 'Throat lozenges', priority: 'nice', notes: 'You breathe in a lot of dust — these help a lot' },
  { category: 'Personal Care & Hygiene', item: 'Vitamins / multivitamins', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'TP (single-ply, extra rolls)', priority: 'nice', notes: 'Septic-safe single-ply only. Porto\'s run out all the time.' },
  { category: 'Personal Care & Hygiene', item: 'Gum', priority: 'nice', notes: 'Nice to have and to share' },
  { category: 'Personal Care & Hygiene', item: 'Moleskin (for blisters)', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'Medical tape (plastic or cloth)', priority: 'nice', notes: 'Bandages don\'t stay on well — great for wrapping cracked fingers' },
  { category: 'Personal Care & Hygiene', item: 'Bug protection / repellent', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'Aloe / burn lotion', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'Arnica / muscle rub', priority: 'nice', notes: 'Helps after setup and all the physical activity' },
  { category: 'Personal Care & Hygiene', item: 'Gold Bond powder', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'Condoms & lubricant', priority: 'nice' },
  { category: 'Personal Care & Hygiene', item: 'Ladies: Tampons or menstrual cup', priority: 'nice', notes: 'Even off-cycle it may surprise you. NEVER put tampons in porto-potties!' },

  // ═══════════════════════════════════════════
  // HEALTH & FIRST AID
  // ═══════════════════════════════════════════
  { category: 'Health & First Aid', item: 'First aid kit (bandaids, ibuprofen, antacids)', priority: 'must' },
  { category: 'Health & First Aid', item: 'Prescription medications (in labeled bottles)', priority: 'must', notes: 'Must be in prescription bottle with your name — otherwise problems with law enforcement' },
  { category: 'Health & First Aid', item: 'Extra contacts / glasses', priority: 'must' },
  { category: 'Health & First Aid', item: 'Burn gel & liquid bandage', priority: 'nice', notes: 'Open wounds heal very slowly on playa. Liquid bandage or hydrocolloid pads work best.' },
  { category: 'Health & First Aid', item: 'Super glue (for wounds)', priority: 'nice', notes: 'Also apply to cuticles before playa to prevent cracking' },
  { category: 'Health & First Aid', item: 'Laxative', priority: 'nice', notes: 'Easy to get dehydrated — med tents don\'t carry this, bring your own' },
  { category: 'Health & First Aid', item: 'Neosporin', priority: 'nice', notes: 'For dry cracked noses — apply to inside edge to prevent nosebleeds' },
  { category: 'Health & First Aid', item: 'Recovery vitamins / 5HTP', priority: 'nice' },
  { category: 'Health & First Aid', item: 'Hand warmers (rechargeable or chemical)', priority: 'nice' },

  // ═══════════════════════════════════════════
  // BATHING
  // ═══════════════════════════════════════════
  { category: 'Bathing', item: 'Solar shower (3 gallon)', priority: 'must', notes: 'Heats water to 120°F in a few hours' },
  { category: 'Bathing', item: 'Water catch bin (for under shower)', priority: 'must', notes: 'Use a storage bin that carried your stuff out — double duty' },
  { category: 'Bathing', item: 'Flip flops / water shoes for shower', priority: 'nice' },
  { category: 'Bathing', item: 'Nail brush', priority: 'nice' },

  // ═══════════════════════════════════════════
  // KITCHEN & COOKING
  // ═══════════════════════════════════════════
  { category: 'Kitchen & Cooking', item: 'Cooler (high quality, with drain spigot)', priority: 'must', notes: 'Yeti/RTIC style to minimize ice runs' },
  { category: 'Kitchen & Cooking', item: 'Airtight storage bins (clear)', priority: 'must', notes: 'Keep dust out of food. Clear bins let you see contents.' },
  { category: 'Kitchen & Cooking', item: 'Trash bags (contractor grade)', priority: 'must', notes: 'Pack it in, pack it out! 2-3 rolls of heavy-duty bags.' },
  { category: 'Kitchen & Cooking', item: 'Utensils, plates, bowls, cups', priority: 'must', notes: 'Bring an extra set in case someone forgot theirs' },
  { category: 'Kitchen & Cooking', item: 'Biodegradable dish soap & sponge', priority: 'must' },
  { category: 'Kitchen & Cooking', item: 'Zip-lock bags (gallon + quart)', priority: 'must', notes: 'For food once opened & for dust protection' },
  { category: 'Kitchen & Cooking', item: 'Gray water container', priority: 'must', notes: 'Sealed jug to carry out water used for cooking/cleaning' },
  { category: 'Kitchen & Cooking', item: 'Dish washing tubs with lids (3)', priority: 'must', notes: 'Can double as storage bins to/from BM' },
  { category: 'Kitchen & Cooking', item: 'Mesh bags for drying wet trash', priority: 'must', notes: 'Drying trash before bagging cuts down on smell dramatically' },
  { category: 'Kitchen & Cooking', item: 'Cookware (pots, pans, cooking tools)', priority: 'nice', notes: 'If camp doesn\'t provide' },
  { category: 'Kitchen & Cooking', item: 'Cutting board & knife', priority: 'nice' },
  { category: 'Kitchen & Cooking', item: 'Collapsible silicone camping gear', priority: 'nice', notes: 'Bowls, cups, coffee makers — Sea to Summit brand recommended' },
  { category: 'Kitchen & Cooking', item: 'Blocks to raise cooler off ground', priority: 'nice', notes: 'Heat transfers from playa — raising cooler makes ice last longer' },
  { category: 'Kitchen & Cooking', item: 'Extra blanket for cooler insulation', priority: 'nice' },
  { category: 'Kitchen & Cooking', item: 'Flask & flask funnel', priority: 'nice' },
  { category: 'Kitchen & Cooking', item: 'Thermos', priority: 'nice', notes: 'Hot tea or chocolate for cold playa nights' },

  // ═══════════════════════════════════════════
  // FOOD & MEALS
  // ═══════════════════════════════════════════
  { category: 'Food & Meals', item: 'Pre-cooked frozen meals', priority: 'must', notes: 'Act as ice in cooler for first days. Only need reheating.' },
  { category: 'Food & Meals', item: 'Bread (in tupperware in cooler)', priority: 'nice' },
  { category: 'Food & Meals', item: 'Peanut butter & jelly', priority: 'nice' },
  { category: 'Food & Meals', item: 'Eggs (hard boiled, pre-peeled)', priority: 'nice', notes: 'Perfect protein packs — boil & peel at home' },
  { category: 'Food & Meals', item: 'Pickles', priority: 'nice', notes: 'Helps balance body with high alkaline environment' },
  { category: 'Food & Meals', item: 'High-protein snacks (nuts, jerky, bars)', priority: 'must' },
  { category: 'Food & Meals', item: 'Trail mix / dried fruit', priority: 'must' },
  { category: 'Food & Meals', item: 'Chips & salsa / hummus', priority: 'nice', notes: 'The salt tastes so good on playa' },
  { category: 'Food & Meals', item: 'Cheese, salami & crackers', priority: 'nice' },
  { category: 'Food & Meals', item: 'Fresh fruit (bananas, oranges)', priority: 'nice', notes: 'Use green bags + open tupperware on ice' },
  { category: 'Food & Meals', item: 'Vegetables (hardy: cucumbers, peppers, avocado)', priority: 'nice', notes: 'Keep in plastic container — don\'t submerge in ice water directly' },
  { category: 'Food & Meals', item: 'Granola / cereal & yogurt', priority: 'nice' },
  { category: 'Food & Meals', item: 'Baby food pouches (organic)', priority: 'nice', notes: 'Moist easy protein when you can\'t eat but know you need to' },
  { category: 'Food & Meals', item: 'Chocolate / sweets', priority: 'nice', notes: 'Refrigerate before departure. Keep away from heat.' },

  // ═══════════════════════════════════════════
  // DRINKS & BEVERAGES
  // ═══════════════════════════════════════════
  { category: 'Drinks & Beverages', item: 'Coffee / tea (instant)', priority: 'must' },
  { category: 'Drinks & Beverages', item: 'Energy shots', priority: 'nice' },
  { category: 'Drinks & Beverages', item: 'Shelf-stable milk (almond/soy/oat)', priority: 'nice', notes: 'Shelf-stable boxes save cooler space' },
  { category: 'Drinks & Beverages', item: 'Frozen juice (acts as ice first days)', priority: 'nice' },
  { category: 'Drinks & Beverages', item: 'Beer (cans only)', priority: 'optional', notes: 'Cans = less trash than bottles. Bring to recycling camp.' },
  { category: 'Drinks & Beverages', item: 'Liquor (plastic bottles only)', priority: 'optional' },
  { category: 'Drinks & Beverages', item: 'Mixers', priority: 'optional' },
  { category: 'Drinks & Beverages', item: 'Box wine', priority: 'optional', notes: 'Box = less trash than bottles' },

  // ═══════════════════════════════════════════
  // BIKE & TRANSPORTATION
  // ═══════════════════════════════════════════
  { category: 'Bike & Transportation', item: 'Bicycle (fat tires, comfy seat)', priority: 'must', notes: 'Crucial for getting around. Use a cheap one — playa dust kills bikes.' },
  { category: 'Bike & Transportation', item: 'Bike lights (front white + rear red)', priority: 'must', notes: 'Mandatory for night riding' },
  { category: 'Bike & Transportation', item: 'Bike lock (combination preferred)', priority: 'must', notes: 'Even on playa, bikes go "missing." Always lock up, even in camp.' },
  { category: 'Bike & Transportation', item: 'Duct tape label on bike (name, camp, address)', priority: 'must', notes: 'Has gotten bikes returned to friends before' },
  { category: 'Bike & Transportation', item: 'Kickstand with enlarged foot', priority: 'must', notes: 'Use a tennis ball or similar at the base so it doesn\'t sink' },
  { category: 'Bike & Transportation', item: 'LED fairy lights for bike frame', priority: 'must', notes: 'Wrap frame in lights — must be visible from all directions at night' },
  { category: 'Bike & Transportation', item: 'Bike decorations (make it distinct)', priority: 'nice' },
  { category: 'Bike & Transportation', item: 'Basket or cargo carrier', priority: 'nice' },
  { category: 'Bike & Transportation', item: 'Bike chain lube', priority: 'nice' },
  { category: 'Bike & Transportation', item: 'Portable pump', priority: 'nice' },
  { category: 'Bike & Transportation', item: 'Spare tubes & repair kit', priority: 'nice', notes: 'Bike repair camps exist but be self-reliant' },
  { category: 'Bike & Transportation', item: 'Tire slime (pre-fill tubes)', priority: 'nice', notes: 'Prevents flats from goathead thorns' },

  // ═══════════════════════════════════════════
  // LIGHTING & VISIBILITY
  // ═══════════════════════════════════════════
  { category: 'Lighting & Visibility', item: 'Headlamp + extra batteries (2+)', priority: 'must' },
  { category: 'Lighting & Visibility', item: '360° LED body lighting (EL-wire or clip-on LEDs)', priority: 'must', notes: 'You MUST be visible from all directions at night — "darkwads" get hit' },
  { category: 'Lighting & Visibility', item: 'Flashlight / camp night light', priority: 'must' },
  { category: 'Lighting & Visibility', item: 'Tent lantern (battery-powered)', priority: 'must' },
  { category: 'Lighting & Visibility', item: 'Lighting for guy lines & anchors', priority: 'must', notes: 'Light up guy lines so people don\'t trip! Put up as soon as structure goes up.' },
  { category: 'Lighting & Visibility', item: 'LED solar lawn lights', priority: 'nice', notes: 'Fit over rebar nicely around camp perimeter' },
  { category: 'Lighting & Visibility', item: 'Solar string lights for camp', priority: 'nice' },

  // ═══════════════════════════════════════════
  // ELECTRONICS & POWER
  // ═══════════════════════════════════════════
  { category: 'Electronics & Power', item: 'Power bank (20,000mAh+)', priority: 'must', notes: 'For charging lights and phone' },
  { category: 'Electronics & Power', item: 'Charging cables (all types needed)', priority: 'must' },
  { category: 'Electronics & Power', item: 'Camera (labeled with contact info)', priority: 'must', notes: 'Take a photo of your contact info as first pic in case lost' },
  { category: 'Electronics & Power', item: 'Batteries (extra for everything)', priority: 'must', notes: 'Consider rechargeable + solar charger. Lots of AA and D.' },
  { category: 'Electronics & Power', item: 'Camera charger', priority: 'must' },
  { category: 'Electronics & Power', item: '12V car inverter', priority: 'nice' },
  { category: 'Electronics & Power', item: 'Walkie talkies', priority: 'nice' },
  { category: 'Electronics & Power', item: 'Extension cords (heavy duty)', priority: 'nice', notes: 'If camp has power or you have a generator' },
  { category: 'Electronics & Power', item: 'Power strips', priority: 'nice' },

  // ═══════════════════════════════════════════
  // TOOLS & HARDWARE
  // ═══════════════════════════════════════════
  { category: 'Tools & Hardware', item: 'Duct tape', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Zip ties (long + short, lots)', priority: 'must', notes: 'Can be used in all kinds of ways' },
  { category: 'Tools & Hardware', item: 'Multi-tool / Swiss army knife', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Work gloves (heavy duty)', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Scissors', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Pliers (needle nose + regular)', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Screwdrivers (flat + Phillips)', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Sledgehammer (5lb)', priority: 'must', notes: 'For rebar' },
  { category: 'Tools & Hardware', item: 'Rebar puller / vice grips', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Extra rope / paracord (150\'+ rated 300lb)', priority: 'must', notes: 'Extra guy lines to secure tents in high winds' },
  { category: 'Tools & Hardware', item: 'MOOP bag / container', priority: 'must', notes: 'Something that closes securely. At minimum a gallon ziplock. Empty at camp every return.' },
  { category: 'Tools & Hardware', item: 'Safety pins', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Fire extinguisher (2x)', priority: 'must', notes: 'One for cooking area, one for sleeping area' },
  { category: 'Tools & Hardware', item: 'Butane lighters', priority: 'must' },
  { category: 'Tools & Hardware', item: 'Gorilla Glue', priority: 'must', notes: 'Best for emergency shoe/boot repair on playa' },
  { category: 'Tools & Hardware', item: 'Electrical tape & masking tape', priority: 'must', notes: 'Masking tape for covering logos (Decommodification principle)' },
  { category: 'Tools & Hardware', item: 'Stacking rubber bins for transport', priority: 'must', notes: 'Medium ones are easier to live out of. Make sure lids fit securely.' },
  { category: 'Tools & Hardware', item: 'Bungee cords / tie-downs', priority: 'nice', notes: 'For strapping extra trash to car roof, etc.' },
  { category: 'Tools & Hardware', item: 'Sewing kit', priority: 'nice' },
  { category: 'Tools & Hardware', item: 'Clothespins', priority: 'nice', notes: 'Invaluable for hanging things inside tent or shade structure' },
  { category: 'Tools & Hardware', item: 'Small broom for tent', priority: 'nice' },
  { category: 'Tools & Hardware', item: 'Compressed air (for camera gear)', priority: 'nice' },
  { category: 'Tools & Hardware', item: 'Knee pads', priority: 'optional', notes: 'For pounding or pulling rebar' },
  { category: 'Tools & Hardware', item: 'Compass', priority: 'optional', notes: 'Navigate during whiteouts or pick a random adventure direction' },

  // ═══════════════════════════════════════════
  // CAMP SETUP & HOME
  // ═══════════════════════════════════════════
  { category: 'Camp Setup & Home', item: 'Carpet / floor mat for tent', priority: 'nice', notes: 'Keeps dust down. Roll up and shake out at home — acts like a MOOP magnet.' },
  { category: 'Camp Setup & Home', item: 'Clear hanging wardrobe organizer', priority: 'nice', notes: 'Hang clean clothing inside' },
  { category: 'Camp Setup & Home', item: 'Collapsible clothing rack', priority: 'nice' },
  { category: 'Camp Setup & Home', item: 'Small plastic drawer unit (3-4 drawer)', priority: 'nice', notes: 'Keep by bed for organizing small stuff' },
  { category: 'Camp Setup & Home', item: 'Clear shoe organizer (over-door)', priority: 'nice', notes: 'Great for goggles, lip balm, sunscreen, etc.' },
  { category: 'Camp Setup & Home', item: 'Chairs (arm chair + chaise)', priority: 'nice' },
  { category: 'Camp Setup & Home', item: 'Folding table', priority: 'nice' },
  { category: 'Camp Setup & Home', item: 'Small white board', priority: 'nice', notes: 'Place outside tent for notes and agenda' },
  { category: 'Camp Setup & Home', item: 'Tapestries / decorations', priority: 'nice', notes: 'Make your space a little Shangri-La' },

  // ═══════════════════════════════════════════
  // GIFTING & COMMUNITY
  // ═══════════════════════════════════════════
  { category: 'Gifting & Community', item: 'Gifts (non-MOOP, handmade or service-based)', priority: 'must', notes: 'Can be something you made or do for others. No $ needed. No camp branding (Decommodification).' },
  { category: 'Gifting & Community', item: 'Stickers, cooling mist, or small crafts', priority: 'nice' },
  { category: 'Gifting & Community', item: 'Stamps & postcards', priority: 'nice', notes: 'BRC has a fully-functioning postal service!' },
  { category: 'Gifting & Community', item: 'Small notebook & pen', priority: 'nice', notes: 'Write down events and locations before departure. Keep notes during burn.' },

  // ═══════════════════════════════════════════
  // VEHICLE & TRAVEL
  // ═══════════════════════════════════════════
  { category: 'Vehicle & Travel', item: 'Cover car interior with blankets/sheets', priority: 'must', notes: 'Cuts post-playa cleaning time by more than half' },
  { category: 'Vehicle & Travel', item: 'Set car AC to recirculate at gate', priority: 'must', notes: 'Prevents intake from consuming playa dust. Saves your car.' },
  { category: 'Vehicle & Travel', item: 'Road directions (don\'t rely on phone)', priority: 'must', notes: 'Keep to speed limit after HWY 80 — cops are ready. 10mph on gate road.' },
  { category: 'Vehicle & Travel', item: 'New air filter (to replace post-playa)', priority: 'nice', notes: 'Replace playa-dusted filter ASAP after leaving. Saves engine life.' },
  { category: 'Vehicle & Travel', item: 'Car emergency kit', priority: 'nice', notes: 'Jumper cables, tow cable, flares, tire inflator, first aid' },
  { category: 'Vehicle & Travel', item: 'Cardboard for car windows (blackout)', priority: 'nice' },

  // ═══════════════════════════════════════════
  // EMERGENCY & SAFETY
  // ═══════════════════════════════════════════
  { category: 'Emergency & Safety', item: 'Emergency toilet (5-gal bucket + lid + bags)', priority: 'nice', notes: 'In case of rain lockdown — as seen in recent years' },
  { category: 'Emergency & Safety', item: 'Personal ashtray (Altoid tin)', priority: 'nice', notes: 'If you smoke — full-size Altoid tin works well' },
]

// Get unique categories in display order
export const PACKING_CATEGORIES = [
  'Tickets & Documentation',
  'Water & Hydration',
  'Shelter & Sleep',
  'Clothing - Daywear',
  'Clothing - Cold Weather',
  'Footwear & Accessories',
  'Sun & Dust Protection',
  'Personal Care & Hygiene',
  'Health & First Aid',
  'Bathing',
  'Kitchen & Cooking',
  'Food & Meals',
  'Drinks & Beverages',
  'Bike & Transportation',
  'Lighting & Visibility',
  'Electronics & Power',
  'Tools & Hardware',
  'Camp Setup & Home',
  'Gifting & Community',
  'Vehicle & Travel',
  'Emergency & Safety',
] as const
