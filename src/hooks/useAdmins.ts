import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isSecondOwner: boolean;
  roles: string[];
}

export const useAdmins = () => {
  return useQuery({
    queryKey: ["admins"],
    queryFn: () => api.get<AdminUser[]>("/users/admins"),
  });
};

export const usePromoteAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/admins/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
};

export const useRevokeAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/users/admins/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
};

