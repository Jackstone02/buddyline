export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  buddyline: {
    Tables: {
      availability_slots: {
        Row: {
          end_time: string
          id: string
          instructor_id: string | null
          is_booked: boolean | null
          slot_date: string
          start_time: string
        }
        Insert: {
          end_time: string
          id?: string
          instructor_id?: string | null
          is_booked?: boolean | null
          slot_date: string
          start_time: string
        }
        Update: {
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_booked?: boolean | null
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_paid_cents: number | null
          availability_slot_id: string | null
          booking_date: string
          created_at: string | null
          customer_id: string | null
          id: string
          instructor_id: string | null
          lesson_type_id: string | null
          notes: string | null
          participants_count: number | null
          payment_intent_id: string | null
          payment_status: string | null
          start_time: string
          status: string | null
        }
        Insert: {
          amount_paid_cents?: number | null
          availability_slot_id?: string | null
          booking_date: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          instructor_id?: string | null
          lesson_type_id?: string | null
          notes?: string | null
          participants_count?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          start_time: string
          status?: string | null
        }
        Update: {
          amount_paid_cents?: number | null
          availability_slot_id?: string | null
          booking_date?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          instructor_id?: string | null
          lesson_type_id?: string | null
          notes?: string | null
          participants_count?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lesson_type_id_fkey"
            columns: ["lesson_type_id"]
            isOneToOne: false
            referencedRelation: "lesson_types"
            referencedColumns: ["id"]
          },
        ]
      }
      certified_profiles: {
        Row: {
          agency: string | null
          cert_card_url: string | null
          cert_level: string | null
          disciplines: string[] | null
          id: string
          max_depth_m: number | null
          years_experience: number | null
        }
        Insert: {
          agency?: string | null
          cert_card_url?: string | null
          cert_level?: string | null
          disciplines?: string[] | null
          id: string
          max_depth_m?: number | null
          years_experience?: number | null
        }
        Update: {
          agency?: string | null
          cert_card_url?: string | null
          cert_level?: string | null
          disciplines?: string[] | null
          id?: string
          max_depth_m?: number | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certified_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dive_logs: {
        Row: {
          buddy_id: string | null
          created_at: string | null
          discipline: string | null
          diver_id: string | null
          duration_min: number | null
          id: string
          latitude: number | null
          location_name: string | null
          log_date: string
          longitude: number | null
          max_depth_m: number | null
          notes: string | null
        }
        Insert: {
          buddy_id?: string | null
          created_at?: string | null
          discipline?: string | null
          diver_id?: string | null
          duration_min?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          log_date: string
          longitude?: number | null
          max_depth_m?: number | null
          notes?: string | null
        }
        Update: {
          buddy_id?: string | null
          created_at?: string | null
          discipline?: string | null
          diver_id?: string | null
          duration_min?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          log_date?: string
          longitude?: number | null
          max_depth_m?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dive_logs_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dive_logs_diver_id_fkey"
            columns: ["diver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dive_requests: {
        Row: {
          buddy_id: string | null
          created_at: string | null
          disciplines: string[] | null
          id: string
          location_name: string
          notes: string | null
          requested_date: string
          requester_id: string | null
          status: string | null
        }
        Insert: {
          buddy_id?: string | null
          created_at?: string | null
          disciplines?: string[] | null
          id?: string
          location_name: string
          notes?: string | null
          requested_date: string
          requester_id?: string | null
          status?: string | null
        }
        Update: {
          buddy_id?: string | null
          created_at?: string | null
          disciplines?: string[] | null
          id?: string
          location_name?: string
          notes?: string | null
          requested_date?: string
          requester_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dive_requests_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dive_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dive_session_members: {
        Row: {
          joined_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dive_session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dive_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dive_session_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dive_sessions: {
        Row: {
          created_at: string | null
          creator_id: string | null
          dive_type: string | null
          id: string
          latitude: number | null
          location_name: string
          longitude: number | null
          max_depth_m: number | null
          notes: string | null
          scheduled_at: string
          spots_needed: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          dive_type?: string | null
          id?: string
          latitude?: number | null
          location_name: string
          longitude?: number | null
          max_depth_m?: number | null
          notes?: string | null
          scheduled_at: string
          spots_needed?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          dive_type?: string | null
          id?: string
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          max_depth_m?: number | null
          notes?: string | null
          scheduled_at?: string
          spots_needed?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dive_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dive_shops: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      group_dive_members: {
        Row: {
          group_dive_id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          group_dive_id: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          group_dive_id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_dive_members_group_dive_id_fkey"
            columns: ["group_dive_id"]
            isOneToOne: false
            referencedRelation: "group_dives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_dive_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_dives: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          max_participants: number | null
          organizer_id: string | null
          scheduled_at: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_participants?: number | null
          organizer_id?: string | null
          scheduled_at: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_participants?: number | null
          organizer_id?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_dives_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_profiles: {
        Row: {
          agencies: string[] | null
          certs_offered: string[] | null
          credentials_url: string | null
          id: string
          teaching_location: string | null
          years_teaching: number | null
        }
        Insert: {
          agencies?: string[] | null
          certs_offered?: string[] | null
          credentials_url?: string | null
          id: string
          teaching_location?: string | null
          years_teaching?: number | null
        }
        Update: {
          agencies?: string[] | null
          certs_offered?: string[] | null
          credentials_url?: string | null
          id?: string
          teaching_location?: string | null
          years_teaching?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_types: {
        Row: {
          duration_minutes: number | null
          id: string
          instructor_id: string | null
          max_participants: number | null
          name: string
          price: number | null
          session_format: string | null
          skill_level: string | null
        }
        Insert: {
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          max_participants?: number | null
          name: string
          price?: number | null
          session_format?: string | null
          skill_level?: string | null
        }
        Update: {
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          max_participants?: number | null
          name?: string
          price?: number | null
          session_format?: string | null
          skill_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_types_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_urls: string[] | null
          price_cents: number
          quantity: number | null
          seller_id: string | null
          shop_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          price_cents: number
          quantity?: number | null
          seller_id?: string | null
          shop_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          price_cents?: number
          quantity?: number | null
          seller_id?: string | null
          shop_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "marketplace_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          listing_id: string | null
          notes: string | null
          payment_intent_id: string | null
          payment_status: string | null
          quantity: number | null
          seller_id: string | null
          shipping_address: string | null
          status: string | null
          total_cents: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          quantity?: number | null
          seller_id?: string | null
          shipping_address?: string | null
          status?: string | null
          total_cents: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          quantity?: number | null
          seller_id?: string | null
          shipping_address?: string | null
          status?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          reviewer_id: string | null
          score: number
          seller_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reviewer_id?: string | null
          score: number
          seller_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          reviewer_id?: string | null
          score?: number
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_shops: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          owner_id: string | null
          shop_name: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          owner_id?: string | null
          shop_name: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          owner_id?: string | null
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_confirmed: boolean | null
          available_to_dive: boolean | null
          avatar_url: string | null
          bio: string | null
          city_region: string | null
          created_at: string | null
          display_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          push_token: string | null
          rejection_reason: string | null
          role: string | null
          stripe_customer_id: string | null
          tos_accepted_at: string | null
          verification_status: string | null
        }
        Insert: {
          age_confirmed?: boolean | null
          available_to_dive?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city_region?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          push_token?: string | null
          rejection_reason?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          tos_accepted_at?: string | null
          verification_status?: string | null
        }
        Update: {
          age_confirmed?: boolean | null
          available_to_dive?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city_region?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          push_token?: string | null
          rejection_reason?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          tos_accepted_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          reviewed_id: string | null
          reviewer_id: string | null
          score: number
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          reviewed_id?: string | null
          reviewer_id?: string | null
          score: number
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          reviewed_id?: string | null
          reviewer_id?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string | null
          reported_id: string | null
          reporter_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_sessions: {
        Row: {
          diver_id: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          started_at: string | null
        }
        Insert: {
          diver_id?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          started_at?: string | null
        }
        Update: {
          diver_id?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_sessions_diver_id_fkey"
            columns: ["diver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_watchers: {
        Row: {
          sos_session_id: string
          watcher_id: string
        }
        Insert: {
          sos_session_id: string
          watcher_id: string
        }
        Update: {
          sos_session_id?: string
          watcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_watchers_sos_session_id_fkey"
            columns: ["sos_session_id"]
            isOneToOne: false
            referencedRelation: "sos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_watchers_watcher_id_fkey"
            columns: ["watcher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  buddyline: {
    Enums: {},
  },
} as const
