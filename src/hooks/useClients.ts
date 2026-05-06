import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Client {
  id: string;
  name: string;
  image_url?: string | null;
  last_recording_date?: string | null;
  niche?: string | null;
  created_at: string;
  updated_at: string;
}

function mapClient(c: any): Client {
  return {
    id: c.id,
    name: c.name,
    image_url: c.imageUrl ?? c.image_url,
    last_recording_date: c.lastRecordingDate ?? c.last_recording_date,
    niche: c.niche,
    created_at: c.createdAt ?? c.created_at,
    updated_at: c.updatedAt ?? c.updated_at,
  };
}

export const useClients = () => {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const data = await api.get<any[]>("/cidade");
      return data.map((c: any): Client => ({
        id: c.id,
        name: c.name,
        image_url: c.imageUrl ?? c.image_url ?? null,
        last_recording_date: c.lastRecordingDate ?? c.last_recording_date ?? null,
        niche: c.niche ?? null,
        created_at: c.createdAt ?? c.created_at,
        updated_at: c.updatedAt ?? c.updated_at,
      }));
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, last_recording_date }: { id: string; last_recording_date: string | null }) => {
      const data = await api.put<any>(`/clients/${id}`, {
        lastRecordingDate: last_recording_date,
      });
      return mapClient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};

// ── CidadeClients for recordings ─────────────────────────────────

export interface CidadeClientForRecording {
  id: string;
  name: string;
  email?: string | null;
  image_url?: string | null;
  last_recording_date?: string | null;
  next_recording_date?: string | null;
  recording_time?: string | null;
  niche?: string | null;
  package?: string | null;
  reels_per_session?: number | null;
  videos_per_week?: number | null;
}

function mapCidadeClientForRecording(c: any): CidadeClientForRecording {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    image_url: c.imageUrl ?? c.image_url ?? null,
    last_recording_date: c.lastRecordingDate ?? c.last_recording_date ?? null,
    next_recording_date: c.nextRecordingDate ?? c.next_recording_date ?? null,
    recording_time: c.recordingTime ?? c.recording_time ?? null,
    niche: c.niche ?? null,
    package: c.package ?? null,
    reels_per_session: c.reelsPerSession ?? c.reels_per_session ?? null,
    videos_per_week: c.videosPerWeek ?? c.videos_per_week ?? null,
  };
}

export const useCidadeClients = () => {
  return useQuery({
    queryKey: ["cidadeClients"],
    queryFn: async () => {
      const data = await api.get<any[]>("/cidade");
      return data.map(mapCidadeClientForRecording);
    },
  });
};

export const useUpdateCidadeClientRecording = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      last_recording_date,
      next_recording_date,
      recording_time,
      reels_per_session,
      videos_per_week,
    }: {
      id: string;
      last_recording_date?: string | null;
      next_recording_date?: string | null;
      recording_time?: string | null;
      reels_per_session?: number | null;
      videos_per_week?: number | null;
    }) => {
      const body: Record<string, unknown> = {};
      if (last_recording_date !== undefined) body.lastRecordingDate = last_recording_date;
      if (next_recording_date !== undefined) body.nextRecordingDate = next_recording_date;
      if (recording_time !== undefined) body.recordingTime = recording_time;
      if (reels_per_session !== undefined) body.reelsPerSession = reels_per_session;
      if (videos_per_week !== undefined) body.videosPerWeek = videos_per_week;
      const data = await api.put<any>(`/cidade/${id}/recording`, body);
      return mapCidadeClientForRecording(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidadeClients"] });
    },
  });
};

export const useSendRecordingNotification = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<{ success: boolean }>(`/cidade/${id}/recording/notify`);
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const data = await api.post<any>("/clients", { name });
      return mapClient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};
