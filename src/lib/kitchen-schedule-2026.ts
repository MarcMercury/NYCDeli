/**
 * Published NYC Deli shift calendar for Burning Man 2026.
 * Transcribed from public/Shifts + NYC Deli + BM 26.xlsx (sheet "Shift Sheet").
 * Column dates are authoritative; a few section captions in the source sheet
 * still carried 2025 dates and were corrected to the 2026 columns.
 */

export interface ScheduleDay {
  /** ISO date (YYYY-MM-DD) */
  date: string
  weekday: string
  label: string
}

export interface ScheduleRow {
  role: string
  time: string
  note?: string
  countsDouble?: boolean
  requiresExp?: boolean
  /** One entry per SCHEDULE_DAYS column; null = unstaffed */
  days: (string | null)[]
}

export interface ScheduleSection {
  title: string
  note?: string
  time?: string
  rows: ScheduleRow[]
}

export const SCHEDULE_DAYS: ScheduleDay[] = [
  { date: "2026-08-30", weekday: "Sun", label: "8/30" },
  { date: "2026-08-31", weekday: "Mon", label: "8/31" },
  { date: "2026-09-01", weekday: "Tue", label: "9/1" },
  { date: "2026-09-02", weekday: "Wed", label: "9/2" },
  { date: "2026-09-03", weekday: "Thu", label: "9/3" },
  { date: "2026-09-04", weekday: "Fri", label: "9/4" },
  { date: "2026-09-05", weekday: "Sat", label: "9/5" },
  { date: "2026-09-06", weekday: "Sun", label: "9/6" },
]

export const SCHEDULE_SECTIONS: ScheduleSection[] = [
  {
    title: "Deli Shifts",
    note: "Core daily management shifts",
    rows: [
      { role: "Kitchen Lead", time: "As needed", days: [null, "Beck", "Gail", "Beck", "Gail", "Brian", "Brian", null] },
      { role: "Kitchen Supervisor", time: "8:30AM–12:30PM", countsDouble: true, days: [null, "Beck", "Gail", "Jack", "Jake", null, null, null] },
      { role: "Camp Manager Day", time: "10AM–4PM", countsDouble: true, days: ["Geppetto", "Gina", "Marc", "Rina", "Chris", "Joshua", "Miles", null] },
      { role: "Camp Manager Day Deputy", time: "10AM–4PM", countsDouble: true, days: [null, "Tahanna", "Jess", "Erik", "Alex B", "Kim", "Jacen", null] },
      { role: "Camp Manager Night", time: "4PM–10PM", countsDouble: true, days: [null, "Aaron S", "Sophia", "Sara", "Fahim", "Anthony", null, null] },
      { role: "Camp Manager Night Deputy", time: "4PM–10PM", countsDouble: true, days: ["Joshua B", "Tati", "Morgan", "Lina", "Allie S", "Katie", null, null] },
    ],
  },
  {
    title: "Prep Crew",
    note: "5 positions",
    time: "8:30–11:00 AM",
    rows: [
      { role: "Prep Crew", time: "8:30–11:00 AM", days: [null, "Jack", "Yvonne", "Deborah", "Roee", "Dzmitry", "Joanna", null] },
      { role: "Prep Crew", time: "8:30–11:00 AM", days: [null, "Alex B", "Kirill S", "Emily M", "Kirill B", "Liudmila", "Liudmila", null] },
      { role: "Prep Crew", time: "8:30–11:00 AM", days: [null, "Kiera", "Adam", "Tal", "Aaron M", "Adam", "John K", null] },
      { role: "Prep Crew", time: "8:30–11:00 AM", days: [null, "Jaclyn", "DeAnnie", "Eran", "Yvonne", "DeAnnie", "Sundeep", null] },
      { role: "Prep Crew", time: "8:30–11:00 AM", days: [null, "Rishi", "Alaine", "Haim", "Dzmitry", "Deep", "Sharon", null] },
    ],
  },
  {
    title: "Order Taker",
    note: "1 position",
    time: "9:30–12:00",
    rows: [
      { role: "Order Taker & Counter", time: "9:30–12:00", note: "Basically Entertainer", days: [null, "Mikey", "Jaclyn", "Rishi", "Natalie", "Ronny", "Alex C", null] },
    ],
  },
  {
    title: "Grill – Service Shift",
    note: "4 positions",
    time: "9:30–12:00",
    rows: [
      { role: "Grill Lead", time: "9:30–12:00", requiresExp: true, days: [null, "Aaron M", "Jake", "Daniel B", "Kit", "Joanna", "Ethan", null] },
      { role: "Grill", time: "9:30–12:00", days: [null, "Chris", "Dzmitry", "Marie", "Mikey", "Yi", "Chelsey", null] },
      { role: "Grill", time: "9:30–12:00", days: [null, "Lauren H", "Kiera", "Kirill B", "Liudmila", "Daniel K", "Ronny", null] },
      { role: "Grill", time: "9:30–12:00", days: [null, "Caroline", "Isaac", "John K", "Tommy", "Dean", "Ken", null] },
    ],
  },
  {
    title: "Assembly / Deli Service",
    note: "5 positions",
    time: "9:30–12:00",
    rows: [
      { role: "Assembly (Egg + Egg+Cheese)", time: "9:30–12:00", days: [null, "Kali", "Petra", "Kali", "Sara", "Kali", "Tal", null] },
      { role: "Assembly (Schmearer)", time: "9:30–12:00", days: [null, "David", "Richard V", "David", "Lina", "David", "Eran", null] },
      { role: "Assembly (Bacon)", time: "9:30–12:00", days: [null, "Kristina", "Deborah", "Kristina", "Marie", "Kristina", "Shai", null] },
      { role: "Assembly (Coffee + Milk)", time: "9:30–12:00", days: [null, "Jeff", "Emily M", "Jeff", "John K", "Jeff", "Dana", null] },
      { role: "Assembly (Sandwich Counter)", time: "9:30–12:00", days: [null, "Natalie", "Rishi", "Jaclyn", "Ken", "Chelsey", "Dor", null] },
    ],
  },
  {
    title: "Runner",
    note: "2 positions",
    time: "9:30–12:00",
    rows: [
      { role: "Runner (Assist)", time: "9:30–12:00", days: [null, "Sophia", "Richard V", "Elvina", "Daniel B", "Emily G", "Dean", null] },
      { role: "Runner (Assist)", time: "9:30–12:00", days: [null, "Morgan", "Petra", "Dor", "Haim", "John H", "Roee", null] },
    ],
  },
  {
    title: "Security",
    note: "1 position",
    time: "10:00–12:30",
    rows: [
      { role: "Security", time: "10:00–12:30", days: [null, "Kirill S", "Mikey", "Ethan", "Alaine", "Isaac", "Kirill S", null] },
    ],
  },
  {
    title: "Clean-up Crew",
    note: "5 positions",
    time: "12:00–2:30",
    rows: [
      { role: "Clean-up & Service Kitchen Reset", time: "12:00–2:30", days: [null, "Tal", "Rachel", "Adam", "Chelsey", "Natalie", "Kirill B", null] },
      { role: "Clean-up & Service Kitchen Reset", time: "12:00–2:30", days: [null, "Eran", "Lauren H", "DeAnnie", "Dean", "Ken", "Deep", null] },
      { role: "Clean-up & Service Kitchen Reset", time: "12:00–2:30", days: [null, "Shai", "Haim", "Richard V", "Ronny", "Roee", "Yi", null] },
      { role: "Clean-up & Service Kitchen Reset", time: "12:00–2:30", days: [null, "Dana", "Emily G", "Petra", "John H", "Sharon", "Susan", null] },
      { role: "Clean-up & Service Kitchen Reset", time: "12:00–2:30", days: [null, "Dor", "Tara", "Caroline", "Sundeep", "Alaine", "Isaac", null] },
    ],
  },
  {
    title: "Entertainers",
    note: "Up to 4 positions",
    time: "10:00–12:30",
    rows: [
      { role: "Entertainer / Bike Manager", time: "10:00–12:30", days: [null, "Graceanne", "Elvina", "Tahanna", "Deep", "Tommy", "Yvonne", null] },
      { role: "Entertainer / Bike Manager", time: "10:00–12:30", days: [null, "Lauren C", "Caroline", "Gina", "Yi", "Sundeep", "Rachel", null] },
      { role: "Entertainer / Line Manager", time: "10:00–12:30", days: [null, "Geppetto", "Graceanne", "Shai", "Sharon", "Ethan", "Kit", null] },
      { role: "Entertainer / Line Manager", time: "10:00–12:30", days: [null, "Elvina", "Lauren C", "Dana", "Rachel", "Tara", "Tara", null] },
    ],
  },
  {
    title: "Music & DJs",
    note: "3 hours",
    time: "9:30–12:30",
    rows: [
      { role: "DJ", time: "9:30–12:30", days: [null, "Tati", "Alex C", "Paul", "Emily G", "Fahim", "Bubbles Friend", null] },
    ],
  },
  {
    title: "Deep Playa Food Service – Friday 9/4",
    note: "Soup for 1,000 – supporting food service in Deep Playa",
    rows: [
      { role: "Kitchen Lead", time: "3PM–6:30PM", days: [null, null, null, null, null, "Brian", null, null] },
      { role: "Grill Lead", time: "3PM–6:30PM", requiresExp: true, days: [null, null, null, null, null, "Rina", null, null] },
      { role: "Prep Soup", time: "3PM–6:30PM", days: [null, null, null, null, null, "Susan", null, null] },
      { role: "Prep Soup", time: "3PM–6:30PM", days: [null, null, null, null, null, "Marie", null, null] },
      { role: "Prep Soup", time: "3PM–6:30PM", days: [null, null, null, null, null, "Lauren H", null, null] },
      { role: "Transport & Serving Crew", time: "6:30PM–9PM", days: [null, null, null, null, null, "Erik", null, null] },
      { role: "Transport & Serving Crew", time: "6:30PM–9PM", days: [null, null, null, null, null, "Allie S", null, null] },
      { role: "Transport & Serving Crew", time: "6:30PM–9PM", days: [null, null, null, null, null, "Joshua B", null, null] },
      { role: "Transport & Serving Crew", time: "6:30PM–9PM", days: [null, null, null, null, null, "Fahim", null, null] },
    ],
  },
  {
    title: "Strike – Deco + Public Chill Tent",
    note: "Sunday 9/6",
    rows: [
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Joshua W"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Kim"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
    ],
  },
  {
    title: "Strike – Service Kitchen",
    note: "Sunday 9/6",
    rows: [
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Miles"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Jacen"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
    ],
  },
  {
    title: "Strike – Plumbing + Shower Container",
    note: "Sunday 9/6",
    rows: [
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Anthony"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, "Katie"] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
    ],
  },
  {
    title: "Strike – Power",
    note: "Sunday 9/6",
    rows: [
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
    ],
  },
  {
    title: "Strike – Lighting + Shade Squares + Evap Coolers + Bike Racks",
    note: "Sunday 9/6 – ONLY for campers who must depart Sunday afternoon. This is their Exodus Monday strike commitment and does not count as a shift.",
    rows: [
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
      { role: "Striker", time: "8:30AM–11AM", days: [null, null, null, null, null, null, null, null] },
    ],
  },
]

/**
 * Schedule shorthand name -> campers.full_name. null = no matching camper
 * record (external guest, or a name that could not be resolved).
 * "Alaine" and "Kiera" are the same camper. "Haim" and "Ronny" are also the
 * same camper, but the "Haim" shifts are pending reassignment to someone else.
 */
export const SCHEDULE_NAME_TO_CAMPER: Record<string, string | null> = {
  "Aaron M": "Aaron Muilenburg",
  "Aaron S": "Aaron Sheya",
  "Adam": "Adam L Reeder",
  "Alaine": "Alaine Kiera Fredericksen",
  "Alex B": "Alex George Bien",
  "Alex C": "Alex Herbert Chojnacki",
  "Allie S": "Allie Shuldman",
  "Anthony": null,
  "Beck": "Beck Terry",
  "Brian": "Brian William Konash",
  "Bubbles Friend": null,
  "Caroline": "Caroline Trumpff",
  "Chelsey": null,
  "Chris": "Christopher David Arthur Stevenson",
  "Dana": "Dana Olsher",
  "Daniel B": "Daniel Xavier Zarate Bandong",
  "Daniel K": "Danny Korte",
  "David": "David Gomez",
  "DeAnnie": "DeAnnie Kautzer Reeder",
  "Dean": "Dean Preston Shtainhorn",
  "Deborah": "Deborah Frances Newman",
  "Deep": "Deep Vaghela",
  "Dor": "Dor Sasson",
  "Dzmitry": "Dzmitry Bartosh",
  "Elvina": "Elvina Yau",
  "Emily G": null,
  "Emily M": "Emily Kores MacKenzie",
  "Eran": "Eran Zigman",
  "Erik": "Erik Chan",
  "Ethan": "Ethan Alexander Reeder",
  "Fahim": "Fahim Ferdous",
  "Gail": "Gail Feldsherova",
  "Geppetto": "Geppetto",
  "Gina": "Gina Montoya",
  "Graceanne": "Graceanne Ludwig",
  "Haim": null,
  "Isaac": "Isaac Steinberg",
  "Jacen": "Jacen Bruni",
  "Jack": "Jack Campbell Rehmann",
  "Jaclyn": "Jaclyn Holmes",
  "Jake": "Jacob Taylor Kaplan",
  "Jeff": "Jeffrey Louis Brown",
  "Jess": "Jessica Mercury",
  "Joanna": "Joanna Elizabeth Tsai",
  "John H": "TW John House",
  "John K": "John (Nick) Francis Keefe",
  "Joshua": "Joshua Wade Munzenrider",
  "Joshua B": "Joshua Bruff",
  "Joshua W": "Joshua Wu",
  "Kali": "Kali Rosendo",
  "Katie": "Jooyoung Kim (Katie)",
  "Ken": "Kenneth Huffman",
  "Kiera": "Alaine Kiera Fredericksen",
  "Kim": "Kimberley Kistler",
  "Kirill B": "Kirill Belyatov",
  "Kirill S": "Kirill Safonov",
  "Kit": "Karitta Christina Zellerbach",
  "Kristina": "Kristina Schmidt",
  "Lauren C": "Lauren Crudele",
  "Lauren H": "Lauren Hoffmann",
  "Lina": "Lina Feldsherova",
  "Liudmila": "Liudmila Paymukhina",
  "Marc": "Marc Hamilton Mercury",
  "Marie": "Marie Gilot",
  "Mikey": "Mikhail Lara",
  "Miles": "Miles Bissay-Doudy",
  "Morgan": "Morgan Birman",
  "Natalie": "Natalie Koonce",
  "Paul": "Paul Alkoby",
  "Petra": "Petra Kumi",
  "Rachel": "Rachel Sylvia Lee",
  "Richard V": "Richard Correia Valente",
  "Rina": "Christina Shin (Rina)",
  "Rishi": "Rishi Malhotra",
  "Roee": "Roy Marashli Shemer",
  "Ronny": "Haim Ronny Kashai",
  "Sara": "Sara He",
  "Shai": "Shai Olsher",
  "Sharon": null,
  "Sophia": "Sophia Marchetti",
  "Sundeep": "Sundeep Ghuman",
  "Susan": "Susan Gallo",
  "Tahanna": "Tahanna Byatt",
  "Tal": "Tal Zigman",
  "Tara": "Tara Lynn Rittle",
  "Tati": "Tatiana Pisetta",
  "Tommy": "Thomas Le",
  "Yi": "YI YANG",
  "Yvonne": "Yuyang Hong",
}

export interface CamperShift {
  key: string
  day: ScheduleDay
  section: string
  role: string
  time: string
  countsDouble?: boolean
  requiresExp?: boolean
  note?: string
}

/** Every published shift for one camper, in chronological order. */
export function getCamperShifts(fullName: string | null | undefined): CamperShift[] {
  if (!fullName) return []
  const shifts = SCHEDULE_SECTIONS.flatMap(section =>
    section.rows.flatMap(row =>
      row.days.flatMap((name, i) =>
        name && SCHEDULE_NAME_TO_CAMPER[name] === fullName
          ? [{
              key: `${section.title}|${row.role}|${row.time}|${SCHEDULE_DAYS[i].date}`,
              day: SCHEDULE_DAYS[i],
              section: section.title,
              role: row.role,
              time: row.time,
              countsDouble: row.countsDouble,
              requiresExp: row.requiresExp,
              note: row.note,
            }]
          : []
      )
    )
  )
  return shifts.sort((a, b) => a.day.date.localeCompare(b.day.date) || a.time.localeCompare(b.time))
}
