export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      compliance_cache: {
        Row: {
          confidence: number
          content_hash: string
          created_at: string
          description: string
          expires_at: string
          flagged_terms: string[] | null
          hit_count: number
          id: string
          rule_matches: Json | null
          status: string
          suggestions: string[] | null
          title: string
        }
        Insert: {
          confidence?: number
          content_hash: string
          created_at?: string
          description: string
          expires_at?: string
          flagged_terms?: string[] | null
          hit_count?: number
          id?: string
          rule_matches?: Json | null
          status: string
          suggestions?: string[] | null
          title: string
        }
        Update: {
          confidence?: number
          content_hash?: string
          created_at?: string
          description?: string
          expires_at?: string
          flagged_terms?: string[] | null
          hit_count?: number
          id?: string
          rule_matches?: Json | null
          status?: string
          suggestions?: string[] | null
          title?: string
        }
        Relationships: []
      }
      compliance_proofs: {
        Row: {
          archived_description: string
          archived_title: string
          compliance_status: string
          created_at: string | null
          expires_at: string | null
          flagged_terms: string[] | null
          generated_at: string | null
          id: string
          is_active: boolean | null
          listing_check_id: string
          public_token: string
          suggestions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_description: string
          archived_title: string
          compliance_status: string
          created_at?: string | null
          expires_at?: string | null
          flagged_terms?: string[] | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_check_id: string
          public_token: string
          suggestions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_description?: string
          archived_title?: string
          compliance_status?: string
          created_at?: string | null
          expires_at?: string | null
          flagged_terms?: string[] | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_check_id?: string
          public_token?: string
          suggestions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          risk_level: string
          term: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          risk_level: string
          term: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          risk_level?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      etsy_policies: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          last_updated: string | null
          scraped_at: string
          title: string
          updated_at: string
          url: string
          version: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated?: string | null
          scraped_at?: string
          title: string
          updated_at?: string
          url: string
          version?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated?: string | null
          scraped_at?: string
          title?: string
          updated_at?: string
          url?: string
          version?: string | null
        }
        Relationships: []
      }
      policy_keywords: {
        Row: {
          context: string | null
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          policy_section_id: string
          risk_level: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          policy_section_id: string
          risk_level?: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          policy_section_id?: string
          risk_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_keywords_policy_section_id_fkey"
            columns: ["policy_section_id"]
            isOneToOne: false
            referencedRelation: "policy_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_references: {
        Row: {
          created_at: string
          id: string
          reference_type: string
          source_section_id: string
          target_section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_type?: string
          source_section_id: string
          target_section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_type?: string
          source_section_id?: string
          target_section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_references_source_section_id_fkey"
            columns: ["source_section_id"]
            isOneToOne: false
            referencedRelation: "policy_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_references_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "policy_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_sections: {
        Row: {
          category: string
          created_at: string
          id: string
          order_index: number
          plain_english_summary: string | null
          policy_id: string
          risk_level: string
          section_content: string
          section_title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          order_index?: number
          plain_english_summary?: string | null
          policy_id: string
          risk_level?: string
          section_content: string
          section_title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          order_index?: number
          plain_english_summary?: string | null
          policy_id?: string
          risk_level?: string
          section_content?: string
          section_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_sections_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "etsy_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
