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
      books: {
        Row: {
          id: string
          title: string
          title_chosung: string | null
          author: string | null
          author_chosung: string | null
          genre: string | null
          cover_url: string | null
          shelf_zone: string | null
          shelf_number: number | null
          volumes: string | null
          series_name: string | null
          is_new: boolean
          is_popular: boolean
          description: string | null
          tags: string[] | null
          status: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['books']['Insert']>
      }
      genres: {
        Row: {
          id: string
          name: string
          icon: string | null
          sort_order: number | null
        }
        Insert: Omit<Database['public']['Tables']['genres']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['genres']['Insert']>
      }
      feedback: {
        Row: {
          id: string
          nickname: string
          category: string
          content: string
          is_hidden: boolean
          password_hash: string | null
          created_at: string
        }
        Insert: {
          nickname?: string
          category?: string
          content: string
          is_hidden?: boolean
          password_hash?: string | null
        }
        Update: {
          nickname?: string
          category?: string
          content?: string
          is_hidden?: boolean
          password_hash?: string | null
        }
      }
      purchase_requests: {
        Row: {
          id: string
          title: string
          message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['purchase_requests']['Insert']>
      }
      shelf_locations: {
        Row: {
          id: string
          zone: string
          shelf_number: number
        }
        Insert: Omit<Database['public']['Tables']['shelf_locations']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['shelf_locations']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_books: {
        Args: {
          search_term: string
          genre_filter: string | null
          zone_filter: string | null
          result_limit: number
          result_offset: number
        }
        Returns: Database['public']['Tables']['books']['Row'][]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
