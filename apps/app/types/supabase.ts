export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_id: string
          ended_at: string | null
          error: string | null
          id: string
          owner_id: string
          project_id: string
          reserved_usd: number
          started_at: string
          status: string
          step_count: number
          trigger: string
          work_item_id: string | null
        }
        Insert: {
          agent_id: string
          ended_at?: string | null
          error?: string | null
          id?: string
          owner_id: string
          project_id: string
          reserved_usd?: number
          started_at?: string
          status: string
          step_count?: number
          trigger: string
          work_item_id?: string | null
        }
        Update: {
          agent_id?: string
          ended_at?: string | null
          error?: string | null
          id?: string
          owner_id?: string
          project_id?: string
          reserved_usd?: number
          started_at?: string
          status?: string
          step_count?: number
          trigger?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          args: Json
          created_at: string
          duration_ms: number | null
          id: string
          ok: boolean
          owner_id: string
          project_id: string
          result_summary: string | null
          run_id: string
          tool: string
        }
        Insert: {
          args: Json
          created_at?: string
          duration_ms?: number | null
          id?: string
          ok: boolean
          owner_id: string
          project_id: string
          result_summary?: string | null
          run_id: string
          tool: string
        }
        Update: {
          args?: Json
          created_at?: string
          duration_ms?: number | null
          id?: string
          ok?: boolean
          owner_id?: string
          project_id?: string
          result_summary?: string | null
          run_id?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          name: string
          owner_id: string
          project_id: string
          role_description: string
          slug: string
          system_prompt: string
          tools: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name: string
          owner_id: string
          project_id: string
          role_description?: string
          slug: string
          system_prompt: string
          tools?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          owner_id?: string
          project_id?: string
          role_description?: string
          slug?: string
          system_prompt?: string
          tools?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          agent_id: string | null
          cached_input_tokens: number
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          owner_id: string
          project_id: string
          run_id: string | null
          work_item_id: string | null
        }
        Insert: {
          agent_id?: string | null
          cached_input_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          owner_id: string
          project_id: string
          run_id?: string | null
          work_item_id?: string | null
        }
        Update: {
          agent_id?: string | null
          cached_input_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          owner_id?: string
          project_id?: string
          run_id?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
          agent_id: string | null
          body: string
          created_at: string
          document_id: string
          id: string
          owner_id: string
          project_id: string
          title: string
        }
        Insert: {
          agent_id?: string | null
          body: string
          created_at?: string
          document_id: string
          id?: string
          owner_id: string
          project_id: string
          title: string
        }
        Update: {
          agent_id?: string | null
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
            foreignKeyName: "document_revisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
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
          search_tsv: unknown | null
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
          search_tsv?: unknown | null
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
          search_tsv?: unknown | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_agent_fk"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
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
          search_tsv: unknown | null
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
          search_tsv?: unknown | null
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
          search_tsv?: unknown | null
          title?: string | null
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_agent_fk"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
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
      project_budgets: {
        Row: {
          monthly_cap_usd: number
          owner_id: string
          per_run_token_cap: number
          project_id: string
          updated_at: string
        }
        Insert: {
          monthly_cap_usd?: number
          owner_id: string
          per_run_token_cap?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          monthly_cap_usd?: number
          owner_id?: string
          per_run_token_cap?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      proposals: {
        Row: {
          agent_id: string
          applied_id: string | null
          citations: Json
          created_at: string
          decided_at: string | null
          edited: boolean
          id: string
          kind: string
          owner_id: string
          payload: Json
          project_id: string
          rationale: string
          run_id: string
          status: string
          target_id: string | null
        }
        Insert: {
          agent_id: string
          applied_id?: string | null
          citations?: Json
          created_at?: string
          decided_at?: string | null
          edited?: boolean
          id?: string
          kind: string
          owner_id: string
          payload: Json
          project_id: string
          rationale: string
          run_id: string
          status?: string
          target_id?: string | null
        }
        Update: {
          agent_id?: string
          applied_id?: string | null
          citations?: Json
          created_at?: string
          decided_at?: string | null
          edited?: boolean
          id?: string
          kind?: string
          owner_id?: string
          payload?: Json
          project_id?: string
          rationale?: string
          run_id?: string
          status?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agent_id_project_id_fkey"
            columns: ["agent_id", "project_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "proposals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_run_id_project_id_fkey"
            columns: ["run_id", "project_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id", "project_id"]
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
          search_tsv: unknown | null
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
          search_tsv?: unknown | null
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
          search_tsv?: unknown | null
          status?: string
          status_changed_at?: string
          title?: string
          updated_at?: string
          wake_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_agent_fk"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
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
      apply_document_edit: {
        Args: {
          p_document_id: string
          p_project_id: string
          p_owner_id: string
          p_agent_id: string
          p_expected_updated_at: string
          p_title: string
          p_body: string
        }
        Returns: string
      }
      search_repo: {
        Args: { p_project_id: string; p_query: string; p_limit?: number }
        Returns: {
          source_type: string
          source_id: string
          title: string
          snippet: string
          rank: number
        }[]
      }
      start_agent_run: {
        Args: {
          p_project_id: string
          p_agent_id: string
          p_work_item_id: string
          p_trigger: string
          p_reserved_usd: number
        }
        Returns: {
          run_id: string
          allowed: boolean
          month_to_date: number
          monthly_cap: number
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

