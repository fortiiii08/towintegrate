import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved";
  assigned_to: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "document" | "template" | "system" | "internal_note";
  body: string | null;
  media_url: string | null;
  wa_message_id: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface QuickReply {
  id: string;
  title: string;
  body: string;
  is_whatsapp_template: boolean;
  meta_template_name: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  conversation_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// NOTE: Inbox routes need to be implemented in the backend.
// These hooks are prepared for the REST API structure.
// For now they return empty arrays until the backend inbox routes are created.

export const useConversations = (statusFilter?: string) => {
  return useQuery({
    queryKey: ["conversations", statusFilter],
    queryFn: async () => {
      try {
        const params = statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : "";
        const data = await api.get<any[]>(`/inbox/conversations${params}`);
        return data as (Conversation & { contact: Contact })[];
      } catch {
        // Inbox routes may not exist yet in backend
        return [] as (Conversation & { contact: Contact })[];
      }
    },
  });
};

export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      try {
        const data = await api.get<any[]>(`/inbox/conversations/${conversationId}/messages`);
        return data as Message[];
      } catch {
        return [] as Message[];
      }
    },
    enabled: !!conversationId,
  });
};

export const useContact = (contactId: string | null) => {
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      try {
        const data = await api.get<any>(`/inbox/contacts/${contactId}`);
        return data as Contact | null;
      } catch {
        return null;
      }
    },
    enabled: !!contactId,
  });
};

export const useContactActivities = (contactId: string | null) => {
  return useQuery({
    queryKey: ["contact_activities", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      try {
        const data = await api.get<any[]>(`/inbox/contacts/${contactId}/activities`);
        return data as ContactActivity[];
      } catch {
        return [] as ContactActivity[];
      }
    },
    enabled: !!contactId,
  });
};

export const useQuickReplies = () => {
  return useQuery({
    queryKey: ["quick_replies"],
    queryFn: async () => {
      try {
        const data = await api.get<any[]>("/inbox/quick-replies");
        return data as QuickReply[];
      } catch {
        return [] as QuickReply[];
      }
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
      type = "text",
    }: {
      conversationId: string;
      body: string;
      type?: Message["type"];
    }) => {
      const data = await api.post<any>(`/inbox/conversations/${conversationId}/messages`, {
        body,
        type,
        direction: "outbound",
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateConversationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      status,
    }: {
      conversationId: string;
      status: Conversation["status"];
    }) => {
      const data = await api.put<any>(`/inbox/conversations/${conversationId}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      updates,
    }: {
      contactId: string;
      updates: Partial<Contact>;
    }) => {
      const data = await api.put<any>(`/inbox/contacts/${contactId}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, name }: { phone: string; name?: string }) => {
      const data = await api.post<any>("/inbox/contacts", { phone, name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useAddActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      conversationId,
      action,
      actorName,
      payload,
    }: {
      contactId: string;
      conversationId?: string;
      action: string;
      actorName?: string;
      payload?: any;
    }) => {
      const data = await api.post<any>(`/inbox/contacts/${contactId}/activities`, {
        conversationId,
        action,
        actorName,
        payload,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact_activities", variables.contactId] });
    },
  });
};

// Realtime is not available with REST API - use polling or WebSocket in the future
export const useInboxRealtime = () => {
  // No-op: Realtime will be implemented via WebSocket when backend supports it
};
