import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CrmStage {
  id: string;
  name: string;
  count: number;
  isWon: boolean;
  isLost: boolean;
}

export interface CrmRecentLead {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  stage: { name: string; isWon: boolean; isLost: boolean };
}

export interface CrmStats {
  provisioned: true;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  leadsActive: number;
  stages: CrmStage[];
  recentLeads: CrmRecentLead[];
}

export type CrmStatus = CrmStats | { provisioned: false };

export const useCrmStats = (clientId: string | null) => {
  return useQuery<CrmStatus>({
    queryKey: ["crm-stats", clientId],
    queryFn: async () => api.get(`/cidade/${clientId}/crm/stats`),
    enabled: !!clientId,
    staleTime: 30_000,
  });
};

export const useImpersonateCrm = () => {
  return useMutation({
    mutationFn: async (clientId: string) =>
      api.post(`/cidade/${clientId}/crm/impersonate`),
  });
};

export const useProvisionCrm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      adminEmail,
      adminPassword,
      adminName,
    }: {
      clientId: string;
      adminEmail: string;
      adminPassword: string;
      adminName?: string;
    }) =>
      api.post(`/cidade/${clientId}/crm/provision`, {
        adminEmail,
        adminPassword,
        adminName,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm-stats", variables.clientId] });
    },
  });
};
