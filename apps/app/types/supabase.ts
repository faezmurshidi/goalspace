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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          byte_size: number
          created_at: string
          document_id: string | null
          entry_id: string | null
          id: string
          mime_type: string
          owner_id: string
          project_id: string
          storage_path: string
        }
        Insert: {
          byte_size: number
          created_at?: string
          document_id?: string | null
          entry_id?: string | null
          id?: string
          mime_type: string
          owner_id: string
          project_id: string
          storage_path: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          document_id?: string | null
          entry_id?: string | null
          id?: string
          mime_type?: string
          owner_id?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_document_id_project_id_fkey"
            columns: ["document_id", "project_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "attachments_entry_id_project_id_fkey"
            columns: ["entry_id", "project_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "attachments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_revisions: {
        Row: {
          body: string
          created_at: string
          document_id: string
          id: string
          owner_id: string
          project_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          document_id: string
          id?: string
          owner_id: string
          project_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          document_id?: string
          id?: string
          owner_id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_revisions_document_id_project_id_fkey"
            columns: ["document_id", "project_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "document_revisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agent_id: string | null
          body: string
          created_at: string
          id: string
          owner_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          owner_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          agent_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          owner_id: string
          project_id: string
          title: string | null
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind: string
          occurred_at?: string
          owner_id: string
          project_id: string
          title?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          owner_id?: string
          project_id?: string
          title?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_work_item_id_project_id_fkey"
            columns: ["work_item_id", "project_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      projects: {
        Row: {
          brief: string | null
          created_at: string
          id: string
          kind: string
          owner_id: string
          slug: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          brief?: string | null
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          brief?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_items: {
        Row: {
          agent_id: string | null
          body: string
          closed_at: string | null
          closed_by_entry_id: string | null
          created_at: string
          id: string
          kind: string
          order_index: number
          owner_id: string
          parent_id: string | null
          project_id: string
          status: string
          status_changed_at: string
          title: string
          updated_at: string
          wake_at: string | null
        }
        Insert: {
          agent_id?: string | null
          body?: string
          closed_at?: string | null
          closed_by_entry_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          order_index?: number
          owner_id: string
          parent_id?: string | null
          project_id: string
          status?: string
          status_changed_at?: string
          title: string
          updated_at?: string
          wake_at?: string | null
        }
        Update: {
          agent_id?: string | null
          body?: string
          closed_at?: string | null
          closed_by_entry_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          order_index?: number
          owner_id?: string
          parent_id?: string | null
          project_id?: string
          status?: string
          status_changed_at?: string
          title?: string
          updated_at?: string
          wake_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_closed_by_entry_id_project_id_fkey"
            columns: ["closed_by_entry_id", "project_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "work_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_project_id_fkey"
            columns: ["parent_id", "project_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
  public: {
    Enums: {},
  },
} as const
