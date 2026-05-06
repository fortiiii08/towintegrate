import { useState } from "react";
import { Bell, CheckSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useTasks";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.is_read);

  const handleNotificationClick = (n: (typeof notifications)[0]) => {
    if (!n.is_read) markRead.mutate(n.id);

    if (n.entity_type === "task" && n.entity_id) {
      setOpen(false);
      navigate(`/tarefas?taskId=${n.entity_id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#9b3515] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-[#18182a] border-white/10 text-white shadow-2xl"
        align="end"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">Notificações</span>
          {unread.length > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="text-xs text-[#5bbfb5] hover:text-[#407b75] transition-colors"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((n) => {
              const isTask = n.entity_type === "task" && n.entity_id;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                    !n.is_read ? "bg-[#407b75]/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-[#407b75] flex-shrink-0 shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${!n.is_read ? "" : "ml-4"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        {isTask && (
                          <ExternalLink className="w-3.5 h-3.5 text-[#407b75] flex-shrink-0" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-white/30">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                        {isTask && (
                          <span className="text-[10px] text-[#5bbfb5] flex items-center gap-0.5">
                            <CheckSquare className="w-3 h-3" /> Ver tarefa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
