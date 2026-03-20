// NYC Deli Rats 2026 - Tone + Copy System
// "A highly organized New Yorker built a military-grade spreadsheet
// and then yelled at everyone until they used it correctly."

export type ToneLevel = 'soft' | 'medium' | 'spicy' | 'hostile'

export interface CopyConfig {
  level: ToneLevel
  pageOverrides?: Record<string, Partial<PageCopy>>
}

export interface PageCopy {
  pageTitle: string
  pageSubtitle: string
  helpText: string
  errorPrefix: string
  successMessage: string
  warningMessage: string
  ctaText: string
}

// Global phrases that reinforce the tone
export const globalPhrases = {
  measurementWarning: "Measure your tent. Not vibes. Actual measurements. With a tape measure.",
  guessWarning: "If you guess, we will treat it as fact. And then judge you for it.",
  chaosWarning: "This is how we avoid chaos. Help us help you.",
  requiredField: "This one's not optional, friend.",
  invalidInput: "That's not going to work. Try again.",
  successGeneric: "Good. One less thing to worry about.",
  deadlineReminder: "Deadlines exist because we're not savages.",
  participationPrompt: "Everyone contributes. That's the deal.",
  noExcuses: "We've heard all the excuses. Yours isn't special.",
  finalWarning: "Last chance. Don't make us chase you.",
}

// Page-specific copy
export const pageCopy: Record<string, PageCopy> = {
  intake: {
    pageTitle: "Camper Registration",
    pageSubtitle: "Fill this out completely or don't bother showing up.",
    helpText: "Every field matters. We use this data to not lose you in the desert.",
    errorPrefix: "Problem:",
    successMessage: "You're in the system. Don't ghost us.",
    warningMessage: "Incomplete registration = no spot. Simple math.",
    ctaText: "Submit & Pray",
  },
  layout: {
    pageTitle: "Camp Layout",
    pageSubtitle: "Where you'll sleep (if you measured correctly).",
    helpText: "This isn't a suggestion. This is where your tent goes.",
    errorPrefix: "Layout Error:",
    successMessage: "Spot assigned. Don't move it without permission.",
    warningMessage: "Your dimensions don't fit. Re-measure or downsize.",
    ctaText: "Assign My Spot",
  },
  kitchen: {
    pageTitle: "Kitchen Operations",
    pageSubtitle: "Sandwiches don't make themselves.",
    helpText: "You signed up for shifts. We remember. So should you.",
    errorPrefix: "Kitchen Problem:",
    successMessage: "Shift confirmed. Set an alarm. Several alarms.",
    warningMessage: "Missing your shift is noted. Permanently.",
    ctaText: "Confirm Shift",
  },
  schedule: {
    pageTitle: "Your Schedule",
    pageSubtitle: "This is non-negotiable. Plan accordingly.",
    helpText: "Conflicts? Should've thought about that earlier.",
    errorPrefix: "Scheduling Error:",
    successMessage: "Schedule locked. It's happening.",
    warningMessage: "You're double-booked. Fix it or we will.",
    ctaText: "Lock It In",
  },
  buildWeek: {
    pageTitle: "Build Week",
    pageSubtitle: "The camp doesn't build itself. That's your job.",
    helpText: "Early arrival = early responsibility. That's the trade.",
    errorPrefix: "Build Week Issue:",
    successMessage: "See you early. Bring water. Bring patience.",
    warningMessage: "Tasks are piling up. Don't be that person.",
    ctaText: "Sign Up for Build",
  },
  admin: {
    pageTitle: "Admin Control",
    pageSubtitle: "With great power comes great spreadsheets.",
    helpText: "Override responsibly. Or don't. You're the admin.",
    errorPrefix: "Admin Error:",
    successMessage: "Change applied. The system obeys.",
    warningMessage: "Think before you click. Data has feelings.",
    ctaText: "Execute",
  },
}

// Form field help texts (snarky but useful)
export const fieldHelp = {
  fullName: "Your legal name. The one on your ID. Not your spirit animal.",
  playaName: "Optional. If you don't have one, don't make one up now.",
  email: "Check this regularly. We won't repeat ourselves.",
  phone: "For emergencies only. We won't drunk text you.",
  arrivalDate: "The actual day you'll arrive. Not 'around then.'",
  departureDate: "We need to know when you're leaving so we can plan strike.",
  arrivalMethod: "How you're getting there. Affects unloading logistics.",
  earlyArrival: "Are you coming for build week? Think carefully before saying yes.",
  shelterType: "What are you sleeping in? Be specific.",
  shelterLength: "Measure it. In feet. Including guy lines and stakes.",
  shelterWidth: "Same deal. Measure the full footprint.",
  shelterHeight: "How tall is your shelter? Matters for placement.",
  orientationPreference: "Which way do you want your door to face? 'Any' is fine.",
  powerRequired: "Do you need electrical power? Be honest.",
  powerType: "Low = phone charger. Medium = CPAP. High = you better explain yourself.",
  shadeRequired: "Do you need to be under shade? Depends on your shelter.",
  specialRequests: "Keep it reasonable. We're not a resort.",
  kitchenParticipation: "Everyone helps. This isn't optional. The question is how.",
  preferredShifts: "When do you want to work? We'll try to accommodate. Try.",
  strikeParticipation: "Are you staying for teardown? Good karma points available.",
  buildWeekAttending: "Coming early to build? We need you.",
  skills: "What can you actually do? Not what you've seen on YouTube.",
  toolsBringing: "What tools are you bringing? Be specific.",
}

// Validation error messages (tone-appropriate)
export const validationErrors = {
  required: "This field is required. No exceptions.",
  invalidEmail: "That's not a real email address.",
  invalidDate: "Pick a real date that makes sense.",
  dateTooEarly: "You can't arrive before we do.",
  dateTooLate: "The event will be over by then. Try again.",
  departureTooEarly: "You're leaving before you arrive? Physics called.",
  dimensionTooSmall: "That's suspiciously small. Measure again.",
  dimensionTooLarge: "That won't fit. Downsize or stay home.",
  invalidPhone: "That phone number looks fake.",
  textTooLong: "That's too many words. Be concise.",
  noParticipation: "You have to help with something. Pick one.",
}

// Success messages by context
export const successMessages = {
  intakeComplete: "Registration complete. Welcome to the chaos.",
  profileUpdated: "Changes saved. We noticed.",
  shiftConfirmed: "Shift locked in. Don't forget.",
  taskCompleted: "Task done. One down, many to go.",
  checklistItem: "Checked off. Progress is good.",
  adminOverride: "Override applied. The system bends to your will.",
}

// Warning messages by context
export const warningMessages = {
  incompleteProfile: "Your profile is incomplete. Fix it.",
  missingShifts: "You haven't signed up for enough shifts.",
  approachingDeadline: "Deadline approaching. Move faster.",
  conflictDetected: "There's a conflict here. Can't ignore physics.",
  lowCoverage: "Not enough people signed up. Recruit or suffer.",
}

// Call-to-action variants
export const ctaVariants = {
  primary: {
    submit: "Submit & Pray",
    save: "Lock It In",
    confirm: "I Understand",
    next: "Keep Going",
    done: "Finally Done",
  },
  secondary: {
    cancel: "Never Mind",
    skip: "Skip (For Now)",
    back: "Go Back",
    edit: "Fix This",
  },
  warning: {
    delete: "Yes, Delete It",
    override: "Override Anyway",
    force: "Force It Through",
  },
}

// Random encouragement/warnings for loading states
export const loadingMessages = [
  "Calculating your fate...",
  "Consulting the spreadsheet gods...",
  "Processing your questionable choices...",
  "Verifying you measured correctly...",
  "Cross-referencing excuses...",
  "Allocating desert real estate...",
  "Scheduling your obligations...",
  "Generating disappointment in advance...",
]

// Get a random loading message
export function getRandomLoadingMessage(): string {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
}

// Get page copy with optional overrides
export function getPageCopy(page: string, overrides?: Partial<PageCopy>): PageCopy {
  const base = pageCopy[page] || pageCopy.intake
  return { ...base, ...overrides }
}
