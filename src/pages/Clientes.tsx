import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { NewContactDialog } from "@/components/inbox/NewContactDialog";
import { useInboxRealtime } from "@/hooks/useInbox";
import digitownLogo from "@/assets/digitown-logo.webp";

const Clientes = () => {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewContact, setShowNewContact] = useState(false);

  // Enable realtime updates
  useInboxRealtime();

  const handleSelectConversation = (conversationId: string, contactId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedContactId(contactId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-lufga">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={digitownLogo} alt="DigiTown" className="h-8" />
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Clientes</h1>
          </div>
        </div>
        <Button
          onClick={() => setShowNewContact(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Contato
        </Button>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Conversation List */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <ConversationList
            selectedId={selectedConversationId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Column 2: Chat Window */}
        <div className="flex-1 flex flex-col bg-background">
          <ChatWindow
            conversationId={selectedConversationId}
            contactId={selectedContactId}
          />
        </div>

        {/* Column 3: Contact Panel */}
        <div className="w-80 border-l border-border bg-card">
          <ContactPanel
            contactId={selectedContactId}
            conversationId={selectedConversationId}
          />
        </div>
      </div>

      <NewContactDialog
        open={showNewContact}
        onOpenChange={setShowNewContact}
        onSuccess={(conversationId, contactId) => {
          handleSelectConversation(conversationId, contactId);
          setShowNewContact(false);
        }}
      />
    </div>
  );
};

export default Clientes;
