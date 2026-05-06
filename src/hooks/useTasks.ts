import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

// Types
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  id: string;
  space_id: string;
  folder_id: string | null;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: string;
  list_id: string;
  name: string;
  color: string;
  order_index: number;
  is_done: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  list_id: string;
  status_id: string | null;
  cidade_client_id: string | null;
  cidade_client?: { id: string; name: string; imageUrl: string | null } | null;
  title: string;
  description: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  start_date: string | null;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  reporter_id: string;
  reporter_name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  user_id: string;
  name: string;
  email: string;
}

// Helper to map backend camelCase to frontend snake_case
function mapWorkspace(w: any): Workspace {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    logo_url: w.logoUrl,
    created_by: w.createdBy,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };
}

function mapSpace(s: any): Space {
  return {
    id: s.id,
    workspace_id: s.workspaceId,
    name: s.name,
    color: s.color,
    icon: s.icon,
    order_index: s.orderIndex,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function mapList(l: any): TaskList {
  return {
    id: l.id,
    space_id: l.spaceId,
    folder_id: l.folderId,
    name: l.name,
    order_index: l.orderIndex,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

function mapStatus(s: any): Status {
  return {
    id: s.id,
    list_id: s.listId,
    name: s.name,
    color: s.color,
    order_index: s.orderIndex,
    is_done: s.isDone,
    created_at: s.createdAt,
  };
}

function mapTask(t: any): Task {
  return {
    id: t.id,
    list_id: t.listId,
    status_id: t.statusId,
    cidade_client_id: t.cidadeClientId ?? null,
    cidade_client: t.cidadeClient ?? null,
    title: t.title,
    description: t.description,
    priority: t.priority,
    start_date: t.startDate,
    due_date: t.dueDate,
    assignee_id: t.assigneeId,
    assignee_name: t.assigneeName,
    reporter_id: t.reporterId,
    reporter_name: t.reporterName,
    order_index: t.orderIndex,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt,
  };
}

function mapNotification(n: any): TaskNotification {
  return {
    id: n.id,
    user_id: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    entity_type: n.entityType,
    entity_id: n.entityId,
    is_read: n.isRead,
    created_at: n.createdAt,
  };
}

function mapSubtask(s: any): Subtask {
  return {
    id: s.id,
    task_id: s.taskId,
    title: s.title,
    is_done: s.isDone,
    assignee_id: s.assigneeId,
    assignee_name: s.assigneeName,
    order_index: s.orderIndex,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function mapComment(c: any): Comment {
  return {
    id: c.id,
    task_id: c.taskId,
    user_id: c.userId,
    user_name: c.userName,
    user_email: c.userEmail,
    body: c.body,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function mapEmployee(e: any): Employee {
  return {
    user_id: e.userId,
    name: e.name,
    email: e.email,
  };
}

// ============ Employees ============
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const data = await api.get<any[]>("/users/employees");
      return data.map(mapEmployee);
    },
  });
}

// ============ Workspaces ============
export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const data = await api.get<any[]>("/workspaces");
      return data.map(mapWorkspace);
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workspace: { name: string; description?: string }) => {
      const data = await api.post<any>("/workspaces", {
        name: workspace.name,
        description: workspace.description,
      });
      return mapWorkspace(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast({ title: "Workspace criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar workspace", variant: "destructive" });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await api.delete(`/workspaces/${workspaceId}`);
      return workspaceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast({ title: "Workspace excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir workspace", variant: "destructive" });
    },
  });
}

// ============ Spaces ============
export function useSpaces(workspaceId: string | null) {
  return useQuery({
    queryKey: ["spaces", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const data = await api.get<any[]>(`/spaces?workspaceId=${workspaceId}`);
      return data.map(mapSpace);
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (space: { name: string; workspace_id: string; color?: string }) => {
      const data = await api.post<any>("/spaces", {
        name: space.name,
        workspaceId: space.workspace_id,
        color: space.color || "#407b75",
      });
      return mapSpace(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.workspace_id] });
      toast({ title: "Espaço criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar espaço", variant: "destructive" });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ spaceId, workspaceId }: { spaceId: string; workspaceId: string }) => {
      await api.delete(`/spaces/${spaceId}`);
      return { spaceId, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", data.workspaceId] });
      toast({ title: "Espaço excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir espaço", variant: "destructive" });
    },
  });
}

// ============ Lists ============
export function useLists(spaceId: string | null) {
  return useQuery({
    queryKey: ["lists", spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const data = await api.get<any[]>(`/lists?spaceId=${spaceId}`);
      return data.map(mapList);
    },
    enabled: !!spaceId,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (list: { name: string; space_id: string }) => {
      const data = await api.post<any>("/lists", {
        name: list.name,
        spaceId: list.space_id,
      });
      return mapList(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists", variables.space_id] });
      toast({ title: "Lista criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar lista", variant: "destructive" });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listId, spaceId }: { listId: string; spaceId: string }) => {
      await api.delete(`/lists/${listId}`);
      return { listId, spaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lists", data.spaceId] });
      toast({ title: "Lista excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir lista", variant: "destructive" });
    },
  });
}

// ============ Statuses ============
export function useStatuses(listId: string | null) {
  return useQuery({
    queryKey: ["statuses", listId],
    queryFn: async () => {
      if (!listId) return [];
      const data = await api.get<any[]>(`/lists/${listId}/statuses`);
      return data.map(mapStatus);
    },
    enabled: !!listId,
  });
}

// ============ Tasks ============
export function useTasks(listId: string | null) {
  return useQuery({
    queryKey: ["tasks", listId],
    queryFn: async () => {
      if (!listId) return [];
      const data = await api.get<any[]>(`/tasks?listId=${listId}`);
      return data.map(mapTask);
    },
    enabled: !!listId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      list_id: string;
      status_id?: string;
      cidade_client_id?: string | null;
      description?: string;
      priority?: "urgent" | "high" | "normal" | "low";
      due_date?: string;
      start_date?: string;
      assignee_id?: string;
      assignee_name?: string;
    }) => {
      const data = await api.post<any>("/tasks", {
        title: task.title,
        listId: task.list_id,
        statusId: task.status_id,
        cidadeClientId: task.cidade_client_id,
        description: task.description,
        priority: task.priority || "normal",
        dueDate: task.due_date,
        startDate: task.start_date,
        assigneeId: task.assignee_id,
        assigneeName: task.assignee_name,
      });
      return mapTask(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.list_id] });
      toast({ title: "Tarefa criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      // Map snake_case to camelCase for the API
      const apiUpdates: any = {};
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.status_id !== undefined) apiUpdates.statusId = updates.status_id;
      if (updates.cidade_client_id !== undefined) apiUpdates.cidadeClientId = updates.cidade_client_id;
      if (updates.priority !== undefined) apiUpdates.priority = updates.priority;
      if (updates.due_date !== undefined) apiUpdates.dueDate = updates.due_date;
      if (updates.start_date !== undefined) apiUpdates.startDate = updates.start_date;
      if (updates.assignee_id !== undefined) apiUpdates.assigneeId = updates.assignee_id;
      if (updates.assignee_name !== undefined) apiUpdates.assigneeName = updates.assignee_name;
      if (updates.order_index !== undefined) apiUpdates.orderIndex = updates.order_index;

      const data = await api.put<any>(`/tasks/${id}`, apiUpdates);
      return mapTask(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.list_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, listId }: { id: string; listId: string }) => {
      await api.delete(`/tasks/${id}`);
      return { id, listId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.listId] });
      toast({ title: "Tarefa excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
    },
  });
}

// ============ Subtasks ============
export function useSubtasks(taskId: string | null) {
  return useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const data = await api.get<any[]>(`/tasks/${taskId}/subtasks`);
      return data.map(mapSubtask);
    },
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtask: { title: string; task_id: string }) => {
      const data = await api.post<any>(`/tasks/${subtask.task_id}/subtasks`, {
        title: subtask.title,
      });
      return mapSubtask(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.task_id] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      taskId,
      ...updates
    }: Partial<Subtask> & { id: string; taskId: string }) => {
      const apiUpdates: any = {};
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.is_done !== undefined) apiUpdates.isDone = updates.is_done;
      if (updates.assignee_id !== undefined) apiUpdates.assigneeId = updates.assignee_id;
      if (updates.assignee_name !== undefined) apiUpdates.assigneeName = updates.assignee_name;
      if (updates.order_index !== undefined) apiUpdates.orderIndex = updates.order_index;

      const data = await api.put<any>(`/tasks/${taskId}/subtasks/${id}`, apiUpdates);
      return { ...mapSubtask(data), taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", data.taskId] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      await api.delete(`/tasks/${taskId}/subtasks/${id}`);
      return { id, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", data.taskId] });
    },
  });
}

// ============ Comments ============
export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const data = await api.get<any[]>(`/tasks/${taskId}/comments`);
      return data.map(mapComment);
    },
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: { body: string; task_id: string }) => {
      const data = await api.post<any>(`/tasks/${comment.task_id}/comments`, {
        body: comment.body,
      });
      return mapComment(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.task_id] });
    },
  });
}

// ============ Notifications ============
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const data = await api.get<any[]>("/notifications");
      return data.map(mapNotification);
    },
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ============ Inbox (all tasks assigned to me) ============
export interface InboxTask extends Task {
  status?: Status | null;
  assigned_at?: string | null;
  status_changed_at?: string | null;
}

function mapInboxTask(t: any): InboxTask {
  return {
    ...mapTask(t),
    status: t.status
      ? {
          id: t.status.id,
          list_id: t.status.listId,
          name: t.status.name,
          color: t.status.color,
          order_index: t.status.orderIndex,
          is_done: t.status.isDone,
          created_at: t.status.createdAt,
        }
      : null,
    assigned_at: t.assignedAt ?? t.assigned_at ?? null,
    status_changed_at: t.statusChangedAt ?? t.status_changed_at ?? null,
  };
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.put(`/tasks/${taskId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-inbox"] });
    },
  });
}

export function useInboxTasks() {
  return useQuery({
    queryKey: ["tasks-inbox"],
    queryFn: async () => {
      const data = await api.get<any[]>("/tasks/inbox");
      return data.map(mapInboxTask);
    },
    refetchInterval: 30_000,
  });
}

// ============ Workspace Tasks (all tasks in a workspace for client view) ============
export function useWorkspaceTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-tasks", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const data = await api.get<any[]>(`/tasks?workspaceId=${workspaceId}`);
      return data.map((t) => mapInboxTask(t));
    },
    enabled: !!workspaceId,
  });
}

// ============ Workspace Members ============
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  createdAt: string;
}

function mapMember(m: any): WorkspaceMember {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    userEmail: m.userEmail,
    userName: m.userName,
    role: m.role,
    createdAt: m.createdAt,
  };
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const data = await api.get<any[]>(`/workspaces/${workspaceId}/members`);
      return data.map(mapMember);
    },
    enabled: !!workspaceId,
  });
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const data = await api.post<any>(`/workspaces/${workspaceId}/members`, { userId, role: "member" });
      return mapMember(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
      toast({ title: "Membro adicionado!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar membro", variant: "destructive" });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      return { workspaceId, userId };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
      toast({ title: "Membro removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover membro", variant: "destructive" });
    },
  });
}

export function useTaskById(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const data = await api.get<any>(`/tasks/${taskId}`);
      return mapInboxTask(data);
    },
    enabled: !!taskId,
  });
}
