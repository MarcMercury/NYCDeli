import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function formatDateTime(date: string | Date, time?: string): string {
  const formatted = formatDate(date)
  if (time) {
    return `${formatted} at ${formatTime(time)}`
  }
  return formatted
}

// Calculate square footage from dimensions
export function calculateArea(length: number, width: number): number {
  return length * width
}

// Check if a shelter fits in a given space with buffer
export function doesShelterFit(
  shelterLength: number,
  shelterWidth: number,
  spaceLength: number,
  spaceWidth: number,
  buffer: number = 3
): boolean {
  const totalLength = shelterLength + buffer * 2
  const totalWidth = shelterWidth + buffer * 2
  return totalLength <= spaceLength && totalWidth <= spaceWidth
}

// Check for overlap between two rectangles
export function checkOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  buffer: number = 3
): boolean {
  const b = buffer
  return !(
    x1 + w1 + b < x2 ||
    x2 + w2 + b < x1 ||
    y1 + h1 + b < y2 ||
    y2 + h2 + b < y1
  )
}

// Generate a simple ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Truncate text with ellipsis
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length - 3) + '...'
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number (lenient)
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Sort campers by arrival date
export function sortByArrival<T extends { arrival_date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  )
}

// Group items by a key
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// Calculate days between dates
export function daysBetween(start: string | Date, end: string | Date): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Color helpers for status
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    active: 'bg-blue-100 text-blue-800 border-blue-300',
    done: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    scheduled: 'bg-purple-100 text-purple-800 border-purple-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    'no-show': 'bg-red-100 text-red-800 border-red-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
}

// Skill tag display names
export function getSkillDisplayName(skill: string): string {
  const names: Record<string, string> = {
    construction: '🔨 Construction',
    electrical: '⚡ Electrical',
    cooking: '🍳 Cooking',
    logistics: '📦 Logistics',
    heavy_equipment: '🚜 Heavy Equipment',
    medical: '🏥 Medical',
    art: '🎨 Art',
    dj: '🎧 DJ',
    bartending: '🍸 Bartending',
    vibes: '✨ Vibes',
  }
  return names[skill] || skill
}
