import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Paperclip, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useMessages,
  useContact,
  useSendMessage,
  useQuickReplies,
  Message,
} from "@/hooks/useInbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatWindowProps {
  conversationId: string | null;
  contactId: string | null;
}

export const ChatWindow = ({ conversationId, contactId }: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useMessages(conversationId);
  const { data: contact } = useContact(contactId);
  const { data: quickReplies } = useQuickReplies();
  const sendMessage = useSendMessage();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;

    await sendMessage.mutateAsync({
      conversationId,
      body: message.trim(),
    });
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (body: string) => {
    setMessage(body);
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Selecione uma conversa</p>
          <p className="text-sm">Escolha um contato para iniciar o atendimento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div>
          <h2 className="font-semibold">
            {contact?.name || contact?.phone || "Carregando..."}
          </h2>
          {contact?.name && (
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Carregando mensagens...</div>
        ) : !messages?.length ? (
          <div className="text-center text-muted-foreground">
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Zap className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <p className="text-sm font-medium mb-2">Respostas Rápidas</p>
              {quickReplies?.length ? (
                <div className="space-y-1">
                  {quickReplies.map((qr) => (
                    <Button
                      key={qr.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => handleQuickReply(qr.body)}
                    >
                      <span className="truncate">{qr.title}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma resposta rápida cadastrada
                </p>
              )}
            </PopoverContent>
          </Popover>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isOutbound = message.direction === "outbound";
  const isInternalNote = message.type === "internal_note";

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isInternalNote
            ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700"
            : isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {isInternalNote && (
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">
            Nota Interna
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
};
