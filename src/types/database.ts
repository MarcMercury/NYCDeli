// Database types for NYCDeliRats2026 Camp Management System
// These types define the schema for Supabase

export type ShelterType = 'tent' | 'shiftpod' | 'rv' | 'vehicle' | 'other'
export type ArrivalMethod = 'car' | 'bus' | 'flight' | 'other'
export type PowerType = 'none' | 'low' | 'medium' | 'high'
export type OrientationPreference = 'north' | 'south' | 'east' | 'west' | 'any'
export type ShiftType = 'prep' | 'service' | 'cleanup' | 'any'
export type TaskStatus = 'pending' | 'active' | 'done'
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'no-show'

export type SkillTag = 
  | 'construction'
  | 'electrical'
  | 'cooking'
  | 'logistics'
  | 'heavy_equipment'
  | 'medical'
  | 'art'
  | 'dj'
  | 'bartending'
  | 'vibes'

// Camper types
export interface CamperRow {
  id: string
  created_at: string
  updated_at: string
  full_name: string
  playa_name: string | null
  email: string
  phone: string | null
  arrival_date: string
  arrival_method: ArrivalMethod
  departure_date: string
  early_arrival: boolean
  shelter_type: ShelterType
  shelter_length_ft: number
  shelter_width_ft: number
  shelter_height_ft: number | null
  orientation_preference: OrientationPreference | null
  power_required: boolean
  power_type: PowerType
  shade_required: boolean
  special_requests: string | null
  kitchen_participation: boolean
  preferred_shift_types: ShiftType[]
  strike_participation: boolean
  build_week_attending: boolean
  build_week_arrival_date: string | null
  tools_bringing: string[]
  vehicle_info: string | null
  skills: SkillTag[]
  custom_skills: string | null
  layout_x: number | null
  layout_y: number | null
  zone_assignment: string | null
  placement_locked: boolean
  is_admin: boolean
  notes: string | null
}

export interface CamperInsert {
  full_name: string
  playa_name?: string | null
  email: string
  phone?: string | null
  arrival_date: string
  arrival_method: ArrivalMethod
  departure_date: string
  early_arrival?: boolean
  shelter_type: ShelterType
  shelter_length_ft: number
  shelter_width_ft: number
  shelter_height_ft?: number | null
  orientation_preference?: OrientationPreference | null
  power_required?: boolean
  power_type?: PowerType
  shade_required?: boolean
  special_requests?: string | null
  kitchen_participation?: boolean
  preferred_shift_types?: ShiftType[]
  strike_participation?: boolean
  build_week_attending?: boolean
  build_week_arrival_date?: string | null
  tools_bringing?: string[]
  vehicle_info?: string | null
  skills?: SkillTag[]
  custom_skills?: string | null
  layout_x?: number | null
  layout_y?: number | null
  zone_assignment?: string | null
  placement_locked?: boolean
  is_admin?: boolean
  notes?: string | null
}

export interface CamperUpdate {
  full_name?: string
  playa_name?: string | null
  email?: string
  phone?: string | null
  arrival_date?: string
  arrival_method?: ArrivalMethod
  departure_date?: string
  early_arrival?: boolean
  shelter_type?: ShelterType
  shelter_length_ft?: number
  shelter_width_ft?: number
  shelter_height_ft?: number | null
  orientation_preference?: OrientationPreference | null
  power_required?: boolean
  power_type?: PowerType
  shade_required?: boolean
  special_requests?: string | null
  kitchen_participation?: boolean
  preferred_shift_types?: ShiftType[]
  strike_participation?: boolean
  build_week_attending?: boolean
  build_week_arrival_date?: string | null
  tools_bringing?: string[]
  vehicle_info?: string | null
  skills?: SkillTag[]
  custom_skills?: string | null
  layout_x?: number | null
  layout_y?: number | null
  zone_assignment?: string | null
  placement_locked?: boolean
  is_admin?: boolean
  notes?: string | null
}

export interface Database {
  public: {
    Tables: {
      campers: {
        Row: CamperRow
        Insert: CamperInsert
        Update: CamperUpdate
      }
      kitchen_roles: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string
          responsibilities: string[]
          shift_expectations: string
          failure_consequences: string
          min_per_shift: number
          max_per_shift: number
          requires_skills: SkillTag[]
        }
        Insert: {
          name: string
          description: string
          responsibilities: string[]
          shift_expectations: string
          failure_consequences: string
          min_per_shift: number
          max_per_shift: number
          requires_skills?: SkillTag[]
        }
        Update: {
          name?: string
          description?: string
          responsibilities?: string[]
          shift_expectations?: string
          failure_consequences?: string
          min_per_shift?: number
          max_per_shift?: number
          requires_skills?: SkillTag[]
        }
      }
      kitchen_shifts: {
        Row: {
          id: string
          created_at: string
          role_id: string
          date: string
          start_time: string
          end_time: string
          min_coverage: number
          max_coverage: number
          notes: string | null
        }
        Insert: {
          role_id: string
          date: string
          start_time: string
          end_time: string
          min_coverage: number
          max_coverage: number
          notes?: string | null
        }
        Update: {
          role_id?: string
          date?: string
          start_time?: string
          end_time?: string
          min_coverage?: number
          max_coverage?: number
          notes?: string | null
        }
      }
      schedule_assignments: {
        Row: {
          id: string
          created_at: string
          camper_id: string
          shift_id: string
          status: ScheduleStatus
          assigned_by: string | null
          locked: boolean
          notes: string | null
        }
        Insert: {
          camper_id: string
          shift_id: string
          status?: ScheduleStatus
          assigned_by?: string | null
          locked?: boolean
          notes?: string | null
        }
        Update: {
          camper_id?: string
          shift_id?: string
          status?: ScheduleStatus
          assigned_by?: string | null
          locked?: boolean
          notes?: string | null
        }
      }
      build_tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          phase: number
          category: string
          status: TaskStatus
          assigned_to: string | null
          due_date: string | null
          dependencies: string[]
          required_tools: string[]
          estimated_hours: number | null
          completed_at: string | null
          completed_by: string | null
        }
        Insert: {
          title: string
          description: string
          phase: number
          category: string
          status?: TaskStatus
          assigned_to?: string | null
          due_date?: string | null
          dependencies?: string[]
          required_tools?: string[]
          estimated_hours?: number | null
          completed_at?: string | null
          completed_by?: string | null
        }
        Update: {
          title?: string
          description?: string
          phase?: number
          category?: string
          status?: TaskStatus
          assigned_to?: string | null
          due_date?: string | null
          dependencies?: string[]
          required_tools?: string[]
          estimated_hours?: number | null
          completed_at?: string | null
          completed_by?: string | null
        }
      }
      checklist_templates: {
        Row: {
          id: string
          created_at: string
          name: string
          type: 'personal' | 'camp'
          phase: number | null
          items: ChecklistItem[]
        }
        Insert: {
          name: string
          type: 'personal' | 'camp'
          phase?: number | null
          items: ChecklistItem[]
        }
        Update: {
          name?: string
          type?: 'personal' | 'camp'
          phase?: number | null
          items?: ChecklistItem[]
        }
      }
      camper_checklists: {
        Row: {
          id: string
          created_at: string
          camper_id: string
          template_id: string
          completed_items: string[]
        }
        Insert: {
          camper_id: string
          template_id: string
          completed_items?: string[]
        }
        Update: {
          camper_id?: string
          template_id?: string
          completed_items?: string[]
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          updated_by?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      shelter_type: ShelterType
      arrival_method: ArrivalMethod
      power_type: PowerType
      shift_type: ShiftType
      task_status: TaskStatus
      schedule_status: ScheduleStatus
      skill_tag: SkillTag
    }
  }
}

export interface ChecklistItem {
  id: string
  text: string
  required: boolean
  category?: string
}

// Convenience types
export type Camper = CamperRow

export type KitchenRole = Database['public']['Tables']['kitchen_roles']['Row']
export type KitchenShift = Database['public']['Tables']['kitchen_shifts']['Row']
export type ScheduleAssignment = Database['public']['Tables']['schedule_assignments']['Row']
export type BuildTask = Database['public']['Tables']['build_tasks']['Row']
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']
export type CamperChecklist = Database['public']['Tables']['camper_checklists']['Row']
export type SystemSetting = Database['public']['Tables']['system_settings']['Row']
