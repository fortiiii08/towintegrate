import { useState } from "react";
import { ClientCircle } from "@/components/ClientCircle";
import { RecordingInfoDialog } from "@/components/RecordingInfoDialog";
import { useClients, Client } from "@/hooks/useClients";
import { Video, Loader2 } from "lucide-react";

const TOTAL_SLOTS = 30;

const Index = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: clients, isLoading } = useClients();

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setDialogOpen(true);
  };

  // Get the selected client from fresh data
  const selectedClient = clients?.find(c => c.id === selectedClientId) || null;

  // Create array with 30 slots (clients + empty slots)
  const slots: (Client | undefined)[] = Array(TOTAL_SLOTS).fill(undefined);
  clients?.forEach((client, index) => {
    if (index < TOTAL_SLOTS) {
      slots[index] = client;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Selecione o Cliente
          </h1>
          <p className="text-lg text-muted-foreground">
            Tempo de Gravação
          </p>
        </div>
      </div>

      {/* Client Grid */}
      <div className="container py-10">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-4 md:gap-6 justify-items-center max-w-5xl mx-auto">
            {slots.map((client, index) => (
              <ClientCircle
                key={client?.id || `empty-${index}`}
                client={client ? {
                  id: index,
                  name: client.name,
                  image: client.image_url || undefined,
                  lastRecordingDate: client.last_recording_date ? new Date(client.last_recording_date) : undefined,
                } : undefined}
                isSelected={selectedClientId === client?.id}
                onClick={client ? () => handleClientClick(client) : undefined}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary/30 bg-card" />
            <span>Cliente cadastrado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted/30" />
            <span>Vaga disponível</span>
          </div>
        </div>
      </div>

      {/* Recording Info Dialog */}
      <RecordingInfoDialog
        client={selectedClient}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Index;
