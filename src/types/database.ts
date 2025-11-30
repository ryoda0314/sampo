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
      users: {
        Row: {
          id: string
          display_name: string
          icon_url: string | null
          bio: string | null
          is_admin: boolean
          is_suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          icon_url?: string | null
          bio?: string | null
          is_admin?: boolean
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          icon_url?: string | null
          bio?: string | null
          is_admin?: boolean
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      walk_records: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          total_distance_m: number
          total_time_sec: number
          route_geojson: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          started_at: string
          ended_at?: string | null
          total_distance_m?: number
          total_time_sec?: number
          route_geojson?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          total_distance_m?: number
          total_time_sec?: number
          route_geojson?: Json | null
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          walk_record_id: string | null
          community_id: string | null
          lat: number
          lng: number
          text: string
          image_url: string | null
          tags: string[] | null
          is_deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          walk_record_id?: string | null
          community_id?: string | null
          lat: number
          lng: number
          text: string
          image_url?: string | null
          tags?: string[] | null
          is_deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          walk_record_id?: string | null
          community_id?: string | null
          lat?: number
          lng?: number
          text?: string
          image_url?: string | null
          tags?: string[] | null
          is_deleted?: boolean
          created_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_user_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_user_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_user_id?: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
      }
      communities: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
        }
      }
      community_members: {
        Row: {
          id: string
          community_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      community_stats: {
        Row: {
          id: string
          community_id: string
          user_id: string
          period_type: 'week' | 'month'
          period_start: string
          total_distance_m: number
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          period_type: 'week' | 'month'
          period_start: string
          total_distance_m?: number
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          period_type?: 'week' | 'month'
          period_start?: string
          total_distance_m?: number
        }
      }
      walk_events: {
        Row: {
          id: string
          title: string
          description: string | null
          host_user_id: string
          community_id: string | null
          start_at: string
          end_at: string | null
          meeting_lat: number
          meeting_lng: number
          expected_distance_m: number | null
          expected_duration_min: number | null
          pace_note: string | null
          capacity: number | null
          visibility: 'public' | 'friends' | 'community'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          host_user_id: string
          community_id?: string | null
          start_at: string
          end_at?: string | null
          meeting_lat: number
          meeting_lng: number
          expected_distance_m?: number | null
          expected_duration_min?: number | null
          pace_note?: string | null
          capacity?: number | null
          visibility?: 'public' | 'friends' | 'community'
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          host_user_id?: string
          community_id?: string | null
          start_at?: string
          end_at?: string | null
          meeting_lat?: number
          meeting_lng?: number
          expected_distance_m?: number | null
          expected_duration_min?: number | null
          pace_note?: string | null
          capacity?: number | null
          visibility?: 'public' | 'friends' | 'community'
          created_at?: string
        }
      }
      walk_event_participants: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: 'joined' | 'interested' | 'cancelled'
          joined_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: 'joined' | 'interested' | 'cancelled'
          joined_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: 'joined' | 'interested' | 'cancelled'
          joined_at?: string
        }
      }
      explore_tiles: {
        Row: {
          id: string
          user_id: string
          tile_key: string
          last_visited_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tile_key: string
          last_visited_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tile_key?: string
          last_visited_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'like' | 'comment' | 'community_notice' | 'event_reminder' | 'friend_request'
          payload: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'like' | 'comment' | 'community_notice' | 'event_reminder' | 'friend_request'
          payload?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'like' | 'comment' | 'community_notice' | 'event_reminder' | 'friend_request'
          payload?: Json
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type WalkRecord = Database['public']['Tables']['walk_records']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostLike = Database['public']['Tables']['post_likes']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type Community = Database['public']['Tables']['communities']['Row']
export type CommunityMember = Database['public']['Tables']['community_members']['Row']
export type CommunityStat = Database['public']['Tables']['community_stats']['Row']
export type WalkEvent = Database['public']['Tables']['walk_events']['Row']
export type WalkEventParticipant = Database['public']['Tables']['walk_event_participants']['Row']
export type ExploreTile = Database['public']['Tables']['explore_tiles']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Extended types with relations
export type PostWithUser = Post & {
  user: User
  likes_count: number
  is_liked?: boolean
}

export type WalkEventWithHost = WalkEvent & {
  host: User
  participants_count: number
  is_participating?: boolean
}

export type CommunityWithStats = Community & {
  members_count: number
  is_member?: boolean
}
