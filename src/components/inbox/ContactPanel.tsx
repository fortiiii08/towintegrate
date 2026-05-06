import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Phone,
  Mail,
  Tag,
  FileText,
  CheckCircle,
  Clock,
  MessageCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useContact,
  useContactActivities,
  useUpdateContact,
  useUpdateConversationStatus,
  useAddActivity,
} from "@/hooks/useInbox";

interface ContactPanelProps {
  contactId: string | null;
  conversationId: string | null;
}

const statusOptions = [
  { value: "open", label: "Aberta" },
  { value: "in_progress", label: "Em atendimento" },
  { value: "waiting_customer", label: "Aguardando cliente" },
  { value: "resolved", label: "Resolvida" },
];

export const ContactPanel = ({ contactId, conversationId }: ContactPanelProps) => {
  const [newTag, setNewTag] = useState("");
  const { data: contact, isLoading } = useContact(contactId);
  const { data: activities } = useContactActivities(contactId);
  const updateContact = useUpdateContact();
  const updateStatus = useUpdateConversationStatus();
  const addActivity = useAddActivity();

  const handleAddTag = () => {
    if (!newTag.trim() || !contactId || !contact) return;
    const currentTags = contact.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      updateContact.mutate({
        contactId,
        updates: { tags: [...currentTags, newTag.trim()] },
      });
      addActivity.mutate({
        contactId,
        conversationId: conversationId || undefined,
        action: "tag_added",
        actorName: "Operador",
        payload: { tag: newTag.trim() } as unknown as undefined,
      });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!contactId || !contact) return;
    const currentTags = contact.tags || [];
    updateContact.mutate({
      contactId,
      updates: { tags: currentTags.filter((t) => t !== tagToRemove) },
    });
  };

  const handleNotesChange = (notes: string) => {
    if (!contactId) return;
    updateContact.mutate({ contactId, updates: { notes } });
  };

  const handleStatusChange = (status: string) => {
    if (!conversationId) return;
    updateStatus.mutate({
      conversationId,
      status: status as "open" | "in_progress" | "waiting_customer" | "resolved",
    });
    if (contactId) {
      addActivity.mutate({
        contactId,
        conversationId,
        action: "status_changed",
        actorName: "Operador",
        payload: { new_status: status } as unknown as undefined,
      });
    }
  };

  const handleMarkResolved = () => {
    handleStatusChange("resolved");
  };

  if (!contactId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Selecione uma conversa</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">
            {contact?.name || "Sem nome"}
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
            <Phone className="h-4 w-4" />
            {contact?.phone}
          </div>
          {contact?.email && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {contact.email}
            </div>
          )}
        </div>

        <Separator />

        {/* Status */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleMarkResolved}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Resolver
          </Button>
        </div>

        <Separator />

        {/* Tags */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {contact?.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nova tag"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            />
            <Button size="sm" variant="outline" onClick={handleAddTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Observações
          </label>
          <Textarea
            value={contact?.notes || ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Adicione observações sobre este contato..."
            rows={3}
            className="text-sm"
          />
        </div>

        <Separator />

        {/* Activity Timeline */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </label>
          <div className="space-y-2">
            {activities?.length ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="text-xs p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{activity.action}</span>
                  </div>
                  {activity.actor_name && (
                    <p className="text-muted-foreground mt-1">
                      por {activity.actor_name}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {format(new Date(activity.created_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma atividade registrada
              </p>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
