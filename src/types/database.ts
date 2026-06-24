// Database types for NYCDeliRats2026 Camp Management System
// These types define the schema for Supabase

export type ShelterType = 'tent' | 'shiftpod' | 'rv' | 'vehicle' | 'other'
export type ArrivalMethod = 'car' | 'bus' | 'other'
export type PowerType = 'none' | 'low' | 'medium' | 'high'
export type OrientationPreference = 'north' | 'south' | 'east' | 'west' | 'any'
export type TentOpeningSide = 'length' | 'width' | 'both'
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
  departure_method: ArrivalMethod
  early_arrival: boolean
  shelter_type: ShelterType
  shelter_length_ft: number
  shelter_width_ft: number
  shelter_height_ft: number | null
  orientation_preference: OrientationPreference | null
  bringing_vehicle: boolean
  tent_make_model: string | null
  tent_entrance_count: number | null
  tent_opening_side: TentOpeningSide | null
  power_required: boolean
  power_type: PowerType
  special_requests: string | null
  kitchen_participation: boolean
  preferred_shift_types: ShiftType[]
  strike_participation: boolean
  build_week_attending: boolean
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
  sharing_tent_with_2: string | null
  sharing_tent_with_3: string | null
  sharing_tent_with_4: string | null
  sharing_tent_with_5: string | null
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
  departure_method?: ArrivalMethod
  early_arrival?: boolean
  shelter_type: ShelterType
  shelter_length_ft: number
  shelter_width_ft: number
  shelter_height_ft?: number | null
  orientation_preference?: OrientationPreference | null
  bringing_vehicle?: boolean
  tent_make_model?: string | null
  tent_entrance_count?: number | null
  tent_opening_side?: TentOpeningSide | null
  power_required?: boolean
  power_type?: PowerType
  special_requests?: string | null
  kitchen_participation?: boolean
  preferred_shift_types?: ShiftType[]
  strike_participation?: boolean
  build_week_attending?: boolean
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
  sharing_tent_with_2?: string | null
  sharing_tent_with_3?: string | null
  sharing_tent_with_4?: string | null
  sharing_tent_with_5?: string | null
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
  bringing_vehicle?: boolean
  tent_make_model?: string | null
  tent_entrance_count?: number | null
  tent_opening_side?: TentOpeningSide | null
  power_required?: boolean
  power_type?: PowerType
  special_requests?: string | null
  kitchen_participation?: boolean
  preferred_shift_types?: ShiftType[]
  strike_participation?: boolean
  build_week_attending?: boolean
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
  sharing_tent_with_2?: string | null
  sharing_tent_with_3?: string | null
  sharing_tent_with_4?: string | null
  sharing_tent_with_5?: string | null
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
      build_inventory_components: {
        Row: BuildInventoryComponentRow
        Insert: Omit<BuildInventoryComponentRow, 'id' | 'created_at' | 'updated_at' | 'needed_qty'> & { needed_qty?: number }
        Update: Partial<Omit<BuildInventoryComponentRow, 'id' | 'created_at' | 'updated_at'>>
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
      shift_offerings: {
        Row: ShiftOfferingRow
        Insert: ShiftOfferingInsert
        Update: ShiftOfferingUpdate
        Relationships: []
      }
      shift_draft_rankings: {
        Row: ShiftDraftRankingRow
        Insert: ShiftDraftRankingInsert
        Update: Partial<ShiftDraftRankingInsert>
        Relationships: []
      }
      shift_draft_assignments: {
        Row: ShiftDraftAssignmentRow
        Insert: ShiftDraftAssignmentInsert
        Update: Partial<ShiftDraftAssignmentInsert>
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
    Functions: {
      seed_default_shift_offerings: {
        Args: { p_draft_id: string }
        Returns: number
      }
      upsert_camper_ranking: {
        Args: { p_draft_id: string; p_offering_id: string; p_rank: number; p_camper_id?: string | null }
        Returns: ShiftDraftRankingRow
      }
      clear_camper_ranking: {
        Args: { p_draft_id: string; p_offering_id: string; p_camper_id?: string | null }
        Returns: boolean
      }
      compact_camper_rankings: {
        Args: { p_draft_id: string; p_camper_id?: string | null }
        Returns: number
      }
      freeze_draft_rankings: {
        Args: { p_draft_id: string }
        Returns: ShiftDraftRow
      }
      unfreeze_draft_rankings: {
        Args: { p_draft_id: string }
        Returns: ShiftDraftRow
      }
      publish_draft: {
        Args: { p_draft_id: string }
        Returns: ShiftDraftRow
      }
      run_auto_draft: {
        Args: { p_draft_id: string; p_seed?: number | null; p_dry_run?: boolean }
        Returns: unknown
      }
      swap_assignments: {
        Args: { p_assignment_a: string; p_assignment_b: string }
        Returns: boolean
      }
    }
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
      draft_pool: DraftPool
      draft_assignment_source: DraftAssignmentSource
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
export type DeliPostType = 'idea' | 'question'

export interface DeliIdeaRow {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  author_name: string
  author_email: string
  post_type: DeliPostType
  category: string
  title: string
  body: string
  is_read: boolean
  read_at: string | null
  read_by: string | null
  admin_response: string | null
  responded_at: string | null
  responded_by: string | null
}

export interface DeliIdeaInsert {
  user_id: string
  author_name: string
  author_email: string
  post_type?: DeliPostType
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
  admin_response?: string | null
  responded_at?: string | null
  responded_by?: string | null
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
  | 'shade_sail'
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
  | 'stairs_ladder'
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
  /** Tent-only: number of entrance sides on the physical tent (1–4) */
  entrance_count?: number
  /** Tent-only: which physical side(s) of the tent have the main opening — copied from the camper's `tent_opening_side` */
  entrance_side?: 'length' | 'width' | 'both'
  /** Tent-only: free-text make/model copied from camper profile */
  tent_make_model?: string
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
  length_ft: number
  wire_gauge: string | null
  amp_rating: number | null
  source_object_id: string | null
  target_object_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UtilityLineInsert {
  floorplan_id: string
  line_type: UtilityLineType
  points: UtilityLinePoint[]
  label?: string
  length_ft?: number
  wire_gauge?: string | null
  amp_rating?: number | null
  source_object_id?: string | null
  target_object_id?: string | null
  notes?: string | null
}

export interface UtilityLineUpdate {
  line_type?: UtilityLineType
  points?: UtilityLinePoint[]
  label?: string
  length_ft?: number
  wire_gauge?: string | null
  amp_rating?: number | null
  source_object_id?: string | null
  target_object_id?: string | null
  notes?: string | null
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
  electrical_load_item_id: string | null
  utility_line_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type InventoryComponentCategory =
  | 'hardware' | 'fastener' | 'wire' | 'fitting' | 'fabric'
  | 'lumber' | 'fuel' | 'consumable' | 'other'

export interface BuildInventoryComponentRow {
  id: string
  parent_inventory_id: string
  name: string
  qty_per_parent: number
  unit: string
  category: InventoryComponentCategory | string | null
  size: string | null
  description: string | null
  notes: string | null
  have_qty: number
  needed_qty: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type BuildScheduleDay = 'pre_build' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
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
  utility_line_id: string | null
  inventory_id: string | null
  electrical_load_item_id: string | null
  goal_id: string | null
  stage_id: string | null
  depends_on: string[]
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
  utility_line_id: string | null
  inventory_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ==========================================
// Meeting Agenda Types
// ==========================================

export interface BuildMeetingResourceLink {
  label: string
  href: string
}

export interface BuildMeetingRow {
  id: string
  slug: string
  number: number
  month_label: string
  title: string
  subtitle: string
  primary_goal: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type BuildMeetingSectionKind = 'section' | 'decisions'

export interface BuildMeetingSectionRow {
  id: string
  meeting_id: string
  sort_order: number
  number: number | null
  kind: BuildMeetingSectionKind
  title: string
  body_md: string | null
  resource_links: BuildMeetingResourceLink[]
  created_at: string
  updated_at: string
}

export interface BuildMeetingNoteRow {
  id: string
  meeting_id: string
  section_id: string | null
  content: string
  updated_by: string | null
  updated_at: string
}

// Convenience types
export type BuildStage = BuildStageRow
export type BuildGoal = BuildGoalRow
export type BuildResource = BuildResourceRow
export type BuildProcedure = BuildProcedureRow
export type BuildQuestion = BuildQuestionRow
export type BuildInventory = BuildInventoryRow
export type BuildInventoryComponent = BuildInventoryComponentRow
export type BuildScheduleItem = BuildScheduleItemRow
export type ElectricalLoadConfig = ElectricalLoadConfigRow
export type ElectricalDistroBox = ElectricalDistroBoxRow
export type ElectricalLoadItem = ElectricalLoadItemRow
export type BuildMeeting = BuildMeetingRow
export type BuildMeetingSection = BuildMeetingSectionRow
export type BuildMeetingNote = BuildMeetingNoteRow

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
// Shift Draft (Auto-Draft) Types
// ==========================================

export type DraftStatus = 'open' | 'frozen' | 'drafted' | 'archived'
  // Note: legacy values 'setup'|'active'|'paused'|'completed' may exist in DB
  // for old drafts but are not used by the new auto-draft flow.
export type DraftPool = 'deli' | 'special' | 'strike'
export type DraftAssignmentSource = 'ranked' | 'random_fill' | 'manual'

export interface ShiftDraftRow {
  id: string
  created_at: string
  updated_at: string
  name: string
  status: DraftStatus
  ranking_frozen_at: string | null
  drafted_at: string | null
  random_seed: number | null
  deli_quota: number
  special_quota: number
  strike_quota: number
  snake_start_round: number
  created_by: string | null
}

export interface ShiftDraftInsert {
  name?: string
  status?: DraftStatus
  deli_quota?: number
  special_quota?: number
  strike_quota?: number
  snake_start_round?: number
  random_seed?: number | null
  created_by?: string | null
}

export interface ShiftDraftUpdate {
  name?: string
  status?: DraftStatus
  deli_quota?: number
  special_quota?: number
  strike_quota?: number
  snake_start_round?: number
  random_seed?: number | null
  ranking_frozen_at?: string | null
  drafted_at?: string | null
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

// --- Offerings ---
export interface ShiftOfferingRow {
  id: string
  created_at: string
  updated_at: string
  draft_id: string
  pool: DraftPool
  category: string
  role: string
  time_label: string | null
  day_label: string | null
  day_date: string | null
  capacity: number
  requires_exp: boolean
  counts_double: boolean
  description: string | null
  note: string | null
  sort_order: number
}

export type ShiftOfferingInsert = Omit<ShiftOfferingRow, 'id' | 'created_at' | 'updated_at'>
export type ShiftOfferingUpdate = Partial<ShiftOfferingInsert>

// --- Rankings ---
export interface ShiftDraftRankingRow {
  id: string
  created_at: string
  updated_at: string
  draft_id: string
  camper_id: string
  offering_id: string
  rank: number
}

export type ShiftDraftRankingInsert = Omit<ShiftDraftRankingRow, 'id' | 'created_at' | 'updated_at'>

// --- Assignments ---
export interface ShiftDraftAssignmentRow {
  id: string
  created_at: string
  draft_id: string
  camper_id: string
  offering_id: string
  slot_index: number
  source: DraftAssignmentSource
  assigned_round: number | null
  rank_used: number | null
}

export type ShiftDraftAssignmentInsert = Omit<ShiftDraftAssignmentRow, 'id' | 'created_at'>

export type ShiftDraft = ShiftDraftRow
export type ShiftDraftOrder = ShiftDraftOrderRow
export type ShiftOffering = ShiftOfferingRow
export type ShiftDraftRanking = ShiftDraftRankingRow
export type ShiftDraftAssignment = ShiftDraftAssignmentRow

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

// ==========================================
// Packing List Items
// ==========================================

export type PackingItemStatus = 'need' | 'ordered' | 'have' | 'packed'

export interface PackingListItemRow {
  id: string
  camper_id: string
  category: string
  item: string
  status: PackingItemStatus
  priority: 'must' | 'nice' | 'optional'
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PackingListItemInsert {
  camper_id: string
  category?: string
  item: string
  status?: PackingItemStatus
  priority?: 'must' | 'nice' | 'optional'
  notes?: string | null
  sort_order?: number
}

export interface PackingListItemUpdate {
  category?: string
  item?: string
  status?: PackingItemStatus
  priority?: 'must' | 'nice' | 'optional'
  notes?: string | null
  sort_order?: number
}

export type PackingListItem = PackingListItemRow
