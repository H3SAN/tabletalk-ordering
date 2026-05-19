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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          restaurant_id: string
          slug: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          slug: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          branch_id: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          restaurant_id: string
          sort_order: number
          station: Database["public"]["Enums"]["station"]
        }
        Insert: {
          available?: boolean
          branch_id?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          restaurant_id: string
          sort_order?: number
          station?: Database["public"]["Enums"]["station"]
        }
        Update: {
          available?: boolean
          branch_id?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number
          station?: Database["public"]["Enums"]["station"]
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      modifiers: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          name: string
          price_delta: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          price_delta?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          price_delta?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifiers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          item_name_snapshot: string
          menu_item_id: string
          order_id: string
          quantity: number
          restaurant_id: string
          selected_modifiers: Json
          special_instructions: string | null
          station: Database["public"]["Enums"]["station"]
          station_status: Database["public"]["Enums"]["order_status"]
          unit_price: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          item_name_snapshot: string
          menu_item_id: string
          order_id: string
          quantity?: number
          restaurant_id: string
          selected_modifiers?: Json
          special_instructions?: string | null
          station?: Database["public"]["Enums"]["station"]
          station_status?: Database["public"]["Enums"]["order_status"]
          unit_price: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          item_name_snapshot?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          restaurant_id?: string
          selected_modifiers?: Json
          special_instructions?: string | null
          station?: Database["public"]["Enums"]["station"]
          station_status?: Database["public"]["Enums"]["order_status"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          branch_id: string
          created_at: string
          customer_name: string
          customer_session_id: string
          customer_whatsapp: string
          id: string
          notes: string | null
          order_number: number
          ready_at: string | null
          restaurant_id: string
          served_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Insert: {
          accepted_at?: string | null
          branch_id: string
          created_at?: string
          customer_name: string
          customer_session_id: string
          customer_whatsapp: string
          id?: string
          notes?: string | null
          order_number?: number
          ready_at?: string | null
          restaurant_id: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string
          created_at?: string
          customer_name?: string
          customer_session_id?: string
          customer_whatsapp?: string
          id?: string
          notes?: string | null
          order_number?: number
          ready_at?: string | null
          restaurant_id?: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      restaurant_subscriptions: {
        Row: {
          assigned_by: string | null
          created_at: string
          plan_id: string
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          plan_id: string
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          plan_id?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          primary_color: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id: string
          primary_color?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          primary_color?: string | null
          slug?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          acknowledged_at: string | null
          branch_id: string
          completed_at: string | null
          created_at: string
          customer_session_id: string
          id: string
          restaurant_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          table_id: string
          type: Database["public"]["Enums"]["service_request_type"]
        }
        Insert: {
          acknowledged_at?: string | null
          branch_id: string
          completed_at?: string | null
          created_at?: string
          customer_session_id: string
          id?: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["service_request_status"]
          table_id: string
          type: Database["public"]["Enums"]["service_request_type"]
        }
        Update: {
          acknowledged_at?: string | null
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          customer_session_id?: string
          id?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          table_id?: string
          type?: Database["public"]["Enums"]["service_request_type"]
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          name: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_default: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_default?: boolean
          name: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_default?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string
          id: string
          qr_token: string
          restaurant_id: string
          table_number: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string
          id?: string
          qr_token?: string
          restaurant_id: string
          table_number: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string
          id?: string
          qr_token?: string
          restaurant_id?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invite: { Args: { _token: string }; Returns: string }
      create_restaurant_workspace: {
        Args: {
          _address: string
          _branch_name: string
          _name: string
          _primary_color: string
          _slug: string
        }
        Returns: {
          branch_id: string
          restaurant_id: string
          slug: string
        }[]
      }
      find_my_orders: {
        Args: { _qr_token: string; _query: string }
        Returns: {
          created_at: string
          customer_name: string
          order_id: string
          order_number: number
          status: string
          total: number
        }[]
      }
      get_branch_tables: {
        Args: { _branch_slug: string; _restaurant_slug: string }
        Returns: {
          branch_id: string
          qr_token: string
          restaurant_id: string
          table_id: string
          table_number: string
        }[]
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          branch_id: string
          branch_name: string
          email: string
          expired: boolean
          id: string
          name: string
          restaurant_id: string
          restaurant_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_menu_for_qr: { Args: { _qr_token: string }; Returns: Json }
      get_my_plan: {
        Args: never
        Returns: {
          billing_interval: string
          currency: string
          description: string
          features: Json
          name: string
          plan_id: string
          price: number
          slug: string
          status: string
        }[]
      }
      get_my_restaurant_context: {
        Args: never
        Returns: {
          is_owner: boolean
          logo_url: string
          name: string
          primary_color: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          slug: string
        }[]
      }
      get_order_notification_payload: {
        Args: { _order_id: string }
        Returns: {
          customer_name: string
          customer_whatsapp: string
          order_id: string
          order_number: number
          restaurant_name: string
          status: string
          table_number: string
        }[]
      }
      get_public_branches: {
        Args: { _restaurant_slug: string }
        Returns: {
          address: string
          branch_id: string
          branch_name: string
          branch_slug: string
          logo_url: string
          primary_color: string
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      get_public_tables: {
        Args: { _branch_slug: string; _restaurant_slug: string }
        Returns: {
          branch_id: string
          qr_token: string
          restaurant_id: string
          table_id: string
          table_number: string
        }[]
      }
      get_restaurant_by_qr: {
        Args: { _qr_token: string }
        Returns: {
          branch_id: string
          branch_name: string
          branch_slug: string
          logo_url: string
          primary_color: string
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          table_id: string
          table_number: string
        }[]
      }
      has_restaurant_role: {
        Args: {
          _restaurant_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_restaurant_member: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_valid_table_for_branch: {
        Args: { _branch_id: string; _restaurant_id: string; _table_id: string }
        Returns: boolean
      }
      platform_assign_plan: {
        Args: { _plan_id: string; _restaurant_id: string }
        Returns: undefined
      }
      platform_delete_plan: { Args: { _id: string }; Returns: undefined }
      platform_grant_admin: {
        Args: { _note?: string; _user_id: string }
        Returns: undefined
      }
      platform_growth_stats: {
        Args: never
        Returns: {
          day: string
          new_branches: number
          new_orders: number
          new_restaurants: number
        }[]
      }
      platform_list_branches: {
        Args: never
        Returns: {
          active: boolean
          address: string
          created_at: string
          id: string
          name: string
          orders_total: number
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          slug: string
          table_count: number
        }[]
      }
      platform_list_plans: {
        Args: never
        Returns: {
          active: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_default: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      platform_list_restaurants: {
        Args: never
        Returns: {
          active: boolean
          branch_count: number
          created_at: string
          id: string
          logo_url: string
          name: string
          orders_total: number
          plan_id: string
          plan_name: string
          plan_price: number
          primary_color: string
          slug: string
          table_count: number
        }[]
      }
      platform_list_users: {
        Args: { _q?: string }
        Returns: {
          created_at: string
          email: string
          is_platform_admin: boolean
          last_sign_in_at: string
          restaurants: Json
          user_id: string
        }[]
      }
      platform_overview: {
        Args: never
        Returns: {
          active_branches: number
          active_restaurants: number
          orders_today: number
          orders_week: number
          total_branches: number
          total_restaurants: number
          total_tables: number
        }[]
      }
      platform_recent_service_requests: {
        Args: { _limit?: number }
        Returns: {
          branch_id: string
          branch_name: string
          created_at: string
          id: string
          restaurant_id: string
          restaurant_name: string
          status: string
          table_id: string
          table_number: string
          type: string
        }[]
      }
      platform_recent_signups: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          id: string
          logo_url: string
          name: string
          owner_email: string
          primary_color: string
          slug: string
        }[]
      }
      platform_revenue_stats: {
        Args: never
        Returns: {
          day: string
          orders_count: number
          revenue: number
        }[]
      }
      platform_revoke_admin: { Args: { _user_id: string }; Returns: undefined }
      platform_toggle_restaurant_active: {
        Args: { _active: boolean; _restaurant_id: string }
        Returns: undefined
      }
      platform_top_restaurants: {
        Args: { _limit?: number }
        Returns: {
          id: string
          logo_url: string
          name: string
          orders_week: number
          primary_color: string
          slug: string
        }[]
      }
      platform_upsert_plan: {
        Args: {
          _active: boolean
          _billing_interval: string
          _currency: string
          _description: string
          _features: Json
          _id: string
          _is_default: boolean
          _name: string
          _price: number
          _slug: string
          _sort_order: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "platform_owner"
        | "restaurant_owner"
        | "admin"
        | "branch_manager"
        | "kitchen"
        | "bar"
        | "waiter"
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      service_request_status: "pending" | "acknowledged" | "completed"
      service_request_type:
        | "call_waiter"
        | "need_assistance"
        | "request_bill"
        | "table_help"
      station: "kitchen" | "bar" | "dessert"
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
  public: {
    Enums: {
      app_role: [
        "platform_owner",
        "restaurant_owner",
        "admin",
        "branch_manager",
        "kitchen",
        "bar",
        "waiter",
      ],
      order_status: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      service_request_status: ["pending", "acknowledged", "completed"],
      service_request_type: [
        "call_waiter",
        "need_assistance",
        "request_bill",
        "table_help",
      ],
      station: ["kitchen", "bar", "dessert"],
    },
  },
} as const
