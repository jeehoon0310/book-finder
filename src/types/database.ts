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
          trending_rank: number | null
          customer_popular_rank: number | null
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
      search_logs: {
        Row: {
          id: string
          search_term: string
          actual_search_term: string | null
          result_count: number
          was_converted: boolean
          zone_filter: string | null
          user_agent: string | null
          ip_hash: string | null
          created_at: string
        }
        Insert: {
          search_term: string
          actual_search_term?: string | null
          result_count?: number
          was_converted?: boolean
          zone_filter?: string | null
          user_agent?: string | null
          ip_hash?: string | null
        }
        Update: Partial<Database['public']['Tables']['search_logs']['Insert']>
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
      book_views: {
        Row: {
          id: string
          book_id: string
          ip_hash: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          book_id: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: Partial<Database['public']['Tables']['book_views']['Insert']>
      }
      trending_rankings: {
        Row: {
          id: string
          source: string
          external_title: string
          external_author: string | null
          external_rank: number
          external_cover_url: string | null
          isbn13: string | null
          matched_book_id: string | null
          match_score: number | null
          fetched_date: string
          created_at: string
        }
        Insert: {
          source?: string
          external_title: string
          external_author?: string | null
          external_rank: number
          external_cover_url?: string | null
          isbn13?: string | null
          matched_book_id?: string | null
          match_score?: number | null
          fetched_date?: string
        }
        Update: Partial<Database['public']['Tables']['trending_rankings']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_popular_books: {
        Args: {
          since_date: string
          max_results?: number
        }
        Returns: { book_id: string; view_count: number }[]
      }
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
