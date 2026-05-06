import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Lead {
  id: string;
  client_id: string;
  platform: "google" | "meta" | "linkedin";
  niche: string | null;
  lead_count: number;
  date: string;
  campaign_name: string | null;
  created_at: string;
  updated_at: string;
}

function mapLead(l: any): Lead {
  return {
    id: l.id,
    client_id: l.clientId ?? l.client_id,
    platform: l.platform,
    niche: l.niche,
    lead_count: l.leadCount ?? l.lead_count,
    date: l.date,
    campaign_name: l.campaignName ?? l.campaign_name,
    created_at: l.createdAt ?? l.created_at,
    updated_at: l.updatedAt ?? l.updated_at,
  };
}

export function useLeads(clientId: string | null) {
  return useQuery({
    queryKey: ["leads", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const data = await api.get<any[]>(`/clients/${clientId}/leads`);
      return data.map(mapLead);
    },
    enabled: !!clientId,
  });
}

export function useAddLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      const data = await api.post<any>("/clients/leads", {
        clientId: lead.client_id,
        platform: lead.platform,
        niche: lead.niche,
        leadCount: lead.lead_count,
        date: lead.date,
        campaignName: lead.campaign_name,
      });
      return mapLead(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.client_id] });
    },
  });
}

export function useAddLeadsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads: Omit<Lead, "id" | "created_at" | "updated_at">[]) => {
      const data = await api.post<any[]>("/clients/leads/batch", 
        leads.map(l => ({
          clientId: l.client_id,
          platform: l.platform,
          niche: l.niche,
          leadCount: l.lead_count,
          date: l.date,
          campaignName: l.campaign_name,
        }))
      );
      return data.map(mapLead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
