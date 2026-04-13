// Database types for NYCDeliRats2026 Camp Management System
// These types define the schema for Supabase

export type ShelterType = 'tent' | 'shiftpod' | 'rv' | 'vehicle' | 'other'
export type ArrivalMethod = 'car' | 'bus' | 'other'
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

export type SpotSize = 'small' | 'medium' | 'large' | 'xlarge'
export type ReservationStatus = 'reserved' | 'released' | 'admin_moved'

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
  emergency_contact: string | null
  emergency_contact_name: string | null
  emergency_contact_number: string | null
  emergency_contact_relationship: string | null
  medical_conditions: string | null
  medications: string | null
  allergies: string | null
  dietary_restrictions: string | null
  burn_count: string | null
  what_attracted_you: string | null
  referral_source: string | null
  character_references: string | null
  first_burn_hopes: string | null
  volunteer_commitment: boolean
  sober_shifts: boolean
  background_check_consent: boolean
  layout_x: number | null
  layout_y: number | null
  zone_assignment: string | null
  placement_locked: boolean
  sharing_tent_with: string | null
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
  emergency_contact?: string | null
  emergency_contact_name?: string | null
  emergency_contact_number?: string | null
  emergency_contact_relationship?: string | null
  medical_conditions?: string | null
  medications?: string | null
  allergies?: string | null
  dietary_restrictions?: string | null
  burn_count?: string | null
  what_attracted_you?: string | null
  referral_source?: string | null
  character_references?: string | null
  first_burn_hopes?: string | null
  volunteer_commitment?: boolean
  sober_shifts?: boolean
  background_check_consent?: boolean
  layout_x?: number | null
  layout_y?: number | null
  zone_assignment?: string | null
  placement_locked?: boolean
  sharing_tent_with?: string | null
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
  emergency_contact?: string | null
  emergency_contact_name?: string | null
  emergency_contact_number?: string | null
  emergency_contact_relationship?: string | null
  medical_conditions?: string | null
  medications?: string | null
  allergies?: string | null
  dietary_restrictions?: string | null
  burn_count?: string | null
  what_attracted_you?: string | null
  referral_source?: string | null
  character_references?: string | null
  first_burn_hopes?: string | null
  volunteer_commitment?: boolean
  sober_shifts?: boolean
  background_check_consent?: boolean
  layout_x?: number | null
  layout_y?: number | null
  zone_assignment?: string | null
  placement_locked?: boolean
  sharing_tent_with?: string | null
  is_admin?: boolean
  notes?: string | null
}

// Auth & User Profile Types (defined before Database interface for type resolution)
export type UserRole = 'pending' | 'user' | 'builder' | 'admin'

export interface UserProfileRow {
  id: string
  created_at: string
  updated_at: string
  email: string
  role: UserRole
  camper_id: string | null
  approved_at: string | null
  approved_by: string | null
  denied_at: string | null
  denied_reason: string | null
  bio: string | null
  last_sign_in_at: string | null
}

export interface UserProfileInsert {
  id: string
  email: string
  role?: UserRole
  camper_id?: string | null
  bio?: string | null
}

export interface UserProfileUpdate {
  role?: UserRole
  camper_id?: string | null
  approved_at?: string | null
  approved_by?: string | null
  denied_at?: string | null
  denied_reason?: string | null
  bio?: string | null
  last_sign_in_at?: string | null
}

export interface CamperPhotoRow {
  id: string
  created_at: string
  user_id: string
  storage_path: string
  display_order: number
}

export interface CamperPhotoInsert {
  user_id: string
  storage_path: string
  display_order: number
}

export interface CamperPhotoUpdate {
  storage_path?: string
  display_order?: number
}

export interface Database {
  public: {
    Tables: {
      campers: {
        Row: CamperRow
        Insert: CamperInsert
        Update: CamperUpdate
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      camp_spots: {
        Row: CampSpotRow
        Insert: CampSpotInsert
        Update: CampSpotUpdate
        Relationships: []
      }
      camp_reservations: {
        Row: CampReservationRow
        Insert: CampReservationInsert
        Update: CampReservationUpdate
        Relationships: []
      }
      floorplan_configs: {
        Row: FloorplanConfigRow
        Insert: FloorplanConfigInsert
        Update: FloorplanConfigUpdate
        Relationships: []
      }
      floorplan_objects: {
        Row: FloorplanObjectRow
        Insert: FloorplanObjectInsert
        Update: FloorplanObjectUpdate
        Relationships: []
      }
      floorplan_utility_lines: {
        Row: UtilityLineRow
        Insert: UtilityLineInsert
        Update: UtilityLineUpdate
        Relationships: []
      }
      camp_events: {
        Row: CampEventRow
        Insert: CampEventInsert
        Update: CampEventUpdate
        Relationships: []
      }
      user_profiles: {
        Row: UserProfileRow
        Insert: UserProfileInsert
        Update: UserProfileUpdate
        Relationships: []
      }
      camper_photos: {
        Row: CamperPhotoRow
        Insert: CamperPhotoInsert
        Update: CamperPhotoUpdate
        Relationships: []
      }
      build_stages: {
        Row: BuildStageRow
        Insert: Omit<BuildStageRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildStageRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_goals: {
        Row: BuildGoalRow
        Insert: Omit<BuildGoalRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildGoalRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_resources: {
        Row: BuildResourceRow
        Insert: Omit<BuildResourceRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildResourceRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_procedures: {
        Row: BuildProcedureRow
        Insert: Omit<BuildProcedureRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildProcedureRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_questions: {
        Row: BuildQuestionRow
        Insert: Omit<BuildQuestionRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildQuestionRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_inventory: {
        Row: BuildInventoryRow
        Insert: Omit<BuildInventoryRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildInventoryRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      build_schedule_items: {
        Row: BuildScheduleItemRow
        Insert: Omit<BuildScheduleItemRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BuildScheduleItemRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      shift_drafts: {
        Row: ShiftDraftRow
        Insert: ShiftDraftInsert
        Update: ShiftDraftUpdate
        Relationships: []
      }
      shift_draft_order: {
        Row: ShiftDraftOrderRow
        Insert: ShiftDraftOrderInsert
        Update: Partial<ShiftDraftOrderInsert>
        Relationships: []
      }
      shift_draft_picks: {
        Row: ShiftDraftPickRow
        Insert: ShiftDraftPickInsert
        Update: ShiftDraftPickUpdate
        Relationships: []
      }
      deli_ideas: {
        Row: DeliIdeaRow
        Insert: DeliIdeaInsert
        Update: DeliIdeaUpdate
        Relationships: []
      }
      resource_edits: {
        Row: ResourceEditRow
        Insert: Omit<ResourceEditRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ResourceEditRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      electrical_load_config: {
        Row: ElectricalLoadConfigRow
        Insert: Omit<ElectricalLoadConfigRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ElectricalLoadConfigRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      electrical_distro_boxes: {
        Row: ElectricalDistroBoxRow
        Insert: Omit<ElectricalDistroBoxRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ElectricalDistroBoxRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      electrical_load_items: {
        Row: ElectricalLoadItemRow
        Insert: Omit<ElectricalLoadItemRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ElectricalLoadItemRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      archived_applicants: {
        Row: ArchivedApplicantRow
        Insert: ArchivedApplicantInsert
        Update: ArchivedApplicantUpdate
        Relationships: []
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
      spot_size: SpotSize
      reservation_status: ReservationStatus
      floorplan_object_type: FloorplanObjectType
      utility_line_type: UtilityLineType
      user_role: UserRole
      draft_status: DraftStatus
      draft_pick_status: DraftPickStatus
    }
  }
}

export interface ChecklistItem {
  id: string
  text: string
  required: boolean
  category?: string
}

// Camp Spot types
export interface CampSpotRow {
  id: string
  created_at: string
  updated_at: string
  row_label: string
  spot_number: number
  label: string
  x_position: number
  y_position: number
  spot_width_ft: number
  spot_length_ft: number
  size_category: SpotSize
  min_tent_width_ft: number
  max_tent_width_ft: number
  min_tent_length_ft: number
  max_tent_length_ft: number
  has_power: boolean
  has_shade: boolean
  is_accessible: boolean
  is_available: boolean
  notes: string | null
  floorplan_object_id: string | null
  max_occupants: number
}

export interface CampSpotInsert {
  row_label: string
  spot_number: number
  x_position: number
  y_position: number
  spot_width_ft: number
  spot_length_ft: number
  size_category?: SpotSize
  min_tent_width_ft?: number
  max_tent_width_ft: number
  min_tent_length_ft?: number
  max_tent_length_ft: number
  has_power?: boolean
  has_shade?: boolean
  is_accessible?: boolean
  is_available?: boolean
  notes?: string | null
  floorplan_object_id?: string | null
  max_occupants?: number
}

export interface CampSpotUpdate {
  row_label?: string
  spot_number?: number
  x_position?: number
  y_position?: number
  spot_width_ft?: number
  spot_length_ft?: number
  size_category?: SpotSize
  min_tent_width_ft?: number
  max_tent_width_ft?: number
  min_tent_length_ft?: number
  max_tent_length_ft?: number
  has_power?: boolean
  has_shade?: boolean
  is_accessible?: boolean
  is_available?: boolean
  notes?: string | null
  max_occupants?: number
}

export interface CampReservationRow {
  id: string
  created_at: string
  updated_at: string
  spot_id: string
  camper_id: string
  status: ReservationStatus
  reserved_by: string | null
  admin_notes: string | null
  is_primary: boolean
}

export interface CampReservationInsert {
  spot_id: string
  camper_id: string
  status?: ReservationStatus
  reserved_by?: string | null
  admin_notes?: string | null
  is_primary?: boolean
}

export interface CampReservationUpdate {
  spot_id?: string
  camper_id?: string
  status?: ReservationStatus
  reserved_by?: string | null
  admin_notes?: string | null
  is_primary?: boolean
}

// Deli Idea Forum Types
export interface DeliIdeaRow {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  author_name: string
  author_email: string
  category: string
  title: string
  body: string
  is_read: boolean
  read_at: string | null
  read_by: string | null
}

export interface DeliIdeaInsert {
  user_id: string
  author_name: string
  author_email: string
  category?: string
  title: string
  body: string
}

export interface DeliIdeaUpdate {
  category?: string
  title?: string
  body?: string
  is_read?: boolean
  read_at?: string | null
  read_by?: string | null
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
export type CampSpot = CampSpotRow
export type CampReservation = CampReservationRow
export type DeliIdea = DeliIdeaRow

// Camper info included with spot reservations
export type CampSpotCamperInfo = Pick<CamperRow, 'id' | 'full_name' | 'playa_name' | 'shelter_type' | 'shelter_width_ft' | 'shelter_length_ft'>

// Extended type for spot with reservation info (supports tent sharing)
export interface CampSpotWithReservation extends CampSpotRow {
  /** @deprecated Use reservations[] instead */
  reservation: CampReservationRow | null
  /** @deprecated Use campers[] instead */
  camper: CampSpotCamperInfo | null
  /** All active reservations for this spot (tent sharing) */
  reservations: CampReservationRow[]
  /** All campers occupying this spot */
  campers: CampSpotCamperInfo[]
}

// ==========================================
// Floorplan Editor Types
// ==========================================

export type FloorplanObjectType =
  | 'tent'
  | 'kitchen'
  | 'grill'
  | 'prep_area'
  | 'service_area'
  | 'shade_structure'
  | 'common_area'
  | 'stage'
  | 'bar'
  | 'art_car'
  | 'porta_potty'
  | 'generator'
  | 'water_station'
  | 'first_aid'
  | 'fire_pit'
  | 'storage'
  | 'entrance'
  | 'fence'
  | 'refrigerated_truck'
  | 'bike_parking'
  | 'greywater_tank'
  | 'swamp_cooler'
  | 'table'
  | 'shower_container'
  | 'sink_hose'
  | 'fire_lane'
  | 'road'
  | 'path_of_travel'
  | 'fuel_storage'
  | 'propane_storage'
  | 'flame_effect'
  | 'fire_extinguisher'
  | 'vehicle'
  | 'rv'
  | 'pc_container'
  | 'trash_receptacle'
  | 'sign'
  | 'distance_marker'
  | 'neighbor_zone'
  | 'custom'

export type FrontageSide = 'north' | 'south' | 'east' | 'west'
export type RoofShape = 'flat' | 'pyramid' | 'a_frame' | 'dome'

export interface FloorplanObjectProperties {
  reservable?: boolean
  capacity?: number
  responsibilities?: string[]
  linked_to?: string
  sub_type?: string
  description?: string
  icon?: string
  // 3D appearance
  elevation_ft?: number
  roof_shape?: RoofShape
  // Meshy 3D model
  meshy_task_id?: string
  meshy_model_url?: string
  meshy_thumbnail_url?: string
  // BRC compliance properties
  fuel_type?: 'liquid' | 'propane'
  pc_number?: string
  door_direction?: 'north' | 'south' | 'east' | 'west'
  opening_side?: 'north' | 'south' | 'east' | 'west'
  road_name?: string
  needs_pumpout?: boolean
  has_generator?: boolean
  ext_type?: 'ABC' | '40B' | 'kitchen'
  sign_text?: string
  neighbor_name?: string
  distance_ft?: number
  from_label?: string
  to_label?: string
  safety_radius_ft?: number
}

export interface FloorplanConfigRow {
  id: string
  name: string
  width_ft: number
  length_ft: number
  grid_size_ft: number
  is_active: boolean
  border_label_north: string | null
  border_label_south: string | null
  border_label_east: string | null
  border_label_west: string | null
  frontage_sides: FrontageSide[]
  camp_name: string | null
  contact_name: string | null
  playa_name: string | null
  contact_email: string | null
  contact_phone: string | null
  layout_version: number
  created_at: string
  updated_at: string
}

export interface FloorplanConfigInsert {
  name?: string
  width_ft?: number
  length_ft?: number
  grid_size_ft?: number
  is_active?: boolean
  border_label_north?: string | null
  border_label_south?: string | null
  border_label_east?: string | null
  border_label_west?: string | null
  frontage_sides?: FrontageSide[]
  camp_name?: string | null
  contact_name?: string | null
  playa_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  layout_version?: number
}

export interface FloorplanConfigUpdate {
  name?: string
  width_ft?: number
  length_ft?: number
  grid_size_ft?: number
  is_active?: boolean
  border_label_north?: string | null
  border_label_south?: string | null
  border_label_east?: string | null
  border_label_west?: string | null
  frontage_sides?: FrontageSide[]
  camp_name?: string | null
  contact_name?: string | null
  playa_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  layout_version?: number
}

export interface FloorplanObjectRow {
  id: string
  floorplan_id: string
  object_type: FloorplanObjectType
  label: string
  x: number
  y: number
  width_ft: number
  height_ft: number
  rotation: number
  color: string
  z_index: number
  is_locked: boolean
  parent_id: string | null
  properties: FloorplanObjectProperties
  created_at: string
  updated_at: string
}

export interface FloorplanObjectInsert {
  floorplan_id: string
  object_type: FloorplanObjectType
  label?: string
  x?: number
  y?: number
  width_ft?: number
  height_ft?: number
  rotation?: number
  color?: string
  z_index?: number
  is_locked?: boolean
  parent_id?: string | null
  properties?: FloorplanObjectProperties
}

export interface FloorplanObjectUpdate {
  object_type?: FloorplanObjectType
  label?: string
  x?: number
  y?: number
  width_ft?: number
  height_ft?: number
  rotation?: number
  color?: string
  z_index?: number
  is_locked?: boolean
  parent_id?: string | null
  properties?: FloorplanObjectProperties
}

export type FloorplanConfig = FloorplanConfigRow
export type FloorplanObject = FloorplanObjectRow

// Utility Lines
export type UtilityLineType = 'power' | 'water'

export interface UtilityLinePoint {
  x: number
  y: number
}

export interface UtilityLineRow {
  id: string
  floorplan_id: string
  line_type: UtilityLineType
  points: UtilityLinePoint[]
  label: string
  created_at: string
  updated_at: string
}

export interface UtilityLineInsert {
  floorplan_id: string
  line_type: UtilityLineType
  points: UtilityLinePoint[]
  label?: string
}

export interface UtilityLineUpdate {
  line_type?: UtilityLineType
  points?: UtilityLinePoint[]
  label?: string
}

// ==========================================
// Camp Events Types
// ==========================================

export type EventCategory = 'general' | 'social' | 'planning' | 'fundraiser' | 'build' | 'shopping' | 'other'

export interface CampEventRow {
  id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  category: EventCategory
  created_by: string | null
}

export interface CampEventInsert {
  title: string
  description?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  category?: EventCategory
  created_by?: string | null
}

export interface CampEventUpdate {
  title?: string
  description?: string | null
  event_date?: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  category?: EventCategory
  created_by?: string | null
}

export type CampEvent = CampEventRow

// ==========================================
// Build Week Planning Types
// ==========================================

export type BuildStageType = 'planning' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
export type BuildCategory = 'infrastructure' | 'shelter' | 'kitchen' | 'logistics' | 'safety' | 'layout' | 'decoration' | 'personal' | 'shade_structure' | 'tool' | 'large_equipment' | 'container' | 'kitchen_item' | 'av_equip' | 'electrical' | 'plumbing' | 'furniture' | 'other' | 'bm_utility'
export type BuildResourceStatus = 'have' | 'need' | 'fix' | 'discard'
export type BuildQuestionStatus = 'open' | 'resolved' | 'deferred'

export interface BuildStageRow {
  id: string
  stage: BuildStageType
  title: string
  description: string | null
  date_label: string | null
  crew_size: string | null
  builder_notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BuildGoalRow {
  id: string
  stage_id: string
  category: BuildCategory
  title: string
  description: string | null
  priority: number
  status: TaskStatus
  required_resources: string[]
  responsible_party: string | null
  estimated_people: number | null
  notes: string | null
  floorplan_object_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BuildResourceRow {
  id: string
  category: BuildCategory
  name: string
  description: string | null
  quantity: string | null
  count: number
  status: BuildResourceStatus
  priority: string | null
  stage_needed: BuildStageType | null
  confirmed_working: boolean
  notes: string | null
  install_day: string | null
  floorplan_object_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BuildProcedureStep {
  order: number
  text: string
  notes: string | null
}

export interface BuildProcedureReference {
  title: string
  url: string
}

export interface BuildProcedureRow {
  id: string
  category: BuildCategory
  title: string
  description: string | null
  steps: BuildProcedureStep[]
  reference_links: BuildProcedureReference[]
  open_questions: string[]
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BuildQuestionRow {
  id: string
  category: BuildCategory
  question: string
  context: string | null
  status: BuildQuestionStatus
  resolution: string | null
  is_pain_point: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type InventoryCategory = 'shade_structure' | 'tool' | 'large_equipment' | 'container' | 'kitchen' | 'av_equip' | 'electrical' | 'plumbing' | 'furniture' | 'layout' | 'other'

export interface BuildInventoryRow {
  id: string
  category: InventoryCategory
  name: string
  description: string | null
  size_w: string | null
  size_l: string | null
  quantity_expected: number
  quantity_actual: number
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  confirmed_working: boolean
  notes: string | null
  install_day: string | null
  floorplan_object_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type BuildScheduleDay = 'pre_build' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
export type BuildScheduleCategory = 'delivery' | 'infrastructure' | 'shade' | 'kitchen' | 'electrical' | 'plumbing' | 'layout' | 'decoration' | 'logistics' | 'safety' | 'other'

export interface BuildScheduleItemRow {
  id: string
  day: BuildScheduleDay
  title: string
  description: string | null
  category: BuildScheduleCategory
  time_slot: string | null
  sort_order: number
  is_delivery: boolean
  completed: boolean
  assigned_to: string | null
  notes: string | null
  floorplan_object_id: string | null
  goal_id: string | null
  stage_id: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// Electrical Load Types
// ==========================================

export interface ElectricalLoadConfigRow {
  id: string
  generator_kw: number
  created_at: string
  updated_at: string
}

export interface ElectricalDistroBoxRow {
  id: string
  name: string
  max_amps: number
  voltage: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ElectricalLoadItemRow {
  id: string
  name: string
  location: string | null
  voltage: number
  amperage: number
  wattage: number
  plug_type: string
  quantity: number
  total_amps: number
  total_wattage: number
  notes: string | null
  distro_box_id: string | null
  floorplan_object_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// Convenience types
export type BuildStage = BuildStageRow
export type BuildGoal = BuildGoalRow
export type BuildResource = BuildResourceRow
export type BuildProcedure = BuildProcedureRow
export type BuildQuestion = BuildQuestionRow
export type BuildInventory = BuildInventoryRow
export type BuildScheduleItem = BuildScheduleItemRow
export type ElectricalLoadConfig = ElectricalLoadConfigRow
export type ElectricalDistroBox = ElectricalDistroBoxRow
export type ElectricalLoadItem = ElectricalLoadItemRow

// Extended type for stage with its goals
export interface BuildStageWithGoals extends BuildStageRow {
  goals: BuildGoalRow[]
}

// ==========================================
// Auth & User Profile Types
// ==========================================

export type UserProfile = UserProfileRow
export type CamperPhoto = CamperPhotoRow

// Extended profile with camper data
export interface UserProfileWithCamper extends UserProfileRow {
  camper: CamperRow | null
  photos: CamperPhotoRow[]
}

// ==========================================
// Shift Draft Types
// ==========================================

export type DraftStatus = 'setup' | 'active' | 'paused' | 'completed'
export type DraftPickStatus = 'pending' | 'picking' | 'picked' | 'skipped' | 'auto_skipped'

export interface ShiftDraftRow {
  id: string
  created_at: string
  updated_at: string
  name: string
  status: DraftStatus
  current_round: number
  current_pick_index: number
  pick_time_limit_seconds: number
  total_rounds: number
  started_at: string | null
  completed_at: string | null
  created_by: string | null
}

export interface ShiftDraftInsert {
  name?: string
  status?: DraftStatus
  current_round?: number
  current_pick_index?: number
  pick_time_limit_seconds?: number
  total_rounds?: number
  created_by?: string | null
}

export interface ShiftDraftUpdate {
  name?: string
  status?: DraftStatus
  current_round?: number
  current_pick_index?: number
  pick_time_limit_seconds?: number
  total_rounds?: number
  started_at?: string | null
  completed_at?: string | null
}

export interface ShiftDraftOrderRow {
  id: string
  created_at: string
  draft_id: string
  camper_id: string
  draft_position: number
}

export interface ShiftDraftOrderInsert {
  draft_id: string
  camper_id: string
  draft_position: number
}

export interface ShiftDraftPickRow {
  id: string
  created_at: string
  draft_id: string
  camper_id: string
  round_number: number
  pick_index: number
  shift_category: string | null
  shift_role: string | null
  shift_time: string | null
  status: DraftPickStatus
  picked_at: string | null
  expired_at: string | null
  turn_started_at: string | null
}

export interface ShiftDraftPickInsert {
  draft_id: string
  camper_id: string
  round_number: number
  pick_index: number
  shift_category?: string | null
  shift_role?: string | null
  shift_time?: string | null
  status?: DraftPickStatus
  turn_started_at?: string | null
}

export interface ShiftDraftPickUpdate {
  shift_category?: string | null
  shift_role?: string | null
  shift_time?: string | null
  status?: DraftPickStatus
  picked_at?: string | null
  expired_at?: string | null
  turn_started_at?: string | null
}

export type ShiftDraft = ShiftDraftRow
export type ShiftDraftOrder = ShiftDraftOrderRow
export type ShiftDraftPick = ShiftDraftPickRow

// ==========================================
// Resource Edits
// ==========================================

export interface ResourceEditRow {
  id: string
  resource_key: string
  title: string | null
  content: string | null
  link: string | null
  edited_by: string | null
  created_at: string
  updated_at: string
}

export type ResourceEdit = ResourceEditRow

// Archived Applicants
export interface ArchivedApplicantRow {
  id: string
  archived_at: string
  archived_by: string | null
  original_user_id: string
  email: string
  full_name: string | null
  playa_name: string | null
  denied_at: string | null
  denied_reason: string | null
  profile_data: Record<string, unknown>
  camper_data: Record<string, unknown> | null
  created_at: string
}

export interface ArchivedApplicantInsert {
  archived_by?: string | null
  original_user_id: string
  email: string
  full_name?: string | null
  playa_name?: string | null
  denied_at?: string | null
  denied_reason?: string | null
  profile_data: Record<string, unknown>
  camper_data?: Record<string, unknown> | null
}

export interface ArchivedApplicantUpdate {
  denied_reason?: string | null
  profile_data?: Record<string, unknown>
  camper_data?: Record<string, unknown> | null
}

export interface ShiftDraftOrderWithCamper extends ShiftDraftOrderRow {
  camper: Pick<CamperRow, 'id' | 'full_name' | 'playa_name' | 'email'> | null
}
