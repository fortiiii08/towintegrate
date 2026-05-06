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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          diff_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          created_at?: string
          diff_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          diff_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          order_index: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          order_index?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          order_index?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          last_recording_date: string | null
          name: string
          niche: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          last_recording_date?: string | null
          name: string
          niche?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          last_recording_date?: string | null
          name?: string
          niche?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          contact_id: string
          conversation_id: string | null
          created_at: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          contact_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          contact_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activities_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          notes: string | null
          opt_out: boolean
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          opt_out?: boolean
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          opt_out?: boolean
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_name: string | null
          client_id: string
          created_at: string
          date: string
          id: string
          lead_count: number
          niche: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          client_id: string
          created_at?: string
          date?: string
          id?: string
          lead_count?: number
          niche?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          lead_count?: number
          niche?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          name: string
          order_index: number
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name: string
          order_index?: number
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          order_index?: number
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          media_url: string | null
          sent_by: string | null
          type: Database["public"]["Enums"]["message_type"]
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          media_url?: string | null
          sent_by?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          media_url?: string | null
          sent_by?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_whatsapp_template: boolean
          meta_template_name: string | null
          title: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_whatsapp_template?: boolean
          meta_template_name?: string | null
          title: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_whatsapp_template?: boolean
          meta_template_name?: string | null
          title?: string
        }
        Relationships: []
      }
      spaces: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_done: boolean
          list_id: string
          name: string
          order_index: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          list_id: string
          name: string
          order_index?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          list_id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "statuses_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          id: string
          is_done: boolean
          order_index: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          id?: string
          is_done?: boolean
          order_index?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          id?: string
          is_done?: boolean
          order_index?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          task_id: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          list_id: string
          order_index: number
          priority: Database["public"]["Enums"]["task_priority"]
          reporter_id: string
          reporter_name: string
          start_date: string | null
          status_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_id: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          reporter_id: string
          reporter_name: string
          start_date?: string | null
          status_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          reporter_id?: string
          reporter_name?: string
          start_date?: string | null
          status_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          joined_at: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_email: string
          user_id: string
          user_name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_email: string
          user_id: string
          user_name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_email?: string
          user_id?: string
          user_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "employee"
      conversation_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
      inbox_role: "admin" | "supervisor" | "agent"
      message_direction: "inbound" | "outbound"
      message_type:
        | "text"
        | "image"
        | "document"
        | "template"
        | "system"
        | "internal_note"
      task_priority: "urgent" | "high" | "normal" | "low"
      workspace_role: "owner" | "admin" | "member" | "guest"
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
      app_role: ["client", "employee"],
      conversation_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
      ],
      inbox_role: ["admin", "supervisor", "agent"],
      message_direction: ["inbound", "outbound"],
      message_type: [
        "text",
        "image",
        "document",
        "template",
        "system",
        "internal_note",
      ],
      task_priority: ["urgent", "high", "normal", "low"],
      workspace_role: ["owner", "admin", "member", "guest"],
    },
  },
} as const
