import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useMyBlockedCards = () => {
  return useQuery({
    queryKey: ["my-card-blocks"],
    queryFn: () => api.get<{ blockedCards: string[] }>("/users/my-card-blocks"),
  });
};

export const useUserBlockedCards = (userId: string) => {
  return useQuery({
    queryKey: ["card-blocks", userId],
    queryFn: () => api.get<{ blockedCards: string[] }>(`/users/${userId}/card-blocks`),
    enabled: !!userId,
  });
};

export const useSetUserBlockedCards = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, blockedCards }: { userId: string; blockedCards: string[] }) =>
      api.put(`/users/${userId}/card-blocks`, { blockedCards }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["card-blocks", userId] });
    },
  });
};

export const usePromoteSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/super-admins/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
};

export const useRevokeSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/users/super-admins/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
};
