import { useTaskById, useStatuses } from "@/hooks/useTasks";
import { TaskRightPanel } from "./TaskRightPanel";
import { Loader2 } from "lucide-react";

interface Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function TaskDetailFromId({ taskId, open, onOpenChange, onUpdate }: Props) {
  const { data: task, isLoading } = useTaskById(open ? taskId : null);
  const { data: statuses = [] } = useStatuses(task?.list_id ?? null);

  if (!open) return null;

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Loader2 className="w-8 h-8 animate-spin text-[#407b75]" />
      </div>
    );
  }

  return (
    <TaskRightPanel
      task={task}
      statuses={statuses}
      open={open}
      onOpenChange={onOpenChange}
      onUpdate={() => { onUpdate?.(); }}
    />
  );
}
