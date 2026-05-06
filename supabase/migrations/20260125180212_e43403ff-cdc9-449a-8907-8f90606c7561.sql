-- Create enum for user roles in workspace
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'guest');

-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('urgent', 'high', 'normal', 'low');

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members table (with roles)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_email)
);

-- Spaces table (like departments: Marketing, Dev, etc.)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#407b75',
  icon TEXT DEFAULT 'folder',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Folders table (optional grouping within spaces)
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lists table (like Sprint 12, Backlog, etc.)
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Statuses table (custom per list)
CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#407b75',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9b3515',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'normal',
  start_date DATE,
  due_date DATE,
  assignee_id UUID,
  assignee_name TEXT,
  reporter_id UUID NOT NULL,
  reporter_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Task tags junction table
CREATE TABLE public.task_tags (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Task watchers table
CREATE TABLE public.task_watchers (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- Subtasks table
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID,
  assignee_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist items table
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  actor_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  diff_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for MVP - will be restricted with auth later)
CREATE POLICY "Anyone can read workspaces" ON public.workspaces FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workspaces" ON public.workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workspaces" ON public.workspaces FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workspaces" ON public.workspaces FOR DELETE USING (true);

CREATE POLICY "Anyone can read workspace_members" ON public.workspace_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workspace_members" ON public.workspace_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workspace_members" ON public.workspace_members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workspace_members" ON public.workspace_members FOR DELETE USING (true);

CREATE POLICY "Anyone can read spaces" ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Anyone can insert spaces" ON public.spaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update spaces" ON public.spaces FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete spaces" ON public.spaces FOR DELETE USING (true);

CREATE POLICY "Anyone can read folders" ON public.folders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert folders" ON public.folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update folders" ON public.folders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete folders" ON public.folders FOR DELETE USING (true);

CREATE POLICY "Anyone can read lists" ON public.lists FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lists" ON public.lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lists" ON public.lists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete lists" ON public.lists FOR DELETE USING (true);

CREATE POLICY "Anyone can read statuses" ON public.statuses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert statuses" ON public.statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update statuses" ON public.statuses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete statuses" ON public.statuses FOR DELETE USING (true);

CREATE POLICY "Anyone can read tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tags" ON public.tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tags" ON public.tags FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tags" ON public.tags FOR DELETE USING (true);

CREATE POLICY "Anyone can read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Anyone can read task_tags" ON public.task_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task_tags" ON public.task_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete task_tags" ON public.task_tags FOR DELETE USING (true);

CREATE POLICY "Anyone can read task_watchers" ON public.task_watchers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task_watchers" ON public.task_watchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete task_watchers" ON public.task_watchers FOR DELETE USING (true);

CREATE POLICY "Anyone can read subtasks" ON public.subtasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subtasks" ON public.subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subtasks" ON public.subtasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subtasks" ON public.subtasks FOR DELETE USING (true);

CREATE POLICY "Anyone can read checklist_items" ON public.checklist_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checklist_items" ON public.checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_items" ON public.checklist_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_items" ON public.checklist_items FOR DELETE USING (true);

CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comments" ON public.comments FOR DELETE USING (true);

CREATE POLICY "Anyone can read task_notifications" ON public.task_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task_notifications" ON public.task_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update task_notifications" ON public.task_notifications FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete task_notifications" ON public.task_notifications FOR DELETE USING (true);

CREATE POLICY "Anyone can read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;