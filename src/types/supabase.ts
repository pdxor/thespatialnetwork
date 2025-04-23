export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string
          user_id: string
          service: string
          key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service: string
          key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service?: string
          key?: string
          created_at?: string
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      badge_quests: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string
          badge_id: string | null
          required_tasks_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by: string
          badge_id?: string | null
          required_tasks_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string
          badge_id?: string | null
          required_tasks_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      badge_quest_tasks: {
        Row: {
          id: string
          quest_id: string
          task_id: string
          order_position: number
          created_at: string
        }
        Insert: {
          id?: string
          quest_id: string
          task_id: string
          order_position?: number
          created_at?: string
        }
        Update: {
          id?: string
          quest_id?: string
          task_id?: string
          order_position?: number
          created_at?: string
        }
      }
      user_quest_progress: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          completed_tasks: string[]
          progress_percentage: number
          started_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          quest_id: string
          completed_tasks?: string[]
          progress_percentage?: number
          started_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          quest_id?: string
          completed_tasks?: string[]
          progress_percentage?: number
          started_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          task_id: string | null
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          task_id?: string | null
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          task_id?: string | null
          earned_at?: string
        }
      }
      business_plans: {
        Row: {
          id: string
          project_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          skills: string[]
          short_term_mission: string | null
          long_term_mission: string | null
          current_projects: string[] | null
          joined_at: string
          location: string | null
          avatar_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          skills?: string[]
          short_term_mission?: string | null
          long_term_mission?: string | null
          current_projects?: string[] | null
          joined_at?: string
          location?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          skills?: string[]
          short_term_mission?: string | null
          long_term_mission?: string | null
          current_projects?: string[] | null
          joined_at?: string
          location?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          location: string | null
          property_status: 'owned_land' | 'potential_property'
          values_mission_goals: string | null
          guilds: string[] | null
          team: string[] | null
          zone_0: string | null
          zone_1: string | null
          zone_2: string | null
          zone_3: string | null
          zone_4: string | null
          water: string | null
          soil: string | null
          power: string | null
          structures: string[] | null
          category: string | null
          funding_needs: string | null
          created_by: string
          created_at: string
          updated_at: string
          image_url: string | null
        }
        Insert: {
          id?: string
          title: string
          location?: string | null
          property_status: 'owned_land' | 'potential_property'
          values_mission_goals?: string | null
          guilds?: string[] | null
          team?: string[] | null
          zone_0?: string | null
          zone_1?: string | null
          zone_2?: string | null
          zone_3?: string | null
          zone_4?: string | null
          water?: string | null
          soil?: string | null
          power?: string | null
          structures?: string[] | null
          category?: string | null
          funding_needs?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
        Update: {
          id?: string
          title?: string
          location?: string | null
          property_status?: 'owned_land' | 'potential_property'
          values_mission_goals?: string | null
          guilds?: string[] | null
          team?: string[] | null
          zone_0?: string | null
          zone_1?: string | null
          zone_2?: string | null
          zone_3?: string | null
          zone_4?: string | null
          water?: string | null
          soil?: string | null
          power?: string | null
          structures?: string[] | null
          category?: string | null
          funding_needs?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done' | 'blocked'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          is_project_task: boolean
          project_id: string | null
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
          assignees: string[] | null
          badge_id: string | null
          completion_verification: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done' | 'blocked'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          is_project_task?: boolean
          project_id?: string | null
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          assignees?: string[] | null
          badge_id?: string | null
          completion_verification?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done' | 'blocked'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          is_project_task?: boolean
          project_id?: string | null
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          assignees?: string[] | null
          badge_id?: string | null
          completion_verification?: boolean
        }
      }
      items: {
        Row: {
          id: string
          title: string
          description: string | null
          item_type: 'needed_supply' | 'owned_resource' | 'borrowed_or_rental'
          fundraiser: boolean
          tags: string[] | null
          quantity_needed: number | null
          quantity_owned: number | null
          quantity_borrowed: number | null
          unit: string | null
          product_link: string | null
          info_link: string | null
          image_url: string | null
          associated_task_id: string | null
          project_id: string | null
          added_by: string
          created_at: string
          updated_at: string
          price: number | null
          estimated_price: boolean | null
          price_currency: string | null
          price_date: string | null
          price_source: string | null
          assignees: string[] | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          item_type?: 'needed_supply' | 'owned_resource' | 'borrowed_or_rental'
          fundraiser?: boolean
          tags?: string[] | null
          quantity_needed?: number | null
          quantity_owned?: number | null
          quantity_borrowed?: number | null
          unit?: string | null
          product_link?: string | null
          info_link?: string | null
          image_url?: string | null
          associated_task_id?: string | null
          project_id?: string | null
          added_by: string
          created_at?: string
          updated_at?: string
          price?: number | null
          estimated_price?: boolean | null
          price_currency?: string | null
          price_date?: string | null
          price_source?: string | null
          assignees?: string[] | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          item_type?: 'needed_supply' | 'owned_resource' | 'borrowed_or_rental'
          fundraiser?: boolean
          tags?: string[] | null
          quantity_needed?: number | null
          quantity_owned?: number | null
          quantity_borrowed?: number | null
          unit?: string | null
          product_link?: string | null
          info_link?: string | null
          image_url?: string | null
          associated_task_id?: string | null
          project_id?: string | null
          added_by?: string
          created_at?: string
          updated_at?: string
          price?: number | null
          estimated_price?: boolean | null
          price_currency?: string | null
          price_date?: string | null
          price_source?: string | null
          assignees?: string[] | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          all_day: boolean
          location: string | null
          is_project_event: boolean
          project_id: string | null
          created_by: string
          created_at: string
          updated_at: string
          attendees: string[] | null
          color: string | null
          recurring: boolean
          recurring_pattern: string | null
          recurring_end_date: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          all_day?: boolean
          location?: string | null
          is_project_event?: boolean
          project_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          attendees?: string[] | null
          color?: string | null
          recurring?: boolean
          recurring_pattern?: string | null
          recurring_end_date?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          all_day?: boolean
          location?: string | null
          is_project_event?: boolean
          project_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          attendees?: string[] | null
          color?: string | null
          recurring?: boolean
          recurring_pattern?: string | null
          recurring_end_date?: string | null
        }
      }
      project_locations: {
        Row: {
          id: string
          project_id: string
          latitude: number
          longitude: number
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          latitude: number
          longitude: number
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          latitude?: number
          longitude?: number
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}