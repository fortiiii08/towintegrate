import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, Clock, CheckCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConversations, Conversation, Contact } from "@/hooks/useInbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ConversationListProps {
  selectedId: string | null;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSelectConversation: (conversationId: string, contactId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Aberta", color: "bg-blue-500", icon: MessageCircle },
  in_progress: { label: "Em atendimento", color: "bg-yellow-500", icon: Clock },
  waiting_customer: { label: "Aguardando", color: "bg-orange-500", icon: Clock },
  resolved: { label: "Resolvida", color: "bg-green-500", icon: CheckCircle },
};

export const ConversationList = ({
  selectedId,
  statusFilter,
  onStatusFilterChange,
  onSelectConversation,
}: ConversationListProps) => {
  const { data: conversations, isLoading } = useConversations(statusFilter);

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return phone.slice(-2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status Tabs */}
      <div className="p-3 border-b border-border">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">Novos</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">Ativos</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">Resolvidos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation Items */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Carregando...</div>
        ) : !conversations?.length ? (
          <div className="p-4 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                contact={conv.contact}
                isSelected={selectedId === conv.id}
                onClick={() => onSelectConversation(conv.id, conv.contact_id)}
                getInitials={getInitials}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  getInitials: (name: string | null, phone: string) => string;
}

const ConversationItem = ({
  conversation,
  contact,
  isSelected,
  onClick,
  getInitials,
}: ConversationItemProps) => {
  const status = statusConfig[conversation.status];
  const StatusIcon = status?.icon || MessageCircle;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {getInitials(contact?.name, contact?.phone || "")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm truncate">
              {contact?.name || contact?.phone || "Desconhecido"}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {contact?.phone}
            </span>
            <div className="flex items-center gap-1">
              {conversation.unread_count > 0 && (
                <Badge variant="default" className="h-5 min-w-5 text-xs">
                  {conversation.unread_count}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0 h-5", status?.color && "text-white")}
                style={{ backgroundColor: status?.color.replace("bg-", "") }}
              >
                <StatusIcon className="h-3 w-3" />
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
